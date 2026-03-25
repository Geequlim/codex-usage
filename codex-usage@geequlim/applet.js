const Applet = imports.ui.applet;
const Cairo = imports.cairo;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Pango = imports.gi.Pango;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Util = imports.misc.util;

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const PRIMARY_ACCENT = { red: 16, green: 185, blue: 129 };
const SECONDARY_ACCENT = { red: 59, green: 130, blue: 246 };
const TRANSLATIONS = {
    en: {
        heroTitle: "Codex Usage",
        loading: "Loading",
        connecting: "Connecting to Codex",
        autoRefreshEvery5Min: "Auto refresh every 5 minutes",
        plan: "Plan",
        credits: "Credits",
        updated: "Updated",
        waitingFirstSync: "Waiting for first sync",
        openPanelHint: "Open the panel to inspect both quota windows.",
        refreshNow: "Refresh now",
        refreshingAction: "Refreshing...",
        syncing: "Syncing",
        refreshingStatus: "Refreshing live quota from codex app-server...",
        loadingTooltip: "Loading Codex quota",
        refreshingTooltip: "Refreshing Codex quota...",
        signedIn: "Signed in",
        unknown: "unknown",
        authLinked: "OpenAI auth linked",
        live: "Live",
        clickRefreshHint: "Opening this panel triggers an immediate sync.",
        panelLabelHint: "Panel label shows remaining quota for the short and long windows.",
        usageDataUnavailable: "Usage data unavailable",
        waitingForUsageData: "Waiting for usage data",
        resetsDash: "Resets -",
        usedLeftDetail: "Used {used} | Left {left}",
        resetsAt: "Reset {time}",
        accountTitle: "Account",
        planTitle: "Plan",
        limitTitle: "Limit",
        updatedTitle: "Updated",
        clickOpenPanel: "Click to open the quota panel",
        tooltipHeader: "{title} · {account}",
        tooltipMeta: "{planLabel} {plan} · {limitLabel} {limit} · {updatedLabel} {updated}",
        tooltipCredits: "{credits}",
        windowUnavailable: "{name}: unavailable",
        windowLine: "{name} | {left} left | {used} used | reset {time}",
        creditsUnavailable: "Credits: unavailable",
        creditsUnlimited: "Credits: unlimited",
        creditsNone: "Credits: none",
        creditsValue: "Credits: {value}",
        justNow: "just now",
        minuteAgo: "1m ago",
        minutesAgo: "{value}m ago",
        hourAgo: "1h ago",
        hoursAgo: "{value}h ago",
        dayAgo: "1d ago",
        daysAgo: "{value}d ago",
        weekAgo: "1w ago",
        weeksAgo: "{value}w ago",
        soon: "soon",
        inMinute: "in 1m",
        inMinutes: "in {value}m",
        inHour: "in 1h",
        inHours: "in {value}h",
        inDay: "in 1d",
        inDays: "in {value}d",
        inWeek: "in 1w",
        inWeeks: "in {value}w",
        errLabel: "ERR",
        unableToLoad: "Unable to load Codex data",
        checkLogin: "Check codex login and helper output",
        error: "Error",
        refreshFailed: "Refresh failed: {error}",
        lastSnapshotHint: "The last successful snapshot stays visible until the next good refresh.",
        errorTooltip: "Codex usage\nStatus: refresh failed\nError: {error}\nClick to open the quota panel",
        preparingSnapshot: "Preparing quota snapshot",
        waitingFirstSuccessful: "Waiting for the first successful sync...",
        openRefreshHint: "When you click the applet, this panel will refresh immediately.",
        primaryWindow: "primary",
        secondaryWindow: "secondary",
        window: "window",
        hourWindow: "{value}h window",
        dayWindow: "{value}d window",
        minuteWindow: "{value}m window",
        known5hWindow: "5h window",
        known7dWindow: "7d window",
        short5h: "5h",
        short7d: "7d",
        shortHour: "{value}h",
        shortDay: "{value}d",
        shortMinute: "{value}m",
        panelLabel: "{leftName} {leftValue}  ·  {rightName} {rightValue}",
        limitContext: "Limit {limit} | Auto refresh 5m{auth}",
        authSuffix: " | OpenAI auth linked"
    },
    zh: {
        heroTitle: "Codex 用量",
        loading: "加载中",
        connecting: "正在连接 Codex",
        autoRefreshEvery5Min: "每 5 分钟自动刷新一次",
        plan: "套餐",
        credits: "点数",
        updated: "更新",
        waitingFirstSync: "等待首次同步",
        openPanelHint: "打开面板可查看两个额度窗口的详细情况。",
        refreshNow: "立即刷新",
        refreshingAction: "刷新中...",
        syncing: "同步中",
        refreshingStatus: "正在通过 codex app-server 刷新实时额度...",
        loadingTooltip: "正在加载 Codex 额度",
        refreshingTooltip: "正在刷新 Codex 额度...",
        signedIn: "已登录",
        unknown: "未知",
        authLinked: "已关联 OpenAI 认证",
        live: "实时",
        clickRefreshHint: "打开这个面板时会立即同步一次。",
        panelLabelHint: "面板标签会显示短窗口和长窗口的剩余额度。",
        usageDataUnavailable: "暂无额度数据",
        waitingForUsageData: "等待额度数据",
        resetsDash: "重置时间 -",
        usedLeftDetail: "已用 {used} | 剩余 {left}",
        resetsAt: "重置 {time}",
        accountTitle: "账号",
        planTitle: "套餐",
        limitTitle: "额度桶",
        updatedTitle: "更新",
        clickOpenPanel: "点击打开额度面板",
        tooltipHeader: "{title} · {account}",
        tooltipMeta: "{planLabel} {plan} · {limitLabel} {limit} · {updatedLabel} {updated}",
        tooltipCredits: "{credits}",
        windowUnavailable: "{name}：不可用",
        windowLine: "{name} | 剩余 {left} | 已用 {used} | 重置 {time}",
        creditsUnavailable: "点数：不可用",
        creditsUnlimited: "点数：无限",
        creditsNone: "点数：无",
        creditsValue: "点数：{value}",
        justNow: "刚刚",
        minuteAgo: "1分前",
        minutesAgo: "{value}分前",
        hourAgo: "1小时前",
        hoursAgo: "{value}小时前",
        dayAgo: "1天前",
        daysAgo: "{value}天前",
        weekAgo: "1周前",
        weeksAgo: "{value}周前",
        soon: "即将",
        inMinute: "1分后",
        inMinutes: "{value}分后",
        inHour: "1小时后",
        inHours: "{value}小时后",
        inDay: "1天后",
        inDays: "{value}天后",
        inWeek: "1周后",
        inWeeks: "{value}周后",
        errLabel: "错误",
        unableToLoad: "无法加载 Codex 数据",
        checkLogin: "请检查 codex 登录状态和 helper 输出",
        error: "错误",
        refreshFailed: "刷新失败：{error}",
        lastSnapshotHint: "会保留上一次成功的快照，直到下一次刷新成功。",
        errorTooltip: "Codex 用量\n状态：刷新失败\n错误：{error}\n点击打开额度面板",
        preparingSnapshot: "正在准备额度快照",
        waitingFirstSuccessful: "等待第一次成功同步...",
        openRefreshHint: "点击 applet 打开面板时会立即刷新。",
        primaryWindow: "主窗口",
        secondaryWindow: "次窗口",
        window: "窗口",
        hourWindow: "{value} 小时窗口",
        dayWindow: "{value} 天窗口",
        minuteWindow: "{value} 分钟窗口",
        known5hWindow: "5 小时窗口",
        known7dWindow: "7 天窗口",
        short5h: "5时",
        short7d: "7天",
        shortHour: "{value}时",
        shortDay: "{value}天",
        shortMinute: "{value}分",
        panelLabel: "{leftName} {leftValue}  ·  {rightName} {rightValue}",
        limitContext: "额度桶 {limit} | 自动刷新 5 分钟{auth}",
        authSuffix: " | 已关联 OpenAI 认证"
    }
};

function detectLanguage() {
    let names = GLib.get_language_names();

    for (let i = 0; i < names.length; i++) {
        if (String(names[i]).toLowerCase().startsWith("zh")) {
            return "zh";
        }
    }

    return "en";
}

function translate(language, key, replacements) {
    let dictionary = TRANSLATIONS[language] || TRANSLATIONS.en;
    let template = dictionary[key] || TRANSLATIONS.en[key] || key;

    if (!replacements) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, function(match, name) {
        return Object.prototype.hasOwnProperty.call(replacements, name) ? String(replacements[name]) : match;
    });
}

function drawRoundedRect(cr, x, y, width, height, radius) {
    let safeRadius = Math.max(0, Math.min(radius, Math.floor(Math.min(width, height) / 2)));

    cr.newSubPath();
    cr.arc(x + width - safeRadius, y + safeRadius, safeRadius, -Math.PI / 2, 0);
    cr.arc(x + width - safeRadius, y + height - safeRadius, safeRadius, 0, Math.PI / 2);
    cr.arc(x + safeRadius, y + height - safeRadius, safeRadius, Math.PI / 2, Math.PI);
    cr.arc(x + safeRadius, y + safeRadius, safeRadius, Math.PI, 1.5 * Math.PI);
    cr.closePath();
}

function setSourceColor(cr, color, alpha) {
    cr.setSourceRGBA(color.red / 255, color.green / 255, color.blue / 255, alpha);
}

function UsageMeter(title, accentColor) {
    this._init(title, accentColor);
}

UsageMeter.prototype = {
    _init: function(title, accentColor) {
        this._accentColor = accentColor;
        this._fraction = 0;
        this._hasData = false;

        this.actor = new St.BoxLayout({
            vertical: true,
            style_class: "codex-window-card",
            x_expand: true
        });

        let header = new St.BoxLayout({
            style_class: "codex-card-header",
            x_expand: true
        });

        this._titleLabel = new St.Label({
            text: title,
            style_class: "codex-card-title",
            x_expand: true
        });
        this._percentLabel = new St.Label({
            text: "--",
            style_class: "codex-card-percent"
        });

        header.add_actor(this._titleLabel);
        header.add_actor(this._percentLabel);
        this.actor.add_actor(header);

        this._bar = new St.DrawingArea({
            style_class: "codex-progress-bar",
            x_expand: true,
            height: 14
        });
        this._bar.connect("repaint", this._onRepaint.bind(this));
        this.actor.add_actor(this._bar);

        this._detailLabel = new St.Label({
            text: "",
            style_class: "codex-card-detail"
        });
        this._detailLabel.clutter_text.line_wrap = true;
        this._detailLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        this.actor.add_actor(this._detailLabel);

        this._resetLabel = new St.Label({
            text: "",
            style_class: "codex-card-reset"
        });
        this.actor.add_actor(this._resetLabel);
    },

    setState: function(state) {
        this._titleLabel.set_text(state.title);

        if (state.remaining === null) {
            this._hasData = false;
            this._fraction = 0;
            this._percentLabel.set_text("--");
            this._detailLabel.set_text(state.detailText);
            this._resetLabel.set_text(state.resetText);
        } else {
            this._hasData = true;
            this._fraction = Math.max(0, Math.min(1, state.remaining / 100));
            this._percentLabel.set_text(String(state.remaining) + "%");
            this._detailLabel.set_text(state.detailText);
            this._resetLabel.set_text(state.resetText);
        }

        this._bar.queue_repaint();
    },

    _onRepaint: function(area) {
        let cr = area.get_context();
        let [width, height] = area.get_surface_size();
        let radius = Math.floor(height / 2);

        drawRoundedRect(cr, 0, 0, width, height, radius);
        setSourceColor(cr, { red: 255, green: 255, blue: 255 }, this._hasData ? 0.09 : 0.05);
        cr.fill();

        if (this._fraction > 0) {
            let fillWidth = Math.max(radius * 2, Math.round(width * this._fraction));
            drawRoundedRect(cr, 0, 0, fillWidth, height, radius);
            setSourceColor(cr, this._accentColor, this._hasData ? 0.95 : 0.4);
            cr.fill();
        }

        cr.$dispose();
    }
};

class CodexUsageApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this.metadata = metadata;
        this.instanceId = instanceId;
        this._helperPath = GLib.build_filenamev([this.metadata.path, "bin", "fetch_codex_usage.py"]);
        this._iconPath = GLib.build_filenamev([this.metadata.path, "codex-symbolic.svg"]);
        this._legacyIconPath = GLib.build_filenamev([this.metadata.path, "codex.svg"]);
        this._language = detectLanguage();
        this._refreshLoopId = 0;
        this._refreshing = false;
        this._lastPayload = null;

        this.setAllowedLayout(Applet.AllowedLayout.BOTH);
        this.actor.add_style_class_name("codex-usage-applet");
        this._setPanelIcon();
        this.set_applet_label(this._buildPanelLabel(null, null, null, null));
        this.set_applet_tooltip(this._t("loadingTooltip"));

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);
        this.menu.connect("open-state-changed", this._onMenuStateChanged.bind(this));

        this._buildMenu();
        this._setMenuLoadingState();

        this._refreshNow();
        this._refreshLoopId = Mainloop.timeout_add(REFRESH_INTERVAL_MS, this._onRefreshTimer.bind(this));
    }

    _setPanelIcon() {
        if (GLib.file_test(this._iconPath, GLib.FileTest.EXISTS)) {
            this.set_applet_icon_symbolic_path(this._iconPath);
        } else if (GLib.file_test(this._legacyIconPath, GLib.FileTest.EXISTS)) {
            this.set_applet_icon_symbolic_path(this._legacyIconPath);
        } else {
            this.set_applet_icon_symbolic_name("utilities-terminal-symbolic");
        }
    }

    _buildMenu() {
        this.menu.actor.add_style_class_name("codex-usage-menu");

        let shellItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            hover: false,
            activate: false,
            style_class: "codex-menu-shell"
        });

        this._menuRoot = new St.BoxLayout({
            vertical: true,
            style_class: "codex-menu-root",
            x_expand: true
        });
        shellItem.addActor(this._menuRoot, { span: -1, expand: true });
        this.menu.addMenuItem(shellItem);

        let heroCard = new St.BoxLayout({
            vertical: true,
            style_class: "codex-hero-card",
            x_expand: true
        });

        let heroHeader = new St.BoxLayout({
            style_class: "codex-hero-header",
            x_expand: true
        });
        let heroTitle = new St.Label({
            text: this._t("heroTitle"),
            style_class: "codex-hero-title",
            x_expand: true
        });
        this._statusBadge = new St.Label({
            text: this._t("loading"),
            style_class: "codex-status-badge codex-status-loading"
        });
        heroHeader.add_actor(heroTitle);
        heroHeader.add_actor(this._statusBadge);
        heroCard.add_actor(heroHeader);

        this._accountLabel = new St.Label({
            text: this._t("connecting"),
            style_class: "codex-account-label"
        });
        this._accountLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        heroCard.add_actor(this._accountLabel);

        this._contextLabel = new St.Label({
            text: this._t("autoRefreshEvery5Min"),
            style_class: "codex-context-label"
        });
        this._contextLabel.clutter_text.line_wrap = true;
        this._contextLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        heroCard.add_actor(this._contextLabel);

        let statRow = new St.BoxLayout({
            style_class: "codex-stat-row",
            x_expand: true
        });
        let planStat = this._createStatBox(this._t("plan"));
        let creditsStat = this._createStatBox(this._t("credits"));
        let updatedStat = this._createStatBox(this._t("updated"));
        this._planValue = planStat.value;
        this._creditsValue = creditsStat.value;
        this._updatedValue = updatedStat.value;
        statRow.add_actor(planStat.actor);
        statRow.add_actor(creditsStat.actor);
        statRow.add_actor(updatedStat.actor);
        heroCard.add_actor(statRow);

        this._menuRoot.add_actor(heroCard);

        this._primaryMeter = new UsageMeter(this._windowName(300, "primary"), PRIMARY_ACCENT);
        this._secondaryMeter = new UsageMeter(this._windowName(10080, "secondary"), SECONDARY_ACCENT);
        this._menuRoot.add_actor(this._primaryMeter.actor);
        this._menuRoot.add_actor(this._secondaryMeter.actor);

        let footerCard = new St.BoxLayout({
            vertical: true,
            style_class: "codex-footer-card",
            x_expand: true
        });
        this._statusLabel = new St.Label({
            text: this._t("waitingFirstSync"),
            style_class: "codex-status-label"
        });
        this._statusLabel.clutter_text.line_wrap = true;
        this._statusLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        footerCard.add_actor(this._statusLabel);

        this._hintLabel = new St.Label({
            text: this._t("openPanelHint"),
            style_class: "codex-hint-label"
        });
        this._hintLabel.clutter_text.line_wrap = true;
        this._hintLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        footerCard.add_actor(this._hintLabel);
        this._menuRoot.add_actor(footerCard);

    }

    _createStatBox(label) {
        let actor = new St.BoxLayout({
            vertical: true,
            style_class: "codex-stat-box",
            x_expand: true
        });
        let caption = new St.Label({
            text: label,
            style_class: "codex-stat-label"
        });
        let value = new St.Label({
            text: "--",
            style_class: "codex-stat-value"
        });
        actor.add_actor(caption);
        actor.add_actor(value);
        return { actor, value };
    }

    _onMenuStateChanged(menu, open) {
        if (open) {
            this._refreshNow();
        }
    }

    _onRefreshTimer() {
        this._refreshNow();
        return true;
    }

    _t(key, replacements) {
        return translate(this._language, key, replacements);
    }

    _refreshNow() {
        if (this._refreshing) {
            return;
        }

        this._refreshing = true;
        this._setStatusBadge("loading", this._t("syncing"));
        this._statusLabel.set_text(this._t("refreshingStatus"));
        this.set_applet_tooltip(this._t("refreshingTooltip"));

        Util.spawnCommandLineAsyncIO(
            null,
            this._onRefreshFinished.bind(this),
            { argv: ["python3", this._helperPath] }
        );
    }

    _onRefreshFinished(stdout, stderr, exitCode) {
        this._refreshing = false;

        if (exitCode !== 0) {
            this._showError(stderr || stdout || "helper failed");
            return;
        }

        let payload;

        try {
            payload = JSON.parse(stdout);
        } catch (error) {
            this._showError(error.message);
            return;
        }

        this._applyPayload(payload);
    }

    _applyPayload(payload) {
        let account = payload.account || {};
        let rateLimit = payload.rate_limit || {};
        let primary = rateLimit.primary || null;
        let secondary = rateLimit.secondary || null;
        let credits = rateLimit.credits || null;
        let primaryRemaining = this._remainingPercent(primary);
        let secondaryRemaining = this._remainingPercent(secondary);

        this._lastPayload = payload;

        this.set_applet_label(this._buildPanelLabel(primaryRemaining, secondaryRemaining, primary, secondary));
        this.set_applet_tooltip(this._buildTooltip(account, rateLimit, primary, secondary, credits, payload.updated_at));

        this._accountLabel.set_text(account.email || this._t("signedIn"));
        this._contextLabel.set_text(this._t("limitContext", {
            limit: rateLimit.limit_id || "codex",
            auth: payload.requires_openai_auth ? this._t("authSuffix") : ""
        }));
        this._planValue.set_text(account.plan_type || rateLimit.plan_type || this._t("unknown"));
        this._creditsValue.set_text(this._compactCredits(credits));
        this._updatedValue.set_text(this._formatUpdatedTime(payload.updated_at));

        this._primaryMeter.setState(this._buildWindowState(primary, "primary"));
        this._secondaryMeter.setState(this._buildWindowState(secondary, "secondary"));

        this._setStatusBadge("live", this._t("live"));
        this._statusLabel.set_text(this._t("clickRefreshHint"));
        this._hintLabel.set_text(this._t("panelLabelHint"));
    }

    _buildPanelLabel(primaryRemaining, secondaryRemaining, primary, secondary) {
        let leftName = this._shortWindowName(primary ? primary.window_duration_mins : 300, "primary");
        let rightName = this._shortWindowName(secondary ? secondary.window_duration_mins : 10080, "secondary");
        let leftValue = primaryRemaining === null ? "--" : String(primaryRemaining) + "%";
        let rightValue = secondaryRemaining === null ? "--" : String(secondaryRemaining) + "%";

        return this._t("panelLabel", {
            leftName: leftName,
            leftValue: leftValue,
            rightName: rightName,
            rightValue: rightValue
        });
    }

    _buildWindowState(windowData, fallbackName) {
        let remaining = this._remainingPercent(windowData);
        let usedText = this._displayPercent(this._usedPercent(windowData));
        let remainingText = this._displayPercent(remaining);
        let resetText = this._formatAbsoluteTime(windowData ? windowData.resets_at : null);

        return {
            title: this._windowName(windowData ? windowData.window_duration_mins : null, fallbackName),
            remaining: remaining,
            usedText: usedText,
            remainingText: remainingText,
            detailText: remaining === null
                ? this._t("usageDataUnavailable")
                : this._t("usedLeftDetail", { used: usedText, left: remainingText }),
            resetText: remaining === null
                ? this._t("resetsDash")
                : this._t("resetsAt", { time: resetText })
        };
    }

    _buildTooltip(account, rateLimit, primary, secondary, credits, updatedAt) {
        let pieces = [];

        pieces.push(this._t("tooltipHeader", {
            title: this._t("heroTitle"),
            account: account.email || this._t("signedIn")
        }));
        pieces.push(this._t("tooltipMeta", {
            planLabel: this._t("planTitle"),
            plan: account.plan_type || rateLimit.plan_type || this._t("unknown"),
            limitLabel: this._t("limitTitle"),
            limit: rateLimit.limit_id || "codex",
            updatedLabel: this._t("updatedTitle"),
            updated: this._formatUpdatedTime(updatedAt)
        }));
        pieces.push(this._formatWindowLine(primary, "primary"));
        pieces.push(this._formatWindowLine(secondary, "secondary"));
        let creditsLine = this._formatCreditsLine(credits);
        if (creditsLine !== null) {
            pieces.push(this._t("tooltipCredits", { credits: creditsLine }));
        }

        return pieces.join("\n");
    }

    _formatWindowLine(windowData, fallbackName) {
        if (!windowData) {
            return this._t("windowUnavailable", { name: this._windowName(null, fallbackName) });
        }

        let label = this._shortWindowName(windowData.window_duration_mins, fallbackName);
        let used = this._displayPercent(this._usedPercent(windowData));
        let remaining = this._displayPercent(this._remainingPercent(windowData));
        let resetAt = this._formatAbsoluteTime(windowData.resets_at);

        return this._t("windowLine", { name: label, used: used, left: remaining, time: resetAt });
    }

    _formatCreditsLine(credits) {
        if (!credits) {
            return null;
        }

        if (credits.unlimited) {
            return this._t("creditsUnlimited");
        }

        if (!credits.has_credits) {
            return null;
        }

        return this._t("creditsValue", { value: credits.balance || "0" });
    }

    _compactCredits(credits) {
        if (!credits) {
            return "--";
        }

        if (credits.unlimited) {
            return this._language === "zh" ? "无限" : "unlimited";
        }

        if (!credits.has_credits) {
            return this._language === "zh" ? "无" : "none";
        }

        return String(credits.balance || "0");
    }

    _showError(message) {
        let text = this._singleLine(message || "unknown error");

        if (this._lastPayload === null) {
            this.set_applet_label(this._t("errLabel"));
            this._primaryMeter.setState(this._buildWindowState(null, "primary"));
            this._secondaryMeter.setState(this._buildWindowState(null, "secondary"));
            this._accountLabel.set_text(this._t("unableToLoad"));
            this._contextLabel.set_text(this._t("checkLogin"));
            this._planValue.set_text("--");
            this._creditsValue.set_text("--");
            this._updatedValue.set_text("--");
        }

        this._setStatusBadge("error", this._t("error"));
        this._statusLabel.set_text(this._t("refreshFailed", { error: text }));
        this._hintLabel.set_text(this._t("lastSnapshotHint"));
        this.set_applet_tooltip(this._t("errorTooltip", { error: text }));
    }

    _setMenuLoadingState() {
        this._primaryMeter.setState(this._buildWindowState(null, "primary"));
        this._secondaryMeter.setState(this._buildWindowState(null, "secondary"));
        this._accountLabel.set_text(this._t("connecting"));
        this._contextLabel.set_text(this._t("preparingSnapshot"));
        this._planValue.set_text("--");
        this._creditsValue.set_text("--");
        this._updatedValue.set_text("--");
        this._statusLabel.set_text(this._t("waitingFirstSuccessful"));
        this._hintLabel.set_text(this._t("openRefreshHint"));
    }

    _setStatusBadge(state, text) {
        this._statusBadge.set_text(text);
        this._statusBadge.remove_style_class_name("codex-status-live");
        this._statusBadge.remove_style_class_name("codex-status-loading");
        this._statusBadge.remove_style_class_name("codex-status-error");
        this._statusBadge.add_style_class_name("codex-status-" + state);
    }

    _usedPercent(windowData) {
        if (!windowData || typeof windowData.used_percent !== "number") {
            return null;
        }

        return Math.max(0, Math.min(100, windowData.used_percent));
    }

    _remainingPercent(windowData) {
        let used = this._usedPercent(windowData);

        if (used === null) {
            return null;
        }

        return Math.max(0, 100 - used);
    }

    _displayPercent(value) {
        if (value === null) {
            return "-";
        }

        return String(value) + "%";
    }

    _windowName(minutes, fallbackName) {
        if (minutes === 300) {
            return this._t("known5hWindow");
        }

        if (minutes === 10080) {
            return this._t("known7dWindow");
        }

        if (typeof minutes === "number" && minutes > 0) {
            if (minutes % 1440 === 0) {
                return this._t("dayWindow", { value: minutes / 1440 });
            }

            if (minutes % 60 === 0) {
                return this._t("hourWindow", { value: minutes / 60 });
            }

            return this._t("minuteWindow", { value: minutes });
        }

        if (fallbackName === "primary") {
            return this._t("primaryWindow");
        }

        if (fallbackName === "secondary") {
            return this._t("secondaryWindow");
        }

        return this._t("window");
    }

    _shortWindowName(minutes, fallbackName) {
        if (minutes === 300) {
            return this._t("short5h");
        }

        if (minutes === 10080) {
            return this._t("short7d");
        }

        if (typeof minutes === "number" && minutes > 0) {
            if (minutes % 1440 === 0) {
                return this._t("shortDay", { value: minutes / 1440 });
            }

            if (minutes % 60 === 0) {
                return this._t("shortHour", { value: minutes / 60 });
            }

            return this._t("shortMinute", { value: minutes });
        }

        return fallbackName === "secondary" ? this._t("short7d") : this._t("short5h");
    }

    _formatUpdatedTime(timestamp) {
        if (typeof timestamp !== "number") {
            return "-";
        }

        let now = Math.floor(Date.now() / 1000);
        let delta = Math.max(0, now - timestamp);

        if (delta < 45) {
            return this._t("justNow");
        }

        if (delta < 3600) {
            let minutes = Math.max(1, Math.round(delta / 60));
            return this._t(minutes === 1 ? "minuteAgo" : "minutesAgo", { value: minutes });
        }

        if (delta < 86400) {
            let hours = Math.max(1, Math.round(delta / 3600));
            return this._t(hours === 1 ? "hourAgo" : "hoursAgo", { value: hours });
        }

        if (delta < 604800) {
            let days = Math.max(1, Math.round(delta / 86400));
            return this._t(days === 1 ? "dayAgo" : "daysAgo", { value: days });
        }

        let weeks = Math.max(1, Math.round(delta / 604800));
        return this._t(weeks === 1 ? "weekAgo" : "weeksAgo", { value: weeks });
    }

    _formatAbsoluteTime(timestamp) {
        if (typeof timestamp !== "number") {
            return "-";
        }

        let dateTime = GLib.DateTime.new_from_unix_local(timestamp);

        if (dateTime === null) {
            return "-";
        }

        return dateTime.format("%m-%d %H:%M");
    }

    _singleLine(text) {
        return String(text).replace(/\s+/g, " ").trim();
    }

    on_applet_clicked() {
        this.menu.toggle();
    }

    on_applet_removed_from_panel() {
        if (this._refreshLoopId !== 0) {
            Mainloop.source_remove(this._refreshLoopId);
            this._refreshLoopId = 0;
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new CodexUsageApplet(metadata, orientation, panelHeight, instanceId);
}
