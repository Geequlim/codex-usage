# Usage Deck for Cinnamon

[简体中文](./README.zh-CN.md)

`Usage Deck` is a Cinnamon panel applet for viewing usage, quota, and balance information from multiple providers in one place.

It can aggregate bundled providers such as `Codex`, `GitHub Copilot`, `z.ai`, `DeepSeek`, and `OpenCode Go`, and it can also load user-defined providers from your local config directory.

![Usage Deck screenshot](./screenshot.png)

## What It Does

- Shows provider-contributed summaries in the panel
- Shows provider details in tooltips and popup cards
- Lets you enable or disable providers from the applet menu
- Refreshes provider data automatically on a schedule
- Supports bundled providers and user-defined providers

## Requirements

- Cinnamon
- `python3`
- Provider-specific credentials or CLI tools depending on what you enable

Examples:

- `Codex`: requires the `codex` CLI and login
- `GitHub Copilot`: requires the `gh` CLI and Copilot access
- `z.ai`: requires `Z_AI_API_KEY`
- `DeepSeek`: requires `DEEPSEEK_API_KEY`
- `OpenCode Go`: requires `OPENCODE_GO_WORKSPACE_ID` and `OPENCODE_GO_AUTH_COOKIE`

## Install

Option 1:

```bash
./install.sh
```

Option 2:

```bash
mkdir -p ~/.local/share/cinnamon/applets
cp -r codex-usage@geequlim ~/.local/share/cinnamon/applets/
chmod +x ~/.local/share/cinnamon/applets/codex-usage@geequlim/providers/*/fetch_usage.py
```

Then reload Cinnamon:

- X11: `Alt+F2`, then `r`
- Wayland: log out and log back in

Finally, add `Usage Deck` from the Cinnamon Applets settings UI.

## Configure

Right click the applet to:

- Refresh immediately
- Enable or disable providers

The Cinnamon settings page currently exposes host-level refresh interval only.

## Environment Variables

If your desktop session does not inherit shell variables, put them in:

- `~/.config/environment.d/*.conf`
- or `~/.config/codex-usage/env`

Common examples:

```ini
Z_AI_API_KEY=your-zai-key
DEEPSEEK_API_KEY=your-deepseek-key
OPENCODE_GO_WORKSPACE_ID=your-workspace-id
OPENCODE_GO_AUTH_COOKIE=your-cookie
HTTP_PROXY=http://127.0.0.1:1080
HTTPS_PROXY=http://127.0.0.1:1080
ALL_PROXY=socks5://127.0.0.1:1080
```

## User Providers

Built-in providers live in:

- `codex-usage@geequlim/providers/`

User-defined providers can be added here:

- `~/.config/usage-deck/providers/`

If a user provider uses the same `id` as a bundled provider, the user provider overrides the bundled one.

## Project Layout

```text
codex-usage@geequlim/
  applet.js
  icon.png
  stylesheet.css
  metadata.json
  settings-schema.json
  bin/
    runtime_env.py
  lib/
    ...
  providers/
    ...
```

## Notes

- Provider data depends on external services being available
- After code changes, Cinnamon usually needs to be reloaded
- User-defined providers run local code and should be treated as trusted
