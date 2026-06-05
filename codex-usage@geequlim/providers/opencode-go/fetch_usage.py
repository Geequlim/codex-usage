#!/usr/bin/env python3

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bin"))

from runtime_env import build_runtime_env, summarize_runtime_context


TIMEOUT_SECONDS = 20
WORKSPACE_ENV = "OPENCODE_GO_WORKSPACE_ID"
COOKIE_ENV = "OPENCODE_GO_AUTH_COOKIE"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/148.0"
URL_PREFIX = "https://opencode.ai/workspace/"
URL_SUFFIX = "/go"

SCRAPED_NUMBER_PATTERN = r"(-?\d+(?:\.\d+)?)"
RE_ROLLING_PCT_FIRST = re.compile(rf"rollingUsage:\$R\[\d+\]=\{{[^}}]*usagePercent:{SCRAPED_NUMBER_PATTERN}[^}}]*resetInSec:{SCRAPED_NUMBER_PATTERN}[^}}]*\}}")
RE_ROLLING_RESET_FIRST = re.compile(rf"rollingUsage:\$R\[\d+\]=\{{[^}}]*resetInSec:{SCRAPED_NUMBER_PATTERN}[^}}]*usagePercent:{SCRAPED_NUMBER_PATTERN}[^}}]*\}}")
RE_WEEKLY_PCT_FIRST = re.compile(rf"weeklyUsage:\$R\[\d+\]=\{{[^}}]*usagePercent:{SCRAPED_NUMBER_PATTERN}[^}}]*resetInSec:{SCRAPED_NUMBER_PATTERN}[^}}]*\}}")
RE_WEEKLY_RESET_FIRST = re.compile(rf"weeklyUsage:\$R\[\d+\]=\{{[^}}]*resetInSec:{SCRAPED_NUMBER_PATTERN}[^}}]*usagePercent:{SCRAPED_NUMBER_PATTERN}[^}}]*\}}")
RE_MONTHLY_PCT_FIRST = re.compile(rf"monthlyUsage:\$R\[\d+\]=\{{[^}}]*usagePercent:{SCRAPED_NUMBER_PATTERN}[^}}]*resetInSec:{SCRAPED_NUMBER_PATTERN}[^}}]*\}}")
RE_MONTHLY_RESET_FIRST = re.compile(rf"monthlyUsage:\$R\[\d+\]=\{{[^}}]*resetInSec:{SCRAPED_NUMBER_PATTERN}[^}}]*usagePercent:{SCRAPED_NUMBER_PATTERN}[^}}]*\}}")


def parse_window_usage(html, pct_first, reset_first):
    match = pct_first.search(html)
    if match:
        usage_percent = float(match.group(1))
        reset_in_sec = float(match.group(2))
        return {"usage_percent": usage_percent, "reset_in_sec": reset_in_sec}

    match = reset_first.search(html)
    if match:
        reset_in_sec = float(match.group(1))
        usage_percent = float(match.group(2))
        return {"usage_percent": usage_percent, "reset_in_sec": reset_in_sec}

    return None


def sanitize_message(text, max_length=120):
    sanitized = re.sub(r"\s+", " ", str(text or "")).strip()
    return (sanitized or "unknown")[:max_length]


def build_cookie_header(auth_cookie):
    text = str(auth_cookie or "").strip()
    if not text:
        return ""

    # Accept either the raw auth token or a full Cookie header string.
    if "auth=" in text or ";" in text:
        return text

    return f"auth={text}"


def normalize_window(window_data, now_ms):
    if not window_data:
        return None

    usage_percent = max(0, float(window_data["usage_percent"]))
    reset_in_sec = max(0, float(window_data["reset_in_sec"]))
    reset_time_ms = int(now_ms + reset_in_sec * 1000)

    return {
        "usage_percent": usage_percent,
        "percent_remaining": max(0, 100 - usage_percent),
        "reset_in_sec": reset_in_sec,
        "reset_time_ms": reset_time_ms,
    }


def fetch_usage_snapshot():
    child_env, env_sources = build_runtime_env(extra_env_keys=(WORKSPACE_ENV, COOKIE_ENV))
    workspace_id = child_env.get(WORKSPACE_ENV)
    auth_cookie = child_env.get(COOKIE_ENV)
    if not workspace_id:
        raise RuntimeError(f"{WORKSPACE_ENV} is not set; {summarize_runtime_context(child_env, env_sources)}")
    if not auth_cookie:
        raise RuntimeError(f"{COOKIE_ENV} is not set; {summarize_runtime_context(child_env, env_sources)}")

    url = f"{URL_PREFIX}{urllib.parse.quote(workspace_id)}{URL_SUFFIX}"
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html",
            "Cookie": build_cookie_header(auth_cookie),
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            if response.status < 200 or response.status >= 300:
                body = response.read().decode("utf-8", errors="replace").strip()
                raise RuntimeError(f"OpenCode Go dashboard error {response.status}: {sanitize_message(body)}")
            html = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"OpenCode Go dashboard error {exc.code}: {sanitize_message(body)}; {summarize_runtime_context(child_env, env_sources)}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"OpenCode Go dashboard request failed: {sanitize_message(exc.reason)}; {summarize_runtime_context(child_env, env_sources)}") from exc

    rolling = parse_window_usage(html, RE_ROLLING_PCT_FIRST, RE_ROLLING_RESET_FIRST)
    weekly = parse_window_usage(html, RE_WEEKLY_PCT_FIRST, RE_WEEKLY_RESET_FIRST)
    monthly = parse_window_usage(html, RE_MONTHLY_PCT_FIRST, RE_MONTHLY_RESET_FIRST)

    if not rolling and not weekly and not monthly:
        raise RuntimeError("Could not parse any known OpenCode Go dashboard usage windows (rollingUsage, weeklyUsage, monthlyUsage)")

    now_ms = int(time.time() * 1000)
    return {
        "rolling": normalize_window(rolling, now_ms),
        "weekly": normalize_window(weekly, now_ms),
        "monthly": normalize_window(monthly, now_ms),
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
