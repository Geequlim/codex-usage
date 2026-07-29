const DICTIONARIES = {
    en: {
        errLabel: "ERR",
        refreshFailed: "Refresh failed: {error}",
        copilotTitle: "GitHub Copilot",
        copilotWaiting: "Waiting for Copilot data",
        copilotUnavailable: "Unavailable",
        quotaUnlimitedShort: "∞",
        copilotPanelValue: "PI {value}",
        copilotSubtitle: "{login} | {plan}",
        copilotTooltipDetails: "Chat {chat} | Completions {completions} | {plan} | Updated {updated}",
        copilotTooltipSummary: "Left {remaining} / {entitlement} ({percent}%) | Reset {reset}",
        copilotUsageLine: "Requests {requests} | Chat {chat} | Completions {completions}",
        resetsAt: "Reset {time}",
        unknown: "unknown",
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
        errLabel: "错误",
        refreshFailed: "刷新失败：{error}",
        copilotTitle: "Github Copilot",
        copilotWaiting: "等待 Copilot 数据",
        copilotUnavailable: "不可用",
        quotaUnlimitedShort: "∞",
        copilotPanelValue: "PI {value}",
        copilotSubtitle: "{login} | {plan}",
        copilotTooltipDetails: "对话 {chat} | 补全 {completions} | {plan} | 更新 {updated}",
        copilotTooltipSummary: "剩余 {remaining} / {entitlement} ({percent}%) | 重置 {reset}",
        copilotUsageLine: "请求 {requests} | 对话 {chat} | 补全 {completions}",
        resetsAt: "重置 {time}",
        unknown: "未知",
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

function translate(language, key, replacements) {
    let dictionary = DICTIONARIES[language] || DICTIONARIES.en;
    let template = dictionary[key] || DICTIONARIES.en[key] || key;

    if (!replacements) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, function(match, name) {
        return Object.prototype.hasOwnProperty.call(replacements, name) ? String(replacements[name]) : match;
    });
}

module.exports = {
    createTranslator(language) {
        return function(key, replacements) {
            return translate(language, key, replacements);
        };
    }
};
