#!/usr/bin/env python3

import json
import sys
import time
import urllib.error
import urllib.request
from decimal import Decimal, InvalidOperation
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bin"))

from runtime_env import build_runtime_env, summarize_runtime_context


TIMEOUT_SECONDS = 20
API_ENDPOINT = "https://api.deepseek.com/user/balance"
API_KEY_ENV = "DEEPSEEK_API_KEY"
USER_AGENT = "Usage-Deck/1.0"


def parse_amount(value):
    try:
        return str(Decimal(str(value)))
    except (InvalidOperation, TypeError, ValueError):
        return "0"


def normalize_balance(balance_data):
    if not isinstance(balance_data, dict):
        return None

    return {
        "currency": balance_data.get("currency"),
        "total_balance": parse_amount(balance_data.get("total_balance")),
        "granted_balance": parse_amount(balance_data.get("granted_balance")),
        "topped_up_balance": parse_amount(balance_data.get("topped_up_balance")),
    }


def fetch_balance_snapshot():
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
        raise RuntimeError(f"deepseek balance request failed: HTTP {exc.code} {body}; {summarize_runtime_context(child_env, env_sources)}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"deepseek balance request failed: {exc.reason}; {summarize_runtime_context(child_env, env_sources)}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON from deepseek balance endpoint: {exc}; {summarize_runtime_context(child_env, env_sources)}") from exc

    balances = []
    for item in payload.get("balance_infos") or []:
        normalized = normalize_balance(item)
        if normalized is not None:
            balances.append(normalized)

    return {
        "is_available": bool(payload.get("is_available")),
        "balance_infos": balances,
        "updated_at": int(time.time()),
    }


def main():
    try:
        payload = fetch_balance_snapshot()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    sys.stdout.write(json.dumps(payload) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
