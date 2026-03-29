const Applet = imports.ui.applet;
const Cairo = imports.cairo;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const Pango = imports.gi.Pango;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const Util = imports.misc.util;

const DEFAULT_REFRESH_INTERVAL_MINUTES = 5;
const MIN_REFRESH_INTERVAL_MINUTES = 1;
const MAX_REFRESH_INTERVAL_MINUTES = 240;

const PRIMARY_ACCENT = { red: 16, green: 185, blue: 129 };
const SECONDARY_ACCENT = { red: 59, green: 130, blue: 246 };
const COPILOT_ACCENT = { red: 168, green: 85, blue: 247 };

const TRANSLATIONS = {
    en: {
        heroTitle: "Codex Usage",
        loading: "Loading",
        syncing: "Syncing",
        live: "Live",
        error: "Error",
        connecting: "Connecting to quota services",
        plan: "Plan",
        codexPlan: "Codex",
        creditsTitle: "Credits",
        copilot: "Copilot",
        updated: "Updated",
        refreshNow: "Refresh",
        configureApplet: "Configure...",
        loadingTooltip: "Loading Codex and Copilot quota",
        refreshingTooltip: "Refreshing quota snapshot...",
        refreshingStatus: "Refreshing Codex data and optional GitHub Copilot quota...",
        waitingFirstSync: "Waiting for first sync",
        lastSnapshotHint: "The last successful snapshot stays visible until the next good refresh.",
        openPanelHint: "Open the panel to inspect Codex and Copilot quota details.",
        panelLabelHint: "Panel label shows Codex windows and, when enabled, Copilot premium interactions.",
        clickRefreshHint: "Use the context menu to refresh immediately.",
        refreshInProgress: "Refresh already in progress",
        refreshInProgressBody: "Wait for the current refresh to finish.",
        refreshSuccessTitle: "Refresh completed",
        refreshSuccessCodexOnly: "Codex data updated.",
        refreshSuccessBoth: "Codex and GitHub Copilot data updated.",
        refreshPartialTitle: "Refresh completed with warnings",
        refreshFailedTitle: "Refresh failed",
        refreshStatusCodexOk: "Codex updated",
        refreshStatusCopilotOk: "Copilot updated",
        refreshStatusCodexFailed: "Codex failed: {error}",
        refreshStatusCopilotFailed: "Copilot failed: {error}",
        unableToLoad: "Unable to load Codex data",
        checkLogin: "Check codex login and helper output",
        preparingSnapshot: "Preparing quota snapshot",
        waitingFirstSuccessful: "Waiting for the first successful sync...",
        refreshFailed: "Refresh failed: {error}",
        signedIn: "Signed in",
        unknown: "unknown",
        autoRefreshEvery: "Auto refresh every {value} min",
        contextWithCopilot: "Auto refresh every {value} min | Copilot {state}",
        enabled: "on",
        disabled: "off",
        disabledShort: "Off",
        errLabel: "ERR",
        usageDataUnavailable: "Usage data unavailable",
        resetsDash: "Resets -",
        usedLeftDetail: "Used {used} | Left {left}",
        resetsAt: "Reset {time}",
        accountTitle: "Account",
        planTitle: "Plan",
        limitTitle: "Limit",
        updatedTitle: "Updated",
        tooltipHeader: "{title}",
        tooltipMeta: "{planLabel} {plan} | {limitLabel} {limit} | {updatedLabel} {updated}",
        tooltipCredits: "{credits}",
        tooltipCodexPrefix: "Codex",
        tooltipCopilotPrefix: "Copilot",
        tooltipErrorLine: "{name}: {error}",
        tooltipDisabledLine: "Copilot query is disabled",
        tooltipWaitingLine: "{name}: waiting for first successful sync",
        copilotTooltipTitle: "GitHub Copilot Usage",
        copilotTooltipSummary: "Left {remaining} / {entitlement} ({percent}%) | Reset {reset}",
        copilotTooltipDetails: "Chat {chat} | Completions {completions} | {plan} | Updated {updated}",
        copilotUsageLine: "Requests {requests} | Chat {chat} | Completions {completions}",
        copilotSubtitle: "{login} | {plan}",
        copilotRequests: "Requests {value}",
        windowUnavailable: "{name}: unavailable",
        windowLine: "{name} | {left} left | {used} used | reset {time}",
        creditsUnlimited: "Credits: unlimited",
        creditsValue: "Credits: {value}",
        copilotTitle: "GitHub Copilot Usage",
        copilotDisabled: "GitHub Copilot querying is disabled in settings.",
        copilotConfigureHint: "Right click the applet and choose Configure to enable it.",
        copilotRequirements: "Requires gh CLI signed in with Copilot user access.",
        copilotPremium: "Premium interactions",
        copilotChat: "Chat",
        copilotCompletions: "Completions",
        copilotReset: "Quota reset",
        copilotRemainingDetail: "{remaining} left of {entitlement} ({percent}%)",
        copilotRemainingSimple: "{remaining} left ({percent}%)",
        copilotUnlimitedDetail: "Unlimited quota",
        copilotQuotaLine: "Chat {chat} | Completions {completions}",
        copilotFooter: "Reset {reset} | User {user}",
        copilotPanelValue: "PI {value}",
        copilotUnavailable: "Unavailable",
        copilotWaiting: "Waiting for Copilot data",
        premiumInteractions: "premium interactions",
        quotaUnlimitedShort: "∞",
        justNow: "just now",
        minuteAgo: "1m ago",
        minutesAgo: "{value}m ago",
        hourAgo: "1h ago",
        hoursAgo: "{value}h ago",
        dayAgo: "1d ago",
        daysAgo: "{value}d ago",
        weekAgo: "1w ago",
        weeksAgo: "{value}w ago",
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
        panelLabel: "{leftName} {leftValue}  ·  {rightName} {rightValue}"
    },
    zh: {
        heroTitle: "Codex 用量",
        loading: "加载中",
        syncing: "同步中",
        live: "实时",
        error: "错误",
        connecting: "正在连接额度服务",
        plan: "套餐",
        codexPlan: "Codex",
        creditsTitle: "点数",
        copilot: "Copilot",
        updated: "更新",
        refreshNow: "刷新",
        configureApplet: "配置...",
        loadingTooltip: "正在加载 Codex 和 Copilot 额度",
        refreshingTooltip: "正在刷新额度快照...",
        refreshingStatus: "正在刷新 Codex 数据和可选的 GitHub Copilot 额度...",
        waitingFirstSync: "等待首次同步",
        lastSnapshotHint: "会保留上一次成功的快照，直到下一次刷新成功。",
        openPanelHint: "打开面板可查看 Codex 和 Copilot 的额度详情。",
        panelLabelHint: "面板标签会显示 Codex 窗口额度，并在启用时附带 Copilot premium interactions。",
        clickRefreshHint: "如需立即同步，请使用右键菜单里的刷新。",
        refreshInProgress: "刷新正在进行中",
        refreshInProgressBody: "请等待当前刷新完成。",
        refreshSuccessTitle: "刷新完成",
        refreshSuccessCodexOnly: "Codex 数据已更新。",
        refreshSuccessBoth: "Codex 和 GitHub Copilot 数据已更新。",
        refreshPartialTitle: "刷新完成，但有告警",
        refreshFailedTitle: "刷新失败",
        refreshStatusCodexOk: "Codex 已更新",
        refreshStatusCopilotOk: "Copilot 已更新",
        refreshStatusCodexFailed: "Codex 失败：{error}",
        refreshStatusCopilotFailed: "Copilot 失败：{error}",
        unableToLoad: "无法加载 Codex 数据",
        checkLogin: "请检查 codex 登录状态和 helper 输出",
        preparingSnapshot: "正在准备额度快照",
        waitingFirstSuccessful: "等待第一次成功同步...",
        refreshFailed: "刷新失败：{error}",
        signedIn: "已登录",
        unknown: "未知",
        autoRefreshEvery: "每 {value} 分钟自动刷新一次",
        contextWithCopilot: "每 {value} 分钟自动刷新 | Copilot {state}",
        enabled: "开启",
        disabled: "关闭",
        disabledShort: "关闭",
        errLabel: "错误",
        usageDataUnavailable: "暂无额度数据",
        resetsDash: "重置时间 -",
        usedLeftDetail: "已用 {used} | 剩余 {left}",
        resetsAt: "重置 {time}",
        accountTitle: "账号",
        planTitle: "套餐",
        limitTitle: "额度桶",
        updatedTitle: "更新",
        tooltipHeader: "{title}",
        tooltipMeta: "{planLabel} {plan} | {limitLabel} {limit} | {updatedLabel} {updated}",
        tooltipCredits: "{credits}",
        tooltipCodexPrefix: "Codex",
        tooltipCopilotPrefix: "Copilot",
        tooltipErrorLine: "{name}：{error}",
        tooltipDisabledLine: "Copilot 查询已关闭",
        tooltipWaitingLine: "{name}：等待首次成功同步",
        copilotTooltipTitle: "Github Copilot 用量",
        copilotTooltipSummary: "剩余 {remaining} / {entitlement} ({percent}%) | 重置 {reset}",
        copilotTooltipDetails: "对话 {chat} | 补全 {completions} | {plan} | 更新 {updated}",
        copilotUsageLine: "请求 {requests} | 对话 {chat} | 补全 {completions}",
        copilotSubtitle: "{login} | {plan}",
        copilotRequests: "请求 {value}",
        windowUnavailable: "{name}：不可用",
        windowLine: "{name} | 剩余 {left} | 已用 {used} | 重置 {time}",
        creditsUnlimited: "点数：无限",
        creditsValue: "点数：{value}",
        copilotTitle: "Github Copilot 用量",
        copilotDisabled: "设置中已关闭 GitHub Copilot 查询。",
        copilotConfigureHint: "右键点击 applet，选择“配置...”后即可启用。",
        copilotRequirements: "要求系统已安装 gh，并且已登录具备 Copilot user 权限的账号。",
        copilotPremium: "Premium interactions",
        copilotChat: "聊天",
        copilotCompletions: "补全",
        copilotReset: "额度重置",
        copilotRemainingDetail: "剩余 {remaining} / {entitlement}（{percent}%）",
        copilotRemainingSimple: "剩余 {remaining}（{percent}%）",
        copilotUnlimitedDetail: "无限额度",
        copilotQuotaLine: "聊天 {chat} | 补全 {completions}",
        copilotFooter: "重置 {reset} | 用户 {user}",
        copilotPanelValue: "PI {value}",
        copilotUnavailable: "不可用",
        copilotWaiting: "等待 Copilot 数据",
        premiumInteractions: "premium interactions",
        quotaUnlimitedShort: "∞",
        justNow: "刚刚",
        minuteAgo: "1分前",
        minutesAgo: "{value}分前",
        hourAgo: "1小时前",
        hoursAgo: "{value}小时前",
        dayAgo: "1天前",
        daysAgo: "{value}天前",
        weekAgo: "1周前",
        weeksAgo: "{value}周前",
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
        panelLabel: "{leftName} {leftValue}  ·  {rightName} {rightValue}"
    }
};

function detectLanguage() {
    let names = GLib.get_language_names();

    for (let index = 0; index < names.length; index++) {
        if (String(names[index]).toLowerCase().startsWith("zh")) {
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

function createWrappedLabel(text, styleClass) {
    let label = new St.Label({
        text: text,
        style_class: styleClass
    });
    label.clutter_text.line_wrap = true;
    label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
    return label;
}

function applySecondaryTextStyle(label) {
    label.add_style_class_name("popup-inactive-menu-item");
    label.add_style_pseudo_class("insensitive");
    return label;
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

        this._detailLabel = applySecondaryTextStyle(createWrappedLabel("", "codex-card-detail"));
        this.actor.add_actor(this._detailLabel);

        this._resetLabel = applySecondaryTextStyle(new St.Label({
            text: "",
            style_class: "codex-card-reset"
        }));
        this.actor.add_actor(this._resetLabel);
    },

    setState: function(state) {
        this._titleLabel.set_text(state.title);

        if (state.remaining === null) {
            this._hasData = false;
            this._fraction = 0;
            this._percentLabel.set_text("--");
        } else {
            this._hasData = true;
            this._fraction = Math.max(0, Math.min(1, state.remaining / 100));
            this._percentLabel.set_text(String(state.remaining) + "%");
        }

        this._detailLabel.set_text(state.detailText);
        this._resetLabel.set_text(state.resetText);
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

function SummaryCard(title) {
    this._init(title);
}

SummaryCard.prototype = {
    _init: function(title) {
        this._accentColor = COPILOT_ACCENT;
        this._fraction = 0;
        this._hasData = false;

        this.actor = new St.BoxLayout({
            vertical: true,
            style_class: "codex-window-card codex-copilot-card",
            x_expand: true
        });

        let header = new St.BoxLayout({
            style_class: "codex-card-header",
            x_expand: true
        });

        let headerTextBox = new St.BoxLayout({
            vertical: true,
            style_class: "codex-card-header-copy",
            x_expand: true
        });

        this._titleLabel = new St.Label({
            text: title,
            style_class: "codex-hero-title codex-copilot-title",
            x_expand: true
        });
        this._valueLabel = new St.Label({
            text: "--",
            style_class: "codex-summary-value"
        });

        this._subtitleLabel = applySecondaryTextStyle(createWrappedLabel("", "codex-card-subtitle"));
        headerTextBox.add_actor(this._titleLabel);
        headerTextBox.add_actor(this._subtitleLabel);
        header.add_actor(headerTextBox);
        header.add_actor(this._valueLabel);
        this.actor.add_actor(header);

        this._bar = new St.DrawingArea({
            style_class: "codex-progress-bar",
            x_expand: true,
            height: 14
        });
        this._bar.connect("repaint", this._onRepaint.bind(this));
        this.actor.add_actor(this._bar);

        this._detailLabel = applySecondaryTextStyle(createWrappedLabel("", "codex-card-detail"));
        this.actor.add_actor(this._detailLabel);

        this._metaRow = new St.BoxLayout({
            style_class: "codex-card-meta-row",
            x_expand: true
        });
        this._footerLabel = applySecondaryTextStyle(new St.Label({
            text: "",
            style_class: "codex-card-reset",
            x_expand: true,
            y_align: St.Align.MIDDLE
        }));
        this._metaSpacer = new St.Widget({ x_expand: true });
        this._metaLabel = applySecondaryTextStyle(new St.Label({
            text: "",
            style_class: "codex-status-badge codex-status-muted codex-card-meta-label",
            x_align: St.Align.END
        }));
        this._metaRow.add_actor(this._footerLabel);
        this._metaRow.add_actor(this._metaSpacer);
        this._metaRow.add_actor(this._metaLabel);
        this.actor.add_actor(this._metaRow);
    },

    setState: function(state) {
        this._titleLabel.set_text(state.title);
        this._valueLabel.set_text(state.valueText);
        this._subtitleLabel.set_text(state.subtitleText || "");
        this._subtitleLabel.visible = Boolean(state.subtitleText);

        if (typeof state.progressFraction === "number") {
            this._fraction = Math.max(0, Math.min(1, state.progressFraction));
            this._hasData = true;
        } else {
            this._fraction = 0;
            this._hasData = false;
        }

        this._detailLabel.set_text(state.detailText);
        this._metaLabel.set_text(state.metaText);
        this._footerLabel.set_text(state.footerText);
        this._metaLabel.visible = state.metaText !== "";
        this._footerLabel.visible = state.footerText !== "";
        this._metaRow.visible = state.metaText !== "" || state.footerText !== "";
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
        this._copilotHelperPath = GLib.build_filenamev([this.metadata.path, "bin", "fetch_copilot_usage.py"]);
        this._copilotPanelIconPath = GLib.build_filenamev([this.metadata.path, "copilot-symbolic.svg"]);
        this._iconPath = GLib.build_filenamev([this.metadata.path, "codex-symbolic.svg"]);
        this._legacyIconPath = GLib.build_filenamev([this.metadata.path, "codex.svg"]);
        this._language = detectLanguage();
        this._refreshLoopId = 0;
        this._refreshing = false;
        this._lastCodexPayload = null;
        this._lastCopilotPayload = null;
        this._codexError = null;
        this._copilotError = null;
        this._activeSubprocesses = [];
        this.refreshIntervalMinutes = DEFAULT_REFRESH_INTERVAL_MINUTES;
        this.enableCopilot = false;

        this.settings = new Settings.AppletSettings(this, metadata.uuid, instanceId);
        this.settings.bind("refresh-interval-minutes", "refreshIntervalMinutes", this._onSettingsChanged.bind(this));
        this.settings.bind("enable-copilot-query", "enableCopilot", this._onSettingsChanged.bind(this));

        this.setAllowedLayout(Applet.AllowedLayout.BOTH);
        this.actor.add_style_class_name("codex-usage-applet");
        this.actor.connect("enter-event", this._onAppletEnter.bind(this));
        this._setupPanelCopilotIndicator();
        this._setPanelIcon();
        this.set_applet_label(this._buildPanelLabel(null, null, null, null));
        this.set_applet_tooltip(this._t("loadingTooltip"));

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);
        this.menu.connect("open-state-changed", this._onMenuStateChanged.bind(this));

        this._buildMenu();
        this._buildContextMenu();
        this._setMenuLoadingState();
        this._applySettings();
        this._refreshNow();
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

    _setupPanelCopilotIndicator() {
        this._panelCopilotIcon = new St.Icon({
            style_class: "system-status-icon codex-panel-copilot-icon",
            icon_size: 22,
            reactive: false,
            track_hover: false,
            y_expand: true,
            y_align: St.Align.MIDDLE,
            visible: false
        });
        this._panelCopilotIconBin = new St.Bin({
            style_class: "codex-panel-copilot-icon-bin",
            x_expand: false,
            y_expand: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE,
            reactive: false,
            track_hover: false,
            visible: false
        });
        this._panelCopilotValue = new St.Label({
            text: "",
            style_class: "applet-label codex-panel-copilot-value",
            reactive: false,
            track_hover: false,
            y_expand: true,
            y_align: St.Align.MIDDLE,
            visible: false
        });

        if (GLib.file_test(this._copilotPanelIconPath, GLib.FileTest.EXISTS)) {
            let file = Gio.file_new_for_path(this._copilotPanelIconPath);
            this._panelCopilotIcon.set_gicon(new Gio.FileIcon({ file: file }));
            this._panelCopilotIcon.set_icon_type(St.IconType.SYMBOLIC);
        }
        this._panelCopilotIconBin.set_child(this._panelCopilotIcon);

        this._panelCopilotBox = new St.BoxLayout({
            style_class: "codex-panel-copilot-box",
            y_expand: true,
            y_align: St.Align.MIDDLE
        });
        this._panelCopilotBox.add_actor(this._panelCopilotIconBin);
        this._panelCopilotBox.add_actor(this._panelCopilotValue);
        this._panelCopilotBox.visible = false;

        this._panelCopilotContainer = new St.Bin({
            style_class: "codex-panel-copilot-container",
            x_expand: false,
            y_expand: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE,
            reactive: false,
            track_hover: false,
            visible: false
        });
        this._panelCopilotContainer.set_child(this._panelCopilotBox);

        this.actor.insert_child_at_index(this._panelCopilotContainer, 2);
    }

    _buildMenu() {
        this.menu.actor.add_style_class_name("codex-usage-menu");

        let shellItem = new PopupMenu.PopupBaseMenuItem({
            style_class: "codex-menu-shell"
        });
        shellItem.actor.reactive = false;
        shellItem.actor.track_hover = false;
        shellItem.actor.can_focus = false;
        shellItem.actor.remove_style_class_name("popup-inactive-menu-item");
        shellItem.actor.remove_style_pseudo_class("insensitive");

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

        this._contextLabel = applySecondaryTextStyle(createWrappedLabel(this._t("autoRefreshEvery", { value: DEFAULT_REFRESH_INTERVAL_MINUTES }), "codex-context-label"));
        this._contextLabel.visible = false;

        let statRow = new St.BoxLayout({
            style_class: "codex-stat-row",
            x_expand: true
        });
        let planStat = this._createStatBox(this._t("codexPlan") || this._t("plan"));
        let creditsStat = this._createStatBox(this._t("creditsTitle"));
        this._planValue = planStat.value;
        this._creditsValue = creditsStat.value;
        statRow.add_actor(planStat.actor);
        statRow.add_actor(creditsStat.actor);
        heroCard.add_actor(statRow);

        this._menuRoot.add_actor(heroCard);

        this._primaryMeter = new UsageMeter(this._windowName(300, "primary"), PRIMARY_ACCENT);
        this._secondaryMeter = new UsageMeter(this._windowName(10080, "secondary"), SECONDARY_ACCENT);
        this._menuRoot.add_actor(this._primaryMeter.actor);
        this._menuRoot.add_actor(this._secondaryMeter.actor);

        this._copilotCard = new SummaryCard(this._t("copilotTitle"));
        this._menuRoot.add_actor(this._copilotCard.actor);

        this._statusLabel = applySecondaryTextStyle(createWrappedLabel(this._t("waitingFirstSync"), "codex-status-label"));
        this._hintLabel = applySecondaryTextStyle(createWrappedLabel(this._t("openPanelHint"), "codex-hint-label"));
    }

    _buildContextMenu() {
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let refreshItem = new PopupMenu.PopupIconMenuItem(this._t("refreshNow"), "view-refresh-symbolic", St.IconType.SYMBOLIC);
        refreshItem.connect("activate", () => this._refreshNow({ manual: true }));
        this._applet_context_menu.addMenuItem(refreshItem);
    }

    _createStatBox(label) {
        let actor = new St.BoxLayout({
            vertical: true,
            style_class: "codex-stat-box",
            x_expand: true
        });
        let caption = applySecondaryTextStyle(new St.Label({
            text: label,
            style_class: "codex-stat-label"
        }));
        let value = new St.Label({
            text: "--",
            style_class: "codex-stat-value"
        });
        actor.add_actor(caption);
        actor.add_actor(value);
        return { actor, value };
    }

    _onSettingsChanged() {
        if (!this._menuRoot) {
            return;
        }

        this._applySettings();
        this._render();
        this._refreshNow();
    }

    _applySettings() {
        this.refreshIntervalMinutes = this._sanitizeRefreshInterval(this.refreshIntervalMinutes);
        this.enableCopilot = Boolean(this.enableCopilot);
        this._restartRefreshLoop();

        if (!this.enableCopilot) {
            this._copilotError = null;
        }
    }

    _sanitizeRefreshInterval(value) {
        let numeric = parseInt(value, 10);

        if (isNaN(numeric)) {
            return DEFAULT_REFRESH_INTERVAL_MINUTES;
        }

        return Math.max(MIN_REFRESH_INTERVAL_MINUTES, Math.min(MAX_REFRESH_INTERVAL_MINUTES, numeric));
    }

    _restartRefreshLoop() {
        if (this._refreshLoopId !== 0) {
            Mainloop.source_remove(this._refreshLoopId);
            this._refreshLoopId = 0;
        }

        this._refreshLoopId = Mainloop.timeout_add_seconds(
            this.refreshIntervalMinutes * 60,
            this._onRefreshTimer.bind(this)
        );
    }

    _onMenuStateChanged(menu, open) {
        if (open && !this._refreshing) {
            this._render();
        }
    }

    _onAppletEnter() {
        if (!this._refreshing) {
            this._render();
        }
    }

    _onRefreshTimer() {
        this._refreshNow();
        return true;
    }

    _t(key, replacements) {
        return translate(this._language, key, replacements);
    }

    _refreshNow(options) {
        let refreshOptions = options || {};
        let manual = Boolean(refreshOptions.manual);

        if (this._refreshing) {
            if (manual) {
                this._notifyRefreshResult(this._t("refreshInProgress"), this._t("refreshInProgressBody"));
            }
            return;
        }

        this._refreshing = true;
        this._render();

        let pending = this.enableCopilot ? 2 : 1;
        let codexResult = { payload: null, error: null };
        let copilotResult = { payload: null, error: null };

        let finish = () => {
            pending -= 1;

            if (pending !== 0) {
                return;
            }

            this._refreshing = false;

            if (codexResult.payload !== null) {
                this._lastCodexPayload = codexResult.payload;
                this._codexError = null;
            } else if (codexResult.error !== null) {
                this._codexError = codexResult.error;
            }

            if (this.enableCopilot) {
                if (copilotResult.payload !== null) {
                    this._lastCopilotPayload = copilotResult.payload;
                    this._copilotError = null;
                } else if (copilotResult.error !== null) {
                    this._copilotError = copilotResult.error;
                }
            }

            this._render();

            if (manual) {
                this._notifyManualRefreshOutcome(codexResult, copilotResult);
            }
        };

        this._spawnHelper(this._helperPath, (payload, error) => {
            codexResult.payload = payload;
            codexResult.error = error;
            finish();
        });

        if (!this.enableCopilot) {
            return;
        }

        this._spawnHelper(this._copilotHelperPath, (payload, error) => {
            copilotResult.payload = payload;
            copilotResult.error = error;
            finish();
        });
    }

    _spawnHelper(helperPath, callback) {
        let subprocess;

        try {
            subprocess = Util.spawnCommandLineAsyncIO(
                null,
                (stdout, stderr, exitCode) => {
                    this._activeSubprocesses = this._activeSubprocesses.filter(item => item !== subprocess);

                    if (exitCode !== 0) {
                        callback(null, stderr || stdout || "helper failed");
                        return;
                    }

                    try {
                        callback(JSON.parse(stdout), null);
                    } catch (error) {
                        callback(null, error.message);
                    }
                },
                { argv: ["python3", helperPath] }
            );
        } catch (error) {
            callback(null, error.message || String(error));
            return;
        }

        this._activeSubprocesses.push(subprocess);
    }

    _notifyRefreshResult(title, body) {
        if (body) {
            Main.notify(title, body);
            return;
        }

        Main.notify(title);
    }

    _notifyManualRefreshOutcome(codexResult, copilotResult) {
        let codexOk = codexResult.payload !== null;
        let copilotEnabled = this.enableCopilot;
        let copilotOk = !copilotEnabled || copilotResult.payload !== null;

        if (codexOk && copilotOk) {
            this._notifyRefreshResult(
                this._t("refreshSuccessTitle"),
                copilotEnabled ? this._t("refreshSuccessBoth") : this._t("refreshSuccessCodexOnly")
            );
            return;
        }

        let parts = [];
        parts.push(codexOk
            ? this._t("refreshStatusCodexOk")
            : this._t("refreshStatusCodexFailed", { error: this._singleLine(codexResult.error || "unknown") }));

        if (copilotEnabled) {
            parts.push(copilotOk
                ? this._t("refreshStatusCopilotOk")
                : this._t("refreshStatusCopilotFailed", { error: this._singleLine(copilotResult.error || "unknown") }));
        }

        let title = codexOk || copilotOk ? this._t("refreshPartialTitle") : this._t("refreshFailedTitle");
        this._notifyRefreshResult(title, parts.join(" | "));
    }

    _render() {
        let codexPayload = this._lastCodexPayload;
        let copilotPayload = this.enableCopilot ? this._lastCopilotPayload : null;
        let codexAccount = codexPayload ? codexPayload.account || {} : {};
        let rateLimit = codexPayload ? codexPayload.rate_limit || {} : {};
        let primary = rateLimit.primary || null;
        let secondary = rateLimit.secondary || null;
        let credits = rateLimit.credits || null;

        this.set_applet_label(this._buildCombinedPanelLabel(primary, secondary, copilotPayload));
        this.set_applet_tooltip(this._buildTooltip(codexPayload, copilotPayload));

        this._accountLabel.set_text(this._buildAccountLabel(codexPayload, copilotPayload));
        this._contextLabel.set_text(this._buildContextLabel(rateLimit));
        this._planValue.set_text(this._formatPlanName(codexAccount.plan_type || rateLimit.plan_type || this._t("unknown")));
        this._creditsValue.set_text(this._buildCreditsStatValue(credits));
        this._setPanelCopilotIndicator(copilotPayload);
        this._copilotCard.actor.visible = this.enableCopilot;

        this._primaryMeter.setState(this._buildWindowState(primary, "primary"));
        this._secondaryMeter.setState(this._buildWindowState(secondary, "secondary"));
        if (this.enableCopilot) {
            this._copilotCard.setState(this._buildCopilotCardState(copilotPayload));
        }

        this._renderStatusFooter(codexPayload, copilotPayload, credits);
    }

    _buildCombinedPanelLabel(primary, secondary, copilotPayload) {
        let codexFragment = this._buildCodexPanelFragment(primary, secondary);

        return codexFragment || this._t("loading");
    }

    _buildCodexPanelFragment(primary, secondary) {
        if (!this._lastCodexPayload && this._codexError) {
            return this._t("errLabel");
        }

        return this._buildPanelLabel(
            this._remainingPercent(primary),
            this._remainingPercent(secondary),
            primary,
            secondary
        );
    }

    _buildCopilotPanelFragment(copilotPayload) {
        if (!this.enableCopilot) {
            return null;
        }

        if (!copilotPayload) {
            return this._copilotError && !this._lastCopilotPayload ? this._t("errLabel") : null;
        }

        let premium = this._getCopilotSnapshot(copilotPayload, "premium_interactions");
        if (!premium) {
            return "--";
        }

        return this._copilotQuotaShortValue(premium);
    }

    _buildWindowState(windowData, fallbackName) {
        let remaining = this._remainingPercent(windowData);
        let usedText = this._displayPercent(this._usedPercent(windowData));
        let remainingText = this._displayPercent(remaining);
        let resetText = this._formatAbsoluteTime(windowData ? windowData.resets_at : null);

        return {
            title: this._windowName(windowData ? windowData.window_duration_mins : null, fallbackName),
            remaining: remaining,
            detailText: remaining === null
                ? this._t("usageDataUnavailable")
                : this._t("usedLeftDetail", { used: usedText, left: remainingText }),
            resetText: remaining === null
                ? this._t("resetsDash")
                : this._t("resetsAt", { time: resetText })
        };
    }

    _buildCopilotCardState(copilotPayload) {
        if (!this.enableCopilot) {
            return {
                title: this._t("copilotTitle"),
                valueText: this._t("disabledShort"),
                subtitleText: "",
                progressFraction: null,
                detailText: this._t("copilotDisabled"),
                metaText: "",
                footerText: ""
            };
        }

        if (!copilotPayload) {
            return {
                title: this._t("copilotTitle"),
                valueText: this._copilotError && !this._lastCopilotPayload ? this._t("errLabel") : "--",
                subtitleText: "",
                progressFraction: null,
                detailText: this._copilotError && !this._lastCopilotPayload
                    ? this._t("refreshFailed", { error: this._singleLine(this._copilotError) })
                    : this._t("copilotWaiting"),
                metaText: "",
                footerText: ""
            };
        }

        let premium = this._getCopilotSnapshot(copilotPayload, "premium_interactions");
        let chat = this._getCopilotSnapshot(copilotPayload, "chat");
        let completions = this._getCopilotSnapshot(copilotPayload, "completions");

        return {
            title: this._t("copilotTitle"),
            valueText: premium ? this._copilotQuotaShortValue(premium) : "--",
            subtitleText: this._buildCopilotSubtitle(copilotPayload),
            progressFraction: this._copilotProgressFraction(premium),
            detailText: this._buildCopilotUsageLine(chat, completions, premium),
            metaText: this._buildUpdatedAgeText(copilotPayload ? copilotPayload.updated_at : null),
            footerText: this._buildCopilotResetLine(copilotPayload)
        };
    }

    _buildCopilotSubtitle(copilotPayload) {
        return this._t("copilotSubtitle", {
            login: this._extractCopilotLogin(copilotPayload) || this._t("unknown"),
            plan: this._formatPlanName(this._extractCopilotPlan(copilotPayload) || this._t("unknown"))
        });
    }

    _buildCopilotUsageLine(chat, completions, premium) {
        return this._t("copilotUsageLine", {
            requests: this._buildCopilotRequestsSummary(premium),
            chat: this._copilotTooltipQuotaValue(chat),
            completions: this._copilotTooltipQuotaValue(completions)
        });
    }

    _buildCopilotRequestsSummary(premium) {
        if (!premium) {
            return "-";
        }

        if (premium.unlimited) {
            return this._t("quotaUnlimitedShort");
        }

        return this._copilotTooltipRemainingValue(premium) + "/" + this._copilotTooltipEntitlementValue(premium);
    }

    _buildCopilotResetLine(copilotPayload) {
        let resetAt = copilotPayload ? (copilotPayload.quota_reset_date_utc || copilotPayload.quota_reset_date || null) : null;
        return this._t("resetsAt", { time: this._formatAbsoluteTime(resetAt) });
    }

    _buildCopilotDetailLine(premium, copilotPayload) {
        if (!premium) {
            return this._t("copilotUnavailable");
        }

        if (premium.unlimited) {
            return this._t("copilotUnlimitedDetail");
        }

        return this._t("copilotTooltipSummary", {
            remaining: this._copilotTooltipRemainingValue(premium),
            entitlement: this._copilotTooltipEntitlementValue(premium),
            percent: this._copilotTooltipPercent(premium),
            reset: copilotPayload.quota_reset_date || "-"
        });
    }

    _buildCopilotMetaLine(chat, completions, premium) {
        return this._t("copilotTooltipDetails", {
            chat: this._copilotTooltipQuotaValue(chat),
            completions: this._copilotTooltipQuotaValue(completions),
            plan: this._extractCopilotRequestValue(premium)
        });
    }

    _buildCopilotPremiumDetail(premium) {
        if (!premium) {
            return this._t("copilotUnavailable");
        }

        if (premium.unlimited) {
            return this._t("copilotUnlimitedDetail");
        }

        if (typeof premium.entitlement === "number") {
            return this._t("copilotRemainingDetail", {
                remaining: this._formatCount(premium.remaining),
                entitlement: this._formatCount(premium.entitlement),
                percent: this._formatPercentValue(premium.percent_remaining)
            });
        }

        return this._t("copilotRemainingSimple", {
            remaining: this._formatCount(premium.remaining),
            percent: this._formatPercentValue(premium.percent_remaining)
        });
    }

    _buildTooltip(codexPayload, copilotPayload) {
        let pieces = [this._t("tooltipHeader", { title: this._t("heroTitle") })];

        if (codexPayload) {
            let account = codexPayload.account || {};
            let rateLimit = codexPayload.rate_limit || {};

            pieces.push(this._t("tooltipMeta", {
                planLabel: this._t("planTitle"),
                plan: this._formatPlanName(account.plan_type || rateLimit.plan_type || this._t("unknown")),
                limitLabel: this._t("limitTitle"),
                limit: this._formatPlanName(rateLimit.limit_id || "codex"),
                updatedLabel: this._t("updatedTitle"),
                updated: this._formatUpdatedTime(codexPayload.updated_at)
            }));
            pieces.push(this._formatWindowLine(rateLimit.primary || null, "primary"));
            pieces.push(this._formatWindowLine(rateLimit.secondary || null, "secondary"));
        } else if (this._codexError) {
            pieces.push(this._t("tooltipErrorLine", {
                name: this._t("tooltipCodexPrefix"),
                error: this._singleLine(this._codexError)
            }));
        } else {
            pieces.push(this._t("tooltipWaitingLine", { name: this._t("tooltipCodexPrefix") }));
        }

        if (!this.enableCopilot) {
            return pieces.join("\n");
        }

        if (copilotPayload) {
            pieces.push("");
            let premium = this._getCopilotSnapshot(copilotPayload, "premium_interactions");
            pieces.push(this._t("copilotTooltipTitle"));
            pieces.push(this._t("copilotTooltipDetails", {
                chat: this._copilotTooltipQuotaValue(this._getCopilotSnapshot(copilotPayload, "chat")),
                completions: this._copilotTooltipQuotaValue(this._getCopilotSnapshot(copilotPayload, "completions")),
                plan: this._formatPlanName(this._extractCopilotPlan(copilotPayload) || this._t("unknown")),
                updated: this._formatUpdatedTime(copilotPayload.updated_at)
            }));
            pieces.push(this._t("copilotTooltipSummary", {
                remaining: this._copilotTooltipRemainingValue(premium),
                entitlement: this._copilotTooltipEntitlementValue(premium),
                percent: this._copilotTooltipPercent(premium),
                reset: copilotPayload.quota_reset_date || "-"
            }));
        } else if (this._copilotError) {
            pieces.push("");
            pieces.push(this._t("tooltipErrorLine", {
                name: this._t("tooltipCopilotPrefix"),
                error: this._singleLine(this._copilotError)
            }));
        } else {
            pieces.push("");
            pieces.push(this._t("tooltipWaitingLine", { name: this._t("tooltipCopilotPrefix") }));
        }

        return pieces.join("\n");
    }

    _renderStatusFooter(codexPayload, copilotPayload, credits) {
        if (this._refreshing) {
            this._setStatusBadge("loading", this._t("syncing"));
            this._statusLabel.set_text(this._t("refreshingStatus"));
            this._hintLabel.set_text(this._t("clickRefreshHint"));
            return;
        }

        let errors = [];
        if (this._codexError) {
            errors.push("Codex: " + this._singleLine(this._codexError));
        }
        if (this.enableCopilot && this._copilotError) {
            errors.push("Copilot: " + this._singleLine(this._copilotError));
        }

        if (errors.length > 0) {
            this._setStatusBadge("error", this._t("error"));
            this._statusLabel.set_text(this._t("refreshFailed", { error: errors.join(" | ") }));
            this._hintLabel.set_text(this._t("lastSnapshotHint"));
            return;
        }

        if (!codexPayload && !copilotPayload) {
            this._setStatusBadge("loading", this._t("loading"));
            this._statusLabel.set_text(this._t("waitingFirstSuccessful"));
            this._hintLabel.set_text(this._t("openPanelHint"));
            return;
        }

        this._setStatusBadge("muted", codexPayload && typeof codexPayload.updated_at === "number"
            ? this._formatUpdatedTime(codexPayload.updated_at)
            : this._t("live"));
        this._statusLabel.set_text(codexPayload ? this._buildAccountStatusLine(codexPayload, credits) : this._t("openPanelHint"));
        this._hintLabel.set_text(this.enableCopilot ? this._t("panelLabelHint") : this._t("openPanelHint"));
    }

    _buildAccountStatusLine(codexPayload, credits) {
        let account = codexPayload.account || {};
        let parts = [account.email || this._t("signedIn")];
        let creditsLine = this._formatCreditsLine(credits);
        if (creditsLine !== null) {
            parts.push(creditsLine);
        }
        return parts.join(" | ");
    }

    _buildAccountLabel(codexPayload, copilotPayload) {
        if (codexPayload && codexPayload.account && codexPayload.account.email) {
            return codexPayload.account.email;
        }

        if (this._codexError && !this._lastCodexPayload) {
            return this._t("unableToLoad");
        }

        return this._t("connecting");
    }

    _buildContextLabel(rateLimit) {
        let interval = this.refreshIntervalMinutes;
        if (rateLimit && rateLimit.limit_id) {
            return this._t("autoRefreshEvery", { value: interval }) + " | " + rateLimit.limit_id;
        }

        return this._t("autoRefreshEvery", { value: interval });
    }

    _setPanelCopilotIndicator(copilotPayload) {
        if (!this.enableCopilot) {
            this._panelCopilotContainer.visible = false;
            this._panelCopilotBox.visible = false;
            this._panelCopilotValue.set_text("");
            return;
        }

        this._panelCopilotContainer.visible = true;
        this._panelCopilotBox.visible = true;
        this._panelCopilotIconBin.visible = true;
        this._panelCopilotIcon.visible = true;
        this._panelCopilotValue.visible = true;
        this._panelCopilotValue.set_text(this._buildCopilotPanelFragment(copilotPayload) || "--");
        this.actor.queue_relayout();
    }

    _buildCopilotStatValue(copilotPayload) {
        if (!this.enableCopilot) {
            return this._t("disabledShort");
        }

        if (!copilotPayload) {
            return this._copilotError && !this._lastCopilotPayload ? this._t("errLabel") : "--";
        }

        let premium = this._getCopilotSnapshot(copilotPayload, "premium_interactions");
        return premium ? this._copilotQuotaShortValue(premium) : "--";
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

        if (credits.balance === null || typeof credits.balance === "undefined") {
            return null;
        }

        return this._t("creditsValue", { value: credits.balance || "0" });
    }

    _buildCreditsStatValue(credits) {
        if (!credits) {
            return "--";
        }

        if (credits.unlimited) {
            return this._t("quotaUnlimitedShort");
        }

        if (typeof credits.balance === "number") {
            return this._formatNumberCompact(credits.balance);
        }

        return "--";
    }

    _buildUpdatedAgeText(timestamp) {
        if (typeof timestamp !== "number") {
            return "";
        }

        return this._formatUpdatedTime(timestamp);
    }

    _setMenuLoadingState() {
        this._primaryMeter.setState(this._buildWindowState(null, "primary"));
        this._secondaryMeter.setState(this._buildWindowState(null, "secondary"));
        this._copilotCard.setState(this._buildCopilotCardState(null));
        this._accountLabel.set_text(this._t("connecting"));
        this._contextLabel.set_text(this._t("preparingSnapshot"));
        this._planValue.set_text("--");
        this._creditsValue.set_text("--");
        this._statusLabel.set_text(this._t("waitingFirstSuccessful"));
        this._hintLabel.set_text(this._t("openPanelHint"));
    }

    _setStatusBadge(state, text) {
        this._statusBadge.set_text(text);
        this._statusBadge.remove_style_class_name("codex-status-live");
        this._statusBadge.remove_style_class_name("codex-status-loading");
        this._statusBadge.remove_style_class_name("codex-status-error");
        this._statusBadge.remove_style_class_name("codex-status-muted");
        this._statusBadge.add_style_class_name("codex-status-" + state);
    }

    _getCopilotSnapshot(payload, quotaId) {
        if (!payload || !payload.snapshots) {
            return null;
        }

        return payload.snapshots[quotaId] || null;
    }

    _copilotQuotaShortValue(snapshot) {
        if (!snapshot) {
            return "--";
        }

        if (snapshot.unlimited) {
            return this._t("quotaUnlimitedShort");
        }

        if (typeof snapshot.remaining === "number" && typeof snapshot.entitlement === "number" && snapshot.entitlement > 0) {
            return String(Math.round((snapshot.remaining / snapshot.entitlement) * 100)) + "%";
        }

        if (typeof snapshot.percent_remaining === "number") {
            return String(Math.round(snapshot.percent_remaining)) + "%";
        }

        return "--";
    }

    _copilotQuotaLongValue(snapshot) {
        if (!snapshot) {
            return this._t("copilotUnavailable");
        }

        if (snapshot.unlimited) {
            return this._t("quotaUnlimitedShort");
        }

        if (typeof snapshot.remaining === "number") {
            return this._formatCount(snapshot.remaining);
        }

        return this._t("copilotUnavailable");
    }

    _copilotTooltipQuotaValue(snapshot) {
        if (!snapshot) {
            return this._t("copilotUnavailable");
        }

        if (snapshot.unlimited) {
            return this._t("quotaUnlimitedShort");
        }

        if (typeof snapshot.remaining === "number") {
            return this._formatCount(snapshot.remaining);
        }

        return this._t("copilotUnavailable");
    }

    _copilotTooltipRemainingValue(snapshot) {
        if (!snapshot) {
            return "-";
        }

        if (snapshot.unlimited) {
            return this._t("quotaUnlimitedShort");
        }

        return this._formatCount(snapshot.remaining);
    }

    _copilotTooltipEntitlementValue(snapshot) {
        if (!snapshot) {
            return "-";
        }

        if (snapshot.unlimited) {
            return this._t("quotaUnlimitedShort");
        }

        return typeof snapshot.entitlement === "number" ? this._formatCount(snapshot.entitlement) : "-";
    }

    _copilotTooltipPercent(snapshot) {
        if (!snapshot) {
            return "-";
        }

        if (snapshot.unlimited) {
            return "100";
        }

        if (typeof snapshot.remaining === "number" && typeof snapshot.entitlement === "number" && snapshot.entitlement > 0) {
            return String(Math.round((snapshot.remaining / snapshot.entitlement) * 100));
        }

        if (typeof snapshot.percent_remaining === "number") {
            return String(Math.round(snapshot.percent_remaining));
        }

        return "-";
    }

    _copilotProgressFraction(snapshot) {
        if (!snapshot) {
            return null;
        }

        if (snapshot.unlimited) {
            return 1;
        }

        if (typeof snapshot.percent_remaining === "number") {
            return Math.max(0, Math.min(1, snapshot.percent_remaining / 100));
        }

        if (typeof snapshot.remaining === "number" && typeof snapshot.entitlement === "number" && snapshot.entitlement > 0) {
            return Math.max(0, Math.min(1, snapshot.remaining / snapshot.entitlement));
        }

        return null;
    }

    _extractCopilotLogin(payload) {
        return payload && payload.user ? payload.user.login || null : null;
    }

    _extractCopilotPlan(payload) {
        return payload && payload.user ? payload.user.copilot_plan || null : null;
    }

    _extractCopilotRequestValue(snapshot) {
        if (!snapshot) {
            return "-";
        }

        if (snapshot.unlimited) {
            return this._t("copilotRequests", {
                value: this._t("quotaUnlimitedShort")
            });
        }

        if (typeof snapshot.remaining === "number" && typeof snapshot.entitlement === "number") {
            return this._t("copilotRequests", {
                value: this._formatCount(snapshot.remaining) + "/" + this._formatCount(snapshot.entitlement)
            });
        }

        return this._t("copilotRequests", { value: this._copilotQuotaShortValue(snapshot) });
    }

    _formatPlanName(value) {
        let text = String(value || "").trim();
        if (text === "") {
            return "--";
        }

        return text.split(/[_\-\s]+/).map(part => {
            if (part.length === 0) {
                return part;
            }

            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join(" ");
    }

    _latestUpdatedAt(codexPayload, copilotPayload) {
        let timestamps = [];

        if (codexPayload && typeof codexPayload.updated_at === "number") {
            timestamps.push(codexPayload.updated_at);
        }
        if (copilotPayload && typeof copilotPayload.updated_at === "number") {
            timestamps.push(copilotPayload.updated_at);
        }

        if (timestamps.length === 0) {
            return null;
        }

        return Math.max.apply(null, timestamps);
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

    _formatPercentValue(value) {
        if (typeof value !== "number") {
            return "-";
        }

        return String(Math.round(value * 10) / 10).replace(/\.0$/, "");
    }

    _formatCount(value) {
        if (typeof value !== "number") {
            return "-";
        }

        return String(Math.floor(value));
    }

    _formatNumberCompact(value) {
        if (typeof value !== "number") {
            return "--";
        }

        return String(Math.round(value * 10) / 10).replace(/\.0$/, "");
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
        let unixTimestamp = timestamp;
        if (typeof unixTimestamp === "string") {
            let parsed = Date.parse(unixTimestamp);
            if (!isNaN(parsed)) {
                unixTimestamp = Math.floor(parsed / 1000);
            }
        }

        if (typeof unixTimestamp !== "number") {
            return "-";
        }

        let dateTime = GLib.DateTime.new_from_unix_local(unixTimestamp);
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

        this._activeSubprocesses.forEach(subprocess => {
            if (subprocess && subprocess.cancellable) {
                subprocess.cancellable.cancel();
            }
        });
        this._activeSubprocesses = [];

        if (this.settings) {
            this.settings.finalize();
            this.settings = null;
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new CodexUsageApplet(metadata, orientation, panelHeight, instanceId);
}
