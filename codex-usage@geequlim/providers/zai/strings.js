const DICTIONARIES = {
    en: {
        errLabel: "ERR",
        title: "GLM Coding Plan",
        waiting: "Waiting for z.ai data",
        refreshFailed: "Refresh failed: {error}",
        quotaUnlimitedShort: "∞",
        panelValue: "GLM {value}",
        usageOnly: "Used {percent}%",
        short5h: "5h",
        short7d: "7d",
        window5h: "5h window",
        window7d: "7d window",
        titleWithLevel: "{title} | {level}",
        levelLine: "Plan {level}",
        tokensLine: "Tokens {used}/{total} | Used {percent}%",
        resetLine: "Reset {time}",
        updatedLine: "Updated {time}",
        unavailable: "Unavailable",
        unknown: "unknown",
        quotaLine: "{type} | Used {used} / {total} | {percent}%",
        quotaPercentLine: "{type} | Used {percent}%",
        noReset: "No reset time",
        usedLeftDetail: "Used {used} | Left {left}",
        resetsDash: "Resets -"
    },
    zh: {
        errLabel: "错误",
        title: "GLM Coding Plan",
        waiting: "等待 z.ai 数据",
        refreshFailed: "刷新失败：{error}",
        quotaUnlimitedShort: "∞",
        panelValue: "GLM {value}",
        usageOnly: "已用 {percent}%",
        short5h: "5时",
        short7d: "7天",
        window5h: "5 小时窗口",
        window7d: "7 天窗口",
        titleWithLevel: "{title} | {level}",
        levelLine: "套餐 {level}",
        tokensLine: "Token {used}/{total} | 已用 {percent}%",
        resetLine: "重置 {time}",
        updatedLine: "更新 {time}",
        unavailable: "不可用",
        unknown: "未知",
        quotaLine: "{type} | 已用 {used} / {total} | {percent}%",
        quotaPercentLine: "{type} | 已用 {percent}%",
        noReset: "无重置时间",
        usedLeftDetail: "已用 {used} | 剩余 {left}",
        resetsDash: "重置时间 -"
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
