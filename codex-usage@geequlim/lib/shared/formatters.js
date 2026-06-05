const GLib = imports.gi.GLib;

const PLAN_NAME_OVERRIDES = {
    prolite: "Pro Lite"
};

function formatPlanName(value) {
    let text = String(value || "").trim();
    if (text === "") {
        return "--";
    }

    let normalized = text.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PLAN_NAME_OVERRIDES, normalized)) {
        return PLAN_NAME_OVERRIDES[normalized];
    }

    return text.split(/[_\-\s]+/).map(part => {
        if (part.length === 0) {
            return part;
        }

        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join(" ");
}

function formatUpdatedTime(timestamp, translate) {
    if (typeof timestamp !== "number") {
        return "-";
    }

    let now = Math.floor(Date.now() / 1000);
    let delta = Math.max(0, now - timestamp);

    if (delta < 45) {
        return translate("justNow");
    }

    if (delta < 3600) {
        let minutes = Math.max(1, Math.round(delta / 60));
        return translate(minutes === 1 ? "minuteAgo" : "minutesAgo", { value: minutes });
    }

    if (delta < 86400) {
        let hours = Math.max(1, Math.round(delta / 3600));
        return translate(hours === 1 ? "hourAgo" : "hoursAgo", { value: hours });
    }

    if (delta < 604800) {
        let days = Math.max(1, Math.round(delta / 86400));
        return translate(days === 1 ? "dayAgo" : "daysAgo", { value: days });
    }

    let weeks = Math.max(1, Math.round(delta / 604800));
    return translate(weeks === 1 ? "weekAgo" : "weeksAgo", { value: weeks });
}

function formatAbsoluteTime(timestamp) {
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

function formatCount(value) {
    if (typeof value !== "number") {
        return "-";
    }

    return String(Math.floor(value));
}

function formatPercentValue(value) {
    if (typeof value !== "number") {
        return "-";
    }

    return String(Math.round(value * 10) / 10).replace(/\.0$/, "");
}

function formatNumberCompact(value) {
    if (typeof value !== "number") {
        return "--";
    }

    return String(Math.round(value * 10) / 10).replace(/\.0$/, "");
}

function singleLine(text) {
    return String(text).replace(/\s+/g, " ").trim();
}

module.exports = {
    formatPlanName,
    formatUpdatedTime,
    formatAbsoluteTime,
    formatCount,
    formatPercentValue,
    formatNumberCompact,
    singleLine,
};
