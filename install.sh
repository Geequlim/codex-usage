#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_UUID="codex-usage@geequlim"
TARGET_UUID="codex-usage@geequlim"
LEGACY_UUID="codex-usage-lite@geequlim"
TARGET_DIR="$HOME/.local/share/cinnamon/applets/$TARGET_UUID"

mkdir -p "$HOME/.local/share/cinnamon/applets"
rm -rf "$TARGET_DIR"
rm -rf "$HOME/.local/share/cinnamon/applets/$LEGACY_UUID"
cp -r "$SCRIPT_DIR/$SOURCE_UUID" "$TARGET_DIR"
chmod +x "$TARGET_DIR/providers/codex/fetch_usage.py"
chmod +x "$TARGET_DIR/providers/copilot/fetch_usage.py"

printf 'Installed to %s\n' "$TARGET_DIR"
printf 'Reload Cinnamon before adding the applet again (X11: Alt+F2 then r, Wayland: log out and back in).\n'
