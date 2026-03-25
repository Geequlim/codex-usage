# Codex Usage for Cinnamon

[English](./README.md)

一个 Cinnamon 面板插件，用来显示当前 `codex` 账号的额度状态。

它会在面板上展示两个窗口的剩余额度摘要，点击后弹出详情面板，查看：

- 5 小时窗口和 7 天窗口的剩余额度
- 当前账号与套餐
- 最近更新时间
- 窗口重置时间

![Codex Usage 截图](./screenshot.png)

## 特性

- 直接通过 `codex app-server` 的 JSON-RPC 接口取数，不解析 TUI 文本
- 面板摘要 + 点击展开详情面板
- 支持简体中文和英文，自动跟随系统语言
- 自带图标资源，既能用于面板，也能用于 Cinnamon 小工具管理列表
- 每 5 分钟自动刷新一次
- 打开详情面板时立即刷新一次

## 预览

- 面板摘要示例：`5时 95% · 7天 34%`
- tooltip 使用紧凑摘要格式
- 详情面板显示两个额度窗口、套餐、更新时间和状态提示

## 依赖

- Cinnamon
- `codex` CLI，且已登录
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
```

然后重新加载 Cinnamon：

- X11: `Alt+F2`，输入 `r`
- Wayland: 注销并重新登录

最后在 Cinnamon 的 Applets 设置里添加 `Codex Usage`。

## 工作原理

`codex-usage@geequlim/bin/fetch_codex_usage.py` 会：

1. 启动 `codex app-server --listen stdio://`
2. 发送 `initialize`
3. 发送 `initialized`
4. 调用 `account/read`
5. 调用 `account/rateLimits/read`
6. 把结果整理成 applet 更易消费的 JSON

前端 applet 再把这些数据渲染到面板摘要、tooltip 和弹出详情面板里。

## 项目结构

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

## 已知限制

- 数据依赖 `codex` / ChatGPT 后端接口可用
- 修改 applet 代码后，通常需要重载 Cinnamon 才能看到最新效果
- 当前没有设置页，刷新频率和文案样式写死在代码里

## 打包说明

`codex-usage@geequlim/` 目录本身就是完整的 applet 分发目录。

这意味着：

- 你可以直接复制这个目录到 `~/.local/share/cinnamon/applets/`
- Cinnamon 小工具管理列表可以直接使用目录中的 `icon.png`
- 面板 applet 也可以直接使用目录中的 SVG 图标资源，不依赖仓库根目录文件

如果后续准备上架到 Cinnamon Spices，这种目录结构也更合适。

## 许可

如果你准备开源，建议在仓库里补一个 `LICENSE` 文件。
