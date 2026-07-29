const St = imports.gi.St;

const PRIMARY_ACCENT = { red: 16, green: 185, blue: 129 };
const SECONDARY_ACCENT = { red: 59, green: 130, blue: 246 };
const Formatters = require("./lib/shared/formatters");
const {
    createWrappedLabel,
    applySecondaryTextStyle,
    createProviderTitle,
    UsageMeter,
} = require("./lib/ui");
const { createTranslator } = require("./providers/zai/strings");

function currentData(state) {
    return state.data || state.lastSuccessfulData || null;
}

function findLimit(data, type) {
    if (!data || !Array.isArray(data.limits)) {
        return null;
    }

    return data.limits.find(limit => limit && limit.type === type) || null;
}

function formatUsageValue(limit) {
    if (typeof limit.current_value === "number") {
        return Formatters.formatCount(limit.current_value);
    }

    if (typeof limit.percentage === "number") {
        return String(Math.round(limit.percentage)) + "%";
    }

    if (typeof limit.number === "number" && typeof limit.unit === "number") {
        return String(limit.number) + "/" + String(limit.unit);
    }

    return "-";
}

function formatTotalValue(limit) {
    if (typeof limit.usage === "number") {
        return Formatters.formatCount(limit.usage);
    }

    if (typeof limit.unit === "number") {
        return String(limit.unit);
    }

    return "-";
}

function formatPercent(limit) {
    return typeof limit.percentage === "number" ? String(Math.round(limit.percentage)) : "-";
}

function panelPercent(limit) {
    if (!limit || typeof limit.percentage !== "number") {
        return "--";
    }

    return String(Math.max(0, 100 - Math.round(limit.percentage))) + "%";
}

function progressFraction(limit) {
    if (!limit || typeof limit.percentage !== "number") {
        return null;
    }

    return Math.max(0, Math.min(1, (100 - limit.percentage) / 100));
}

function limitTitle(limit) {
    return limit && limit.type ? String(limit.type) : "LIMIT";
}

function remainingPercent(limit) {
    if (!limit || typeof limit.percentage !== "number") {
        return null;
    }

    return Math.max(0, 100 - Math.round(limit.percentage));
}

function displayPercent(value) {
    if (value === null || typeof value === "undefined") {
        return "--";
    }

    return String(value) + "%";
}

function classifyWindow(limit) {
    if (!limit) {
        return null;
    }

    if (limit.type === "TOKENS_LIMIT" && limit.unit === 3 && limit.number === 5) {
        return "5h";
    }

    if (limit.type === "TOKENS_LIMIT" && limit.unit === 6 && limit.number === 1) {
        return "7d";
    }

    let type = String(limit.type || "").toUpperCase();
    if (type.indexOf("WEEK") !== -1 || type.indexOf("7D") !== -1) {
        return "7d";
    }

    if (type === "TOKENS_LIMIT") {
        return "5h";
    }

    if (typeof limit.next_reset_time === "number") {
        let delta = limit.next_reset_time - Date.now();
        if (delta > 0) {
            let hours = delta / (1000 * 60 * 60);
            if (hours <= 12) {
                return "5h";
            }
            if (hours >= 24 * 3) {
                return "7d";
            }
        }
    }

    return null;
}

function quotaWindows(data) {
    let matched = [];
    (data && Array.isArray(data.limits) ? data.limits : []).forEach(limit => {
        let kind = classifyWindow(limit);
        if (kind !== null) {
            matched.push({ kind, limit });
        }
    });

    let primary = matched.find(item => item.kind === "5h") || null;
    let secondary = matched.find(item => item.kind === "7d") || null;

    return { primary, secondary };
}

function shortWindowName(kind, t) {
    return kind === "7d" ? t("short7d") : t("short5h");
}

function windowName(kind, t) {
    return kind === "7d" ? t("window7d") : t("window5h");
}

function buildWindowState(limit, kind, t) {
    let remaining = remainingPercent(limit);
    let resetText = "";
    if (limit && limit.next_reset_time) {
        let formatted = Formatters.formatAbsoluteTime(Math.floor(limit.next_reset_time / 1000));
        if (formatted !== "-") {
            resetText = t("resetLine", { time: formatted });
        }
    }

    return {
        title: windowName(kind, t),
        remaining: remaining,
        detailText: "",
        resetText: resetText
    };
}

function buildSummaryCard(data, runtime, t) {
    let card = new St.BoxLayout({
        vertical: true,
        style_class: "codex-hero-card",
        x_expand: true
    });

    let header = new St.BoxLayout({
        style_class: "codex-hero-header",
        x_expand: true
    });
    header.add_actor(createProviderTitle(
        runtime.assets.resolve("panelIndicator"),
        t("title"),
        "codex-hero-title"
    ).actor);
    let level = data && data.level ? Formatters.formatPlanName(String(data.level)) : t("unknown");
    header.add_actor(new St.Label({
        text: level,
        style_class: "codex-status-badge codex-status-muted"
    }));
    card.add_actor(header);

    return card;
}

module.exports = {
    create(runtime) {
        const t = createTranslator(runtime.language);

        function levelText(data) {
            let level = data && data.level ? String(data.level) : t("unknown");
            return t("levelLine", { level: Formatters.formatPlanName(level) });
        }

        return {
            collect() {
                return runtime.exec.runJsonHelper("fetch_usage.py");
            },

            getPanelContributions(state) {
                let data = currentData(state);
                let windows = quotaWindows(data);

                if (!data) {
                    return [{
                        type: "icon",
                        iconPath: runtime.assets.resolve("panelIndicator"),
                        priority: 35
                    }, {
                        type: "text",
                        text: state.error ? t("errLabel") : "--",
                        priority: 40
                    }];
                }

                let items = [{
                    type: "icon",
                    iconPath: runtime.assets.resolve("panelIndicator"),
                    priority: 35
                }];
                if (windows.secondary) {
                    items.push({
                        type: "text",
                        text: displayPercent(remainingPercent(windows.secondary.limit)),
                        priority: 60
                    });
                }

                if (items.length === 1) {
                    let tokensLimit = findLimit(data, "TOKENS_LIMIT");
                    items.push({
                        type: "text",
                        text: t("panelValue", { value: panelPercent(tokensLimit) }),
                        priority: 40
                    });
                }

                return items;
            },

            getTooltipSections(state) {
                let data = currentData(state);
                if (!data) {
                    return [{
                        title: t("title"),
                        lines: [state.error ? t("refreshFailed", { error: Formatters.singleLine(state.error) }) : t("waiting")]
                    }];
                }

                let lines = [];
                let level = data && data.level ? Formatters.formatPlanName(String(data.level)) : t("unknown");
                let windows = quotaWindows(data);
                [windows.primary, windows.secondary].filter(Boolean).forEach(window => {
                    let limit = window.limit;
                    lines.push(t("quotaLine", {
                        type: windowName(window.kind, t),
                        used: formatUsageValue(limit),
                        total: formatTotalValue(limit),
                        percent: formatPercent(limit)
                    }));
                    if (limit.next_reset_time) {
                        let formatted = Formatters.formatAbsoluteTime(Math.floor(limit.next_reset_time / 1000));
                        if (formatted !== "-") {
                            lines.push(t("resetLine", { time: formatted }));
                        }
                    }
                });

                if (lines.length === 0) {
                    (data.limits || []).forEach(limit => {
                        lines.push(t("quotaLine", {
                            type: limitTitle(limit),
                            used: formatUsageValue(limit),
                            total: formatTotalValue(limit),
                            percent: formatPercent(limit)
                        }));
                    });
                }
                return [{
                    title: t("titleWithLevel", {
                        title: t("title"),
                        level: level
                    }),
                    lines: lines
                }];
            },

            renderPopup(container, state) {
                let data = currentData(state);

                if (!data) {
                    container.add_actor(applySecondaryTextStyle(createWrappedLabel(
                        state.error ? t("refreshFailed", { error: Formatters.singleLine(state.error) }) : t("waiting"),
                        "codex-card-detail"
                    )));
                    return;
                }

                let windows = quotaWindows(data);
                let tokensLimit = windows.primary ? windows.primary.limit : (findLimit(data, "TOKENS_LIMIT") || (data.limits || [])[0] || null);
                let card = buildSummaryCard(data, runtime, t);

                let primaryMeter = new UsageMeter(windowName("5h", t), PRIMARY_ACCENT);
                primaryMeter.setState(buildWindowState(windows.primary ? windows.primary.limit : tokensLimit, "5h", t));
                primaryMeter.actor.remove_style_class_name("codex-window-card");
                primaryMeter.actor.add_style_class_name("codex-inline-meter");
                card.add_actor(primaryMeter.actor);

                if (windows.secondary) {
                    let secondaryMeter = new UsageMeter(windowName("7d", t), SECONDARY_ACCENT);
                    secondaryMeter.setState(buildWindowState(windows.secondary.limit, "7d", t));
                    secondaryMeter.actor.remove_style_class_name("codex-window-card");
                    secondaryMeter.actor.add_style_class_name("codex-inline-meter");
                    card.add_actor(secondaryMeter.actor);
                }

                container.add_actor(card);
            },

            getActions() {
                return [];
            },

            getSettingsSchema() {
                return {};
            },

            dispose() {}
        };
    }
};
