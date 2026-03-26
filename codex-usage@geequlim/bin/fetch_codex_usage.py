#!/usr/bin/env python3

import json
import os
from pathlib import Path
import pwd
import select
import shlex
import shutil
import subprocess
import sys
import time


TIMEOUT_SECONDS = 20
SHELL_ENV_TIMEOUT_SECONDS = 3
SHELL_ENV_START = "__CODEX_USAGE_ENV_START__"
SHELL_ENV_END = "__CODEX_USAGE_ENV_END__"
PROXY_KEYS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
    "no_proxy",
)
ENV_OVERRIDE_KEYS = PROXY_KEYS + ("PATH",)


class ProtocolError(RuntimeError):
    pass


def decode_env_value(raw_value):
    value = raw_value.strip()
    if not value:
        return ""

    try:
        parts = shlex.split(value, comments=True, posix=True)
    except ValueError:
        return value.strip("\"'")

    if len(parts) == 1:
        return parts[0]

    return value


def parse_env_assignments(lines, allowed_keys):
    values = {}

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("export "):
            line = line[7:].strip()

        if "=" not in line:
            continue

        name, raw_value = line.split("=", 1)
        name = name.strip()

        if name not in allowed_keys:
            continue

        values[name] = decode_env_value(raw_value)

    return values


def iter_env_files():
    home = Path.home()
    yield Path("/etc/environment")
    yield home / ".pam_environment"

    env_dir = home / ".config" / "environment.d"
    if env_dir.is_dir():
        for path in sorted(env_dir.glob("*.conf")):
            yield path

    yield home / ".config" / "codex-usage" / "env"


def load_env_overrides_from_files():
    values = {}
    sources = []

    for path in iter_env_files():
        if not path.is_file():
            continue

        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue

        parsed = parse_env_assignments(lines, ENV_OVERRIDE_KEYS)
        if not parsed:
            continue

        values.update(parsed)
        sources.append(str(path))

    return values, sources


def extract_marked_block(text, start_marker, end_marker):
    start_index = text.find(start_marker)
    if start_index == -1:
        return None

    start_index += len(start_marker)
    end_index = text.find(end_marker, start_index)
    if end_index == -1:
        return None

    return text[start_index:end_index]


def load_env_overrides_from_shell():
    shell = os.environ.get("SHELL")
    if not shell:
        try:
            shell = pwd.getpwuid(os.getuid()).pw_shell
        except KeyError:
            shell = None
    if not shell:
        return {}, None

    command = (
        f"printf '%s\\n' {shlex.quote(SHELL_ENV_START)}; "
        f"env; "
        f"printf '%s\\n' {shlex.quote(SHELL_ENV_END)}"
    )

    probe_env = os.environ.copy()
    probe_env.setdefault("HOME", str(Path.home()))

    try:
        completed = subprocess.run(
            [shell, "-ic", command],
            capture_output=True,
            text=True,
            timeout=SHELL_ENV_TIMEOUT_SECONDS,
            env=probe_env,
        )
    except (OSError, subprocess.SubprocessError):
        return {}, shell

    block = extract_marked_block(completed.stdout, SHELL_ENV_START, SHELL_ENV_END)
    if block is None:
        return {}, shell

    return parse_env_assignments(block.splitlines(), ENV_OVERRIDE_KEYS), shell


def normalize_proxy_env(env):
    pairs = (
        ("HTTP_PROXY", "http_proxy"),
        ("HTTPS_PROXY", "https_proxy"),
        ("ALL_PROXY", "all_proxy"),
        ("NO_PROXY", "no_proxy"),
    )

    for upper, lower in pairs:
        upper_value = env.get(upper)
        lower_value = env.get(lower)

        if upper_value and not lower_value:
            env[lower] = upper_value
        elif lower_value and not upper_value:
            env[upper] = lower_value


def has_any_proxy(env):
    return any(env.get(key) for key in PROXY_KEYS if "proxy" in key.lower() and key.lower() != "no_proxy")


def build_subprocess_env():
    env = os.environ.copy()
    sources = ["process"]

    file_overrides, file_sources = load_env_overrides_from_files()
    if file_sources:
        sources.extend(file_sources)

    file_path_override = file_overrides.get("PATH")

    for key, value in file_overrides.items():
        if key == "PATH":
            continue
        if not env.get(key):
            env[key] = value

    normalize_proxy_env(env)
    path_missing_codex = shutil.which("codex", path=env.get("PATH")) is None

    if path_missing_codex and file_path_override:
        env["PATH"] = file_path_override
        path_missing_codex = shutil.which("codex", path=env.get("PATH")) is None

    if not has_any_proxy(env) or path_missing_codex:
        shell_overrides, shell = load_env_overrides_from_shell()
        for key, value in shell_overrides.items():
            if key == "PATH":
                if path_missing_codex:
                    env[key] = value
            elif not env.get(key):
                env[key] = value

        if shell_overrides:
            shell_name = shell or "shell"
            sources.append(f"interactive:{shell_name}")

    normalize_proxy_env(env)
    return env, sources


def summarize_runtime_context(env, sources):
    codex_path = shutil.which("codex", path=env.get("PATH"))
    proxy_bits = [
        f"HTTP_PROXY={'set' if env.get('HTTP_PROXY') else 'unset'}",
        f"HTTPS_PROXY={'set' if env.get('HTTPS_PROXY') else 'unset'}",
        f"ALL_PROXY={'set' if env.get('ALL_PROXY') else 'unset'}",
        f"NO_PROXY={'set' if env.get('NO_PROXY') else 'unset'}",
    ]

    return (
        f"codex={codex_path or 'missing'}; "
        f"{', '.join(proxy_bits)}; "
        f"env_sources={','.join(sources)}"
    )


def send_message(process, payload):
    process.stdin.write(json.dumps(payload) + "\n")
    process.stdin.flush()


def read_message(process, deadline):
    stderr_lines = []

    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("Timed out waiting for Codex app-server response")

        ready, _, _ = select.select([process.stdout, process.stderr], [], [], remaining)
        if not ready:
            raise TimeoutError("Timed out waiting for Codex app-server response")

        if process.stderr in ready:
            line = process.stderr.readline()
            if line:
                stderr_lines.append(line.strip())
            elif process.poll() is not None and process.stdout not in ready:
                raise ProtocolError("Codex app-server exited: " + " ".join(stderr_lines))

        if process.stdout in ready:
            line = process.stdout.readline()
            if not line:
                if process.poll() is not None:
                    details = " ".join(stderr_lines).strip()
                    if details:
                        raise ProtocolError("Codex app-server exited: " + details)
                    raise ProtocolError("Codex app-server exited before replying")
                continue

            try:
                return json.loads(line)
            except json.JSONDecodeError as exc:
                raise ProtocolError("Invalid JSON from Codex app-server: %s" % exc) from exc


def rpc(process, request_id, method, params):
    send_message(process, {"id": request_id, "method": method, "params": params})
    deadline = time.monotonic() + TIMEOUT_SECONDS

    while True:
        message = read_message(process, deadline)
        if message.get("id") != request_id:
            continue

        if "error" in message:
            error = message["error"]
            raise ProtocolError(error.get("message", "Unknown RPC error"))

        return message.get("result")


def normalize_window(window_data):
    if not isinstance(window_data, dict):
        return None

    return {
        "used_percent": window_data.get("usedPercent"),
        "window_duration_mins": window_data.get("windowDurationMins"),
        "resets_at": window_data.get("resetsAt"),
    }


def normalize_credits(credits_data):
    if not isinstance(credits_data, dict):
        return None

    return {
        "balance": credits_data.get("balance"),
        "has_credits": credits_data.get("hasCredits"),
        "unlimited": credits_data.get("unlimited"),
    }


def normalize_account(account_data):
    if not isinstance(account_data, dict):
        return {}

    return {
        "type": account_data.get("type"),
        "email": account_data.get("email"),
        "plan_type": account_data.get("planType"),
    }


def normalize_rate_limit(rate_limits_response):
    if not isinstance(rate_limits_response, dict):
        return {}

    buckets = rate_limits_response.get("rateLimitsByLimitId") or {}
    rate_limit = buckets.get("codex") or rate_limits_response.get("rateLimits") or {}

    return {
        "limit_id": rate_limit.get("limitId"),
        "limit_name": rate_limit.get("limitName"),
        "plan_type": rate_limit.get("planType"),
        "primary": normalize_window(rate_limit.get("primary")),
        "secondary": normalize_window(rate_limit.get("secondary")),
        "credits": normalize_credits(rate_limit.get("credits")),
    }


def fetch_usage_snapshot():
    child_env, env_sources = build_subprocess_env()
    codex_path = shutil.which("codex", path=child_env.get("PATH"))
    if codex_path is None:
        raise RuntimeError("codex executable not found; " + summarize_runtime_context(child_env, env_sources))

    process = subprocess.Popen(
        [codex_path, "app-server", "--listen", "stdio://"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        env=child_env,
    )

    try:
        rpc(
            process,
            1,
            "initialize",
            {
                "clientInfo": {
                    "name": "cinnamon-codex-usage",
                    "version": "1.0.0",
                },
                "capabilities": {
                    "experimentalApi": True,
                },
            },
        )
        send_message(process, {"method": "initialized"})

        account_response = rpc(process, 2, "account/read", {})
        rate_limits_response = rpc(process, 3, "account/rateLimits/read", None)

        return {
            "account": normalize_account(account_response.get("account")),
            "requires_openai_auth": account_response.get("requiresOpenaiAuth"),
            "rate_limit": normalize_rate_limit(rate_limits_response),
            "updated_at": int(time.time()),
        }
    except Exception as exc:
        raise RuntimeError(f"{exc}; {summarize_runtime_context(child_env, env_sources)}") from exc
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()


def main():
    try:
        payload = fetch_usage_snapshot()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    sys.stdout.write(json.dumps(payload) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
