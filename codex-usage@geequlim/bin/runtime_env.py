from pathlib import Path
import os
import pwd
import shlex
import shutil
import subprocess


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


def _missing_required_commands(env, required_commands):
    for command in required_commands:
        if shutil.which(command, path=env.get("PATH")) is None:
            return True

    return False


def build_subprocess_env(required_commands=None):
    env = os.environ.copy()
    sources = ["process"]
    required_commands = tuple(required_commands or ())

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
    path_missing_tools = _missing_required_commands(env, required_commands)

    if path_missing_tools and file_path_override:
        env["PATH"] = file_path_override
        path_missing_tools = _missing_required_commands(env, required_commands)

    if not has_any_proxy(env) or path_missing_tools:
        shell_overrides, shell = load_env_overrides_from_shell()
        for key, value in shell_overrides.items():
            if key == "PATH":
                if path_missing_tools:
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
    gh_path = shutil.which("gh", path=env.get("PATH"))
    proxy_bits = [
        f"HTTP_PROXY={'set' if env.get('HTTP_PROXY') else 'unset'}",
        f"HTTPS_PROXY={'set' if env.get('HTTPS_PROXY') else 'unset'}",
        f"ALL_PROXY={'set' if env.get('ALL_PROXY') else 'unset'}",
        f"NO_PROXY={'set' if env.get('NO_PROXY') else 'unset'}",
    ]

    return (
        f"codex={codex_path or 'missing'}; "
        f"gh={gh_path or 'missing'}; "
        f"{', '.join(proxy_bits)}; "
        f"env_sources={','.join(sources)}"
    )
