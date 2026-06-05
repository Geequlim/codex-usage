const DICTIONARIES = {
    en: {
        title: "OpenCode Go",
        waiting: "Waiting for OpenCode Go data",
        refreshFailed: "Refresh failed: {error}",
        errLabel: "ERR",
        shortRolling: "5h",
        shortWeekly: "7d",
        shortMonthly: "30d",
        rollingTitle: "5h window",
        weeklyTitle: "7d window",
        monthlyTitle: "30d window",
        usedLeftDetail: "Used {used} | Left {left}",
        resetLine: "Reset {time}",
        resetsDash: "Resets -"
    },
    zh: {
        title: "OpenCode Go",
        waiting: "等待 OpenCode Go 数据",
        refreshFailed: "刷新失败：{error}",
        errLabel: "错误",
        shortRolling: "5时",
        shortWeekly: "7天",
        shortMonthly: "30天",
        rollingTitle: "5 小时窗口",
        weeklyTitle: "7 天窗口",
        monthlyTitle: "30 天窗口",
        usedLeftDetail: "已用 {used} | 剩余 {left}",
        resetLine: "重置 {time}",
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
