# Codex Usage for Cinnamon

[简体中文](./README.zh-CN.md)

A Cinnamon panel applet for monitoring the current usage state of your `codex` account.

It shows a compact remaining-quota summary in the panel, and opens a detailed popup when clicked.

The popup includes:

- Remaining quota for the 5-hour and 7-day windows
- Current account and plan
- Last updated time
- Reset time for each usage window

![Codex Usage screenshot](./screenshot.png)

## Features

- Reads data directly from `codex app-server` over JSON-RPC
- Compact panel summary plus a detailed popup panel
- Simplified Chinese and English, auto-detected from system locale
- Uses bundled icon assets for both the panel and the Cinnamon applet manager
- Auto refresh every 5 minutes
- Immediate refresh whenever the detail panel is opened

## Preview

- Panel summary example: `5h 95% · 7d 34%`
- Tooltip uses a compact multi-line summary
- Popup panel shows both quota windows, plan, update time, and status text

## Requirements

- Cinnamon
- `codex` CLI installed and signed in
- `python3`

## Install

The applet directory is self-contained, so both of these work.

Option 1, use the helper script:

```bash
./install.sh
```

Option 2, copy the applet directory directly:

```bash
mkdir -p ~/.local/share/cinnamon/applets
cp -r codex-usage@geequlim ~/.local/share/cinnamon/applets/
chmod +x ~/.local/share/cinnamon/applets/codex-usage@geequlim/bin/fetch_codex_usage.py
```

Then reload Cinnamon:

- X11: press `Alt+F2`, then type `r`
- Wayland: log out and log back in

Finally, add `Codex Usage` from the Cinnamon Applets settings UI.

## How It Works

`codex-usage@geequlim/bin/fetch_codex_usage.py` does the following:

1. Starts `codex app-server --listen stdio://`
2. Sends `initialize`
3. Sends `initialized`
4. Calls `account/read`
5. Calls `account/rateLimits/read`
6. Normalizes the response into a simpler JSON payload for the applet

The Cinnamon applet then renders that data into the panel label, tooltip, and popup detail view.

When the helper starts `codex`, it resolves environment variables in this order:

1. The current Cinnamon / applet process environment
2. `/etc/environment`
3. `~/.pam_environment`
4. `~/.config/environment.d/*.conf`
5. `~/.config/codex-usage/env`
6. If proxy variables are still missing, or `codex` is not on `PATH`, it probes the user's interactive shell as a fallback

This matters because many desktop sessions do not inherit proxy variables that only exist in `~/.zshrc` or `~/.bashrc`.

## Project Structure

```text
codex-usage@geequlim/
  applet.js
  codex-color.png
  codex-symbolic.svg
  codex.svg
  icon.png
  metadata.json
  stylesheet.css
  bin/
    fetch_codex_usage.py

install.sh
screenshot.png
```

## Known Limitations

- Data depends on `codex` / ChatGPT backend availability
- Cinnamon usually needs to be reloaded after applet code changes
- There is no settings UI yet; refresh interval and most presentation details are hard-coded

## Proxy Troubleshooting

If the tooltip shows `Timed out waiting for Codex app-server response`, look at the diagnostic suffix in the error:

- `codex=...` shows the executable path the helper actually found
- `HTTP_PROXY/HTTPS_PROXY/ALL_PROXY` show `set` or `unset`
- `env_sources=...` shows whether values came from the current Cinnamon environment, env files, or the interactive shell fallback

If your desktop session is not exporting proxy variables, the most reliable fix is to define them in `~/.config/environment.d/proxy.conf` or `~/.config/codex-usage/env`, for example:

```ini
HTTP_PROXY=http://127.0.0.1:1080
HTTPS_PROXY=http://127.0.0.1:1080
ALL_PROXY=socks5://127.0.0.1:1080
```

## Packaging

`codex-usage@geequlim/` is intentionally self-contained.

That means:

- You can copy just that directory into `~/.local/share/cinnamon/applets/`
- The Cinnamon applet manager can use the bundled `icon.png`
- The panel applet can use the bundled SVG assets without relying on repository-level files

This layout is also friendlier if you later prepare the applet for Cinnamon Spices submission.

## License

If you are publishing this project, add a `LICENSE` file to the repository.
