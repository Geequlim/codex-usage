#!/usr/bin/env python3

import json
import shutil
import subprocess
import sys
import time

from runtime_env import build_subprocess_env, summarize_runtime_context


TIMEOUT_SECONDS = 20
API_HEADERS = (
    "Accept: application/json",
    "Editor-Version: vscode/1.96.2",
    "X-Github-Api-Version: 2025-04-01",
)


def normalize_snapshot(snapshot_data):
    if not isinstance(snapshot_data, dict):
        return None

    return {
        "quota_id": snapshot_data.get("quota_id"),
        "entitlement": snapshot_data.get("entitlement"),
        "remaining": snapshot_data.get("remaining"),
        "quota_remaining": snapshot_data.get("quota_remaining"),
        "percent_remaining": snapshot_data.get("percent_remaining"),
        "unlimited": snapshot_data.get("unlimited"),
        "overage_permitted": snapshot_data.get("overage_permitted"),
        "timestamp_utc": snapshot_data.get("timestamp_utc"),
    }


def normalize_user(payload):
    return {
        "login": payload.get("login"),
        "copilot_plan": payload.get("copilot_plan"),
        "access_type_sku": payload.get("access_type_sku"),
    }


def fetch_copilot_snapshot():
    child_env, env_sources = build_subprocess_env(required_commands=("gh",))
    gh_path = shutil.which("gh", path=child_env.get("PATH"))
    if gh_path is None:
        raise RuntimeError("gh executable not found; " + summarize_runtime_context(child_env, env_sources))

    command = [gh_path, "api"]
    for header in API_HEADERS:
        command.extend(["-H", header])
    command.append("/copilot_internal/user")

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            env=child_env,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise RuntimeError(f"failed to run gh api: {exc}; {summarize_runtime_context(child_env, env_sources)}") from exc

    if completed.returncode != 0:
        message = (completed.stderr or completed.stdout or "gh api failed").strip()
        raise RuntimeError(message + "; " + summarize_runtime_context(child_env, env_sources))

    try:
        raw_payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON from gh api: {exc}; {summarize_runtime_context(child_env, env_sources)}") from exc

    snapshots = {}
    for quota_id, snapshot_data in (raw_payload.get("quota_snapshots") or {}).items():
        normalized = normalize_snapshot(snapshot_data)
        if normalized is not None:
            snapshots[quota_id] = normalized

    return {
        "user": normalize_user(raw_payload),
        "quota_reset_date": raw_payload.get("quota_reset_date"),
        "quota_reset_date_utc": raw_payload.get("quota_reset_date_utc"),
        "snapshots": snapshots,
        "updated_at": int(time.time()),
    }


def main():
    try:
        payload = fetch_copilot_snapshot()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    sys.stdout.write(json.dumps(payload) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
