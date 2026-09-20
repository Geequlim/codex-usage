#!/usr/bin/env python3

import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bin"))

from runtime_env import build_runtime_env, summarize_runtime_context


TIMEOUT_SECONDS = 20
API_ENDPOINT = "https://opencode.ai/zen/go/v1/usage"
API_KEY_ENV = "OPENCODE_GO_API_KEY"
USER_AGENT = "Usage-Deck/1.0"


def sanitize_message(text, max_length=120):
    sanitized = re.sub(r"\s+", " ", str(text or "")).strip()
    return (sanitized or "unknown")[:max_length]


def parse_reset_time_ms(resets_at):
    text = str(resets_at or "").strip()
    if not text:
        return None

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return int(parsed.timestamp() * 1000)
    except ValueError:
        return None


def normalize_window(window_data, now_ms):
    if not isinstance(window_data, dict):
        return None

    try:
        usage_percent = max(0, float(window_data.get("percent")))
    except (TypeError, ValueError):
        return None

    reset_time_ms = parse_reset_time_ms(window_data.get("resetsAt"))

    window = {
        "usage_percent": usage_percent,
        "percent_remaining": max(0, 100 - usage_percent),
    }
    if reset_time_ms is not None:
        window["reset_in_sec"] = max(0, (reset_time_ms - now_ms) / 1000)
        window["reset_time_ms"] = reset_time_ms

    return window


def fetch_usage_snapshot():
    child_env, env_sources = build_runtime_env(extra_env_keys=(API_KEY_ENV,))
    api_key = child_env.get(API_KEY_ENV)
    if not api_key:
        raise RuntimeError(f"{API_KEY_ENV} is not set; {summarize_runtime_context(child_env, env_sources)}")

    request = urllib.request.Request(
        API_ENDPOINT,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": USER_AGENT,
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace").strip()
        hint = ""
        if exc.code == 401:
            hint = f"; check {API_KEY_ENV} (create one at OpenCode Console -> Settings -> API Keys)"
        elif exc.code == 403:
            hint = "; an OpenCode Go subscription is required"
        raise RuntimeError(f"OpenCode Go usage request failed: HTTP {exc.code} {sanitize_message(body)}{hint}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"OpenCode Go usage request failed: {sanitize_message(exc.reason)}; {summarize_runtime_context(child_env, env_sources)}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON from OpenCode Go usage endpoint: {exc}; {summarize_runtime_context(child_env, env_sources)}") from exc

    usage_payload = payload.get("usage") if isinstance(payload, dict) else None
    if not isinstance(usage_payload, dict):
        raise RuntimeError(f"unexpected OpenCode Go usage payload: {sanitize_message(json.dumps(payload)[:200])}")

    now_ms = int(time.time() * 1000)
    snapshot = {
        "rolling": normalize_window(usage_payload.get("rolling"), now_ms),
        "weekly": normalize_window(usage_payload.get("weekly"), now_ms),
        "monthly": normalize_window(usage_payload.get("monthly"), now_ms),
        "updated_at": int(time.time()),
    }

    if snapshot["rolling"] is None and snapshot["weekly"] is None and snapshot["monthly"] is None:
        raise RuntimeError(f"no usage windows found in OpenCode Go payload: {sanitize_message(json.dumps(payload)[:200])}")

    return snapshot


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
