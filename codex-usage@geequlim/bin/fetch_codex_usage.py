#!/usr/bin/env python3

import json
import select
import subprocess
import sys
import time


TIMEOUT_SECONDS = 20


class ProtocolError(RuntimeError):
    pass


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
    process = subprocess.Popen(
        ["codex", "app-server", "--listen", "stdio://"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
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
