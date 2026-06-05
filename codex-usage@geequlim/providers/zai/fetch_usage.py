#!/usr/bin/env python3

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bin"))

from runtime_env import build_runtime_env, summarize_runtime_context


TIMEOUT_SECONDS = 20
API_ENDPOINT = "https://api.z.ai/api/monitor/usage/quota/limit"
API_KEY_ENV = "Z_AI_API_KEY"
USER_AGENT = "Usage-Deck/1.0"


def normalize_limit(limit_data):
    if not isinstance(limit_data, dict):
        return None

    return {
        "type": limit_data.get("type"),
        "unit": limit_data.get("unit"),
        "number": limit_data.get("number"),
        "usage": limit_data.get("usage"),
        "current_value": limit_data.get("currentValue"),
        "percentage": limit_data.get("percentage"),
        "next_reset_time": limit_data.get("nextResetTime"),
    }


def fetch_usage_snapshot():
    child_env, env_sources = build_runtime_env(extra_env_keys=(API_KEY_ENV,))
    api_key = child_env.get(API_KEY_ENV)
    if not api_key:
        raise RuntimeError(f"{API_KEY_ENV} is not set; {summarize_runtime_context(child_env, env_sources)}")

    request = urllib.request.Request(
        API_ENDPOINT,
        headers={
            "Authorization": api_key,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"zhipu quota request failed: HTTP {exc.code} {body}; {summarize_runtime_context(child_env, env_sources)}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"zhipu quota request failed: {exc.reason}; {summarize_runtime_context(child_env, env_sources)}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON from zhipu quota endpoint: {exc}; {summarize_runtime_context(child_env, env_sources)}") from exc

    limits = []
    for item in (payload.get("data") or {}).get("limits") or []:
        normalized = normalize_limit(item)
        if normalized is not None:
            limits.append(normalized)

    return {
        "success": payload.get("success"),
        "code": payload.get("code"),
        "message": payload.get("msg"),
        "level": (payload.get("data") or {}).get("level"),
        "limits": limits,
        "updated_at": int(time.time()),
    }


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
