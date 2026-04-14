# Codex Usage for Cinnamon

[English](./README.md)

一个 Cinnamon 面板插件，用来显示当前 `codex` 账号的额度状态，并可选查询 GitHub Copilot 配额。

它会在面板上展示两个窗口的剩余额度摘要，点击后弹出详情面板，查看：

- 5 小时窗口和 7 天窗口的剩余额度
- 可选的 GitHub Copilot premium interactions、聊天和补全额度
- 当前账号与套餐
- 最近更新时间
- 窗口重置时间

![Codex Usage 截图](./screenshot.png)

## 特性

- 直接通过 `codex app-server` 的 JSON-RPC 接口取数，不解析 TUI 文本
- 可选通过 `gh api /copilot_internal/user` 查询 GitHub Copilot 额度
- 面板摘要 + 点击展开详情面板
- 支持简体中文和英文，自动跟随系统语言
- 自带图标资源，既能用于面板，也能用于 Cinnamon 小工具管理列表
- 支持配置查询频率
- 支持右键直接打开配置页
- 打开详情面板时立即刷新一次

## 预览

- 面板摘要示例：`5时 95% · 7天 34%`
- tooltip 使用紧凑摘要格式
- 详情面板显示两个额度窗口、套餐、更新时间和状态提示

## 依赖

- Cinnamon
- `codex` CLI，且已登录
- 可选：`gh` CLI，且已登录具备 Copilot user 权限的 GitHub 账号
- `python3`

## 安装

`codex-usage@geequlim/` 目录现在是自包含的，所以这两种方式都可以。

方式 1，使用辅助安装脚本：

```bash
./install.sh
```

方式 2，直接复制 applet 目录：

```bash
mkdir -p ~/.local/share/cinnamon/applets
cp -r codex-usage@geequlim ~/.local/share/cinnamon/applets/
chmod +x ~/.local/share/cinnamon/applets/codex-usage@geequlim/bin/fetch_codex_usage.py
chmod +x ~/.local/share/cinnamon/applets/codex-usage@geequlim/bin/fetch_copilot_usage.py
```

然后重新加载 Cinnamon：

- X11: `Alt+F2`，输入 `r`
- Wayland: 注销并重新登录

最后在 Cinnamon 的 Applets 设置里添加 `Codex Usage`。

## 配置

右键点击 applet，选择 `配置...` 即可打开设置页。

当前支持：

- 设置自动查询频率（分钟）
- 控制是否同时显示 5 小时额度；默认只显示 7 天窗口
- 控制是否启用 GitHub Copilot 额度查询

启用 Copilot 查询后，helper 会调用：

```bash
gh api \
  -H "Accept: application/json" \
  -H "Editor-Version: vscode/1.96.2" \
  -H "X-Github-Api-Version: 2025-04-01" \
  /copilot_internal/user
```

要求当前环境里的 `gh` 已完成登录，并且该账号具备 Copilot user 权限。

## 工作原理

`codex-usage@geequlim/bin/fetch_codex_usage.py` 会：

1. 启动 `codex app-server --listen stdio://`
2. 发送 `initialize`
3. 发送 `initialized`
4. 调用 `account/read`
5. 调用 `account/rateLimits/read`
6. 把结果整理成 applet 更易消费的 JSON

`codex-usage@geequlim/bin/fetch_copilot_usage.py` 是独立实现的，它会：

1. 调用 `gh api /copilot_internal/user`
2. 把 Copilot quota snapshots 整理成 applet 更易消费的 JSON

前端 applet 再把这些数据渲染到面板摘要、tooltip 和弹出详情面板里。

helper 启动 `codex` 时会按这个顺序补环境变量：

1. Cinnamon / applet 进程当前已有的环境变量
2. `/etc/environment`
3. `~/.pam_environment`
4. `~/.config/environment.d/*.conf`
5. `~/.config/codex-usage/env`
6. 如果仍然缺代理变量或找不到 `codex`，再尝试从用户交互 shell 读取环境

这意味着如果你的代理只写在 `~/.zshrc` 里，而 Cinnamon 会话本身没有这些变量，旧版本 applet 可能会超时；现在的 helper 会尽量补齐。

## 项目结构

```text
codex-usage@geequlim/
  applet.js
  codex-color.png
  codex-symbolic.svg
  codex.svg
  icon.png
  metadata.json
  settings-schema.json
  stylesheet.css
  bin/
    runtime_env.py
    fetch_codex_usage.py
    fetch_copilot_usage.py

install.sh
screenshot.png
```

## 已知限制

- 数据依赖 `codex` / ChatGPT 后端接口可用
- 修改 applet 代码后，通常需要重载 Cinnamon 才能看到最新效果
- GitHub Copilot 查询依赖 `gh` CLI 登录状态和 GitHub 侧权限

## 代理排查

如果 tooltip 里出现 `Timed out waiting for Codex app-server response`，先看错误末尾的诊断片段：

- `codex=...` 表示 helper 实际找到的 `codex` 路径
- `HTTP_PROXY/HTTPS_PROXY/ALL_PROXY` 会显示 `set` 或 `unset`
- `env_sources=...` 表示这些变量来自当前 Cinnamon 环境、环境文件，还是交互 shell

如果你的桌面会话没有继承代理，最稳妥的做法是把代理写到 `~/.config/environment.d/proxy.conf` 或 `~/.config/codex-usage/env`，例如：

```ini
HTTP_PROXY=http://127.0.0.1:1080
HTTPS_PROXY=http://127.0.0.1:1080
ALL_PROXY=socks5://127.0.0.1:1080
```

## 打包说明

`codex-usage@geequlim/` 目录本身就是完整的 applet 分发目录。

这意味着：

- 你可以直接复制这个目录到 `~/.local/share/cinnamon/applets/`
- Cinnamon 小工具管理列表可以直接使用目录中的 `icon.png`
- 面板 applet 也可以直接使用目录中的 SVG 图标资源，不依赖仓库根目录文件

如果后续准备上架到 Cinnamon Spices，这种目录结构也更合适。

## 许可

如果你准备开源，建议在仓库里补一个 `LICENSE` 文件。
