const GLib = imports.gi.GLib;

const HOST_TRANSLATIONS = {
    en: {
        appTitle: "Usage Deck",
        loading: "Loading",
        syncing: "Syncing",
        error: "Error",
        refreshNow: "Refresh",
        providersMenuTitle: "Providers",
        refreshingStatus: "Refreshing Usage Deck providers...",
        clickRefreshHint: "Use the context menu to refresh immediately.",
        refreshInProgress: "Refresh already in progress",
        refreshInProgressBody: "Wait for the current refresh to finish.",
        refreshSuccessTitle: "Refresh completed",
        refreshPartialTitle: "Refresh completed with warnings",
        refreshFailedTitle: "Refresh failed",
        waitingFirstSuccessful: "Waiting for the first successful sync...",
        openPanelHint: "Open the panel to inspect provider details.",
        lastSnapshotHint: "The last successful snapshot stays visible until the next good refresh.",
        autoRefreshEvery: "Auto refresh every {value} min",
        disabledShort: "Off",
        providerUpdated: "{name} updated",
        providerFailed: "{name} failed: {error}",
        noProvidersEnabled: "No providers enabled",
        justNow: "just now",
        minuteAgo: "1m ago",
        minutesAgo: "{value}m ago",
        hourAgo: "1h ago",
        hoursAgo: "{value}h ago",
        dayAgo: "1d ago",
        daysAgo: "{value}d ago",
        weekAgo: "1w ago",
        weeksAgo: "{value}w ago"
    },
    zh: {
        appTitle: "Usage Deck",
        loading: "加载中",
        syncing: "同步中",
        error: "错误",
        refreshNow: "刷新",
        providersMenuTitle: "Providers",
        refreshingStatus: "正在刷新 Usage Deck providers...",
        clickRefreshHint: "如需立即同步，请使用右键菜单里的刷新。",
        refreshInProgress: "刷新正在进行中",
        refreshInProgressBody: "请等待当前刷新完成。",
        refreshSuccessTitle: "刷新完成",
        refreshPartialTitle: "刷新完成，但有告警",
        refreshFailedTitle: "刷新失败",
        waitingFirstSuccessful: "等待第一次成功同步...",
        openPanelHint: "打开面板可查看 provider 详情。",
        lastSnapshotHint: "会保留上一次成功的快照，直到下一次刷新成功。",
        autoRefreshEvery: "每 {value} 分钟自动刷新一次",
        disabledShort: "关闭",
        providerUpdated: "{name} 已更新",
        providerFailed: "{name} 失败：{error}",
        noProvidersEnabled: "没有启用的 provider",
        justNow: "刚刚",
        minuteAgo: "1分前",
        minutesAgo: "{value}分前",
        hourAgo: "1小时前",
        hoursAgo: "{value}小时前",
        dayAgo: "1天前",
        daysAgo: "{value}天前",
        weekAgo: "1周前",
        weeksAgo: "{value}周前"
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
    let dictionary = HOST_TRANSLATIONS[language] || HOST_TRANSLATIONS.en;
    let template = dictionary[key] || HOST_TRANSLATIONS.en[key] || key;

    if (!replacements) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, function(match, name) {
        return Object.prototype.hasOwnProperty.call(replacements, name) ? String(replacements[name]) : match;
    });
}

module.exports = {
    HOST_TRANSLATIONS,
    detectLanguage,
    translate,
};
