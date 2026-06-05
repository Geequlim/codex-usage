const DICTIONARIES = {
    en: {
        title: "DeepSeek Balance",
        waiting: "Waiting for DeepSeek data",
        refreshFailed: "Refresh failed: {error}",
        errLabel: "ERR",
        available: "Available",
        unavailable: "Unavailable",
        totalLine: "{symbol}{amount}",
        balanceLine: "{currency} total {total} | granted {granted} | topped up {toppedUp}",
        updatedLine: "Updated {time}",
        noBalance: "No balance data"
    },
    zh: {
        title: "DeepSeek 余额",
        waiting: "等待 DeepSeek 数据",
        refreshFailed: "刷新失败：{error}",
        errLabel: "错误",
        available: "可用",
        unavailable: "不可用",
        totalLine: "{symbol}{amount}",
        balanceLine: "{currency} 总额 {total} | 赠送 {granted} | 充值 {toppedUp}",
        updatedLine: "更新 {time}",
        noBalance: "暂无余额数据"
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
