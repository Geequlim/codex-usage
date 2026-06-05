const DICTIONARIES = {
    en: {
        errLabel: "ERR",
        waitingFirstSuccessful: "Waiting for the first successful sync...",
        refreshFailed: "Refresh failed: {error}",
        known5hWindow: "5h window",
        known7dWindow: "7d window",
        dayWindow: "{value}d window",
        hourWindow: "{value}h window",
        minuteWindow: "{value}m window",
        primaryWindow: "primary",
        secondaryWindow: "secondary",
        window: "window",
        short5h: "5h",
        short7d: "7d",
        shortDay: "{value}d",
        shortHour: "{value}h",
        shortMinute: "{value}m",
        creditsUnlimited: "Credits: unlimited",
        creditsValue: "Credits: {value}",
        usageDataUnavailable: "Usage data unavailable",
        usedLeftDetail: "Used {used} | Left {left}",
        resetsDash: "Resets -",
        resetsAt: "Reset {time}",
        signedIn: "Signed in",
        planTitle: "Plan",
        updatedTitle: "Updated",
        unknown: "unknown",
        windowLine: "{name} | {left} left | {used} used | reset {time}",
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
        waitingFirstSuccessful: "等待第一次成功同步...",
        refreshFailed: "刷新失败：{error}",
        known5hWindow: "5 小时窗口",
        known7dWindow: "7 天窗口",
        dayWindow: "{value} 天窗口",
        hourWindow: "{value} 小时窗口",
        minuteWindow: "{value} 分钟窗口",
        primaryWindow: "主窗口",
        secondaryWindow: "次窗口",
        window: "窗口",
        short5h: "5时",
        short7d: "7天",
        shortDay: "{value}天",
        shortHour: "{value}时",
        shortMinute: "{value}分",
        creditsUnlimited: "点数：无限",
        creditsValue: "点数：{value}",
        usageDataUnavailable: "暂无额度数据",
        usedLeftDetail: "已用 {used} | 剩余 {left}",
        resetsDash: "重置时间 -",
        resetsAt: "重置 {time}",
        signedIn: "已登录",
        planTitle: "套餐",
        updatedTitle: "更新",
        unknown: "未知",
        windowLine: "{name} | 剩余 {left} | 已用 {used} | 重置 {time}",
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
