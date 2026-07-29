const St = imports.gi.St;

const PRIMARY_ACCENT = { red: 16, green: 185, blue: 129 };
const SECONDARY_ACCENT = { red: 59, green: 130, blue: 246 };
const SUMMARY_ACCENT = { red: 168, green: 85, blue: 247 };
const {
    createWrappedLabel,
    applySecondaryTextStyle,
    createProviderTitle,
    UsageMeter,
} = require("./lib/ui");
const Formatters = require("./lib/shared/formatters");
const { createTranslator } = require("./providers/opencode-go/strings");

function currentData(state) {
    return state.data || state.lastSuccessfulData || null;
}

function displayPercent(value) {
    if (value === null || typeof value === "undefined") {
        return "--";
    }

    return String(Math.round(value)) + "%";
}

function remainingPercent(windowData) {
    return windowData && typeof windowData.percent_remaining === "number"
        ? windowData.percent_remaining
        : null;
}

function minRemainingPercent(firstWindow, secondWindow) {
    let first = remainingPercent(firstWindow);
    let second = remainingPercent(secondWindow);

    if (first !== null && second !== null) {
        return Math.min(first, second);
    }

    return first !== null ? first : second;
}

function shortWindowName(kind, t) {
    if (kind === "weekly") {
        return t("shortWeekly");
    }
    if (kind === "monthly") {
        return t("shortMonthly");
    }
    return t("shortRolling");
}

function windowName(kind, t) {
    if (kind === "weekly") {
        return t("weeklyTitle");
    }
    if (kind === "monthly") {
        return t("monthlyTitle");
    }
    return t("rollingTitle");
}

function buildWindowState(windowData, kind, t) {
    let remaining = windowData && typeof windowData.percent_remaining === "number"
        ? Math.max(0, Math.round(windowData.percent_remaining))
        : null;
    let used = windowData && typeof windowData.usage_percent === "number"
        ? Math.max(0, Math.round(windowData.usage_percent))
        : null;
    let resetText = "";
    if (windowData && windowData.reset_time_ms) {
        let formatted = Formatters.formatAbsoluteTime(Math.floor(windowData.reset_time_ms / 1000));
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

function buildSummaryCard(runtime, t) {
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
    card.add_actor(header);

    return card;
}

module.exports = {
    create(runtime) {
        const t = createTranslator(runtime.language);

        return {
            collect() {
                return runtime.exec.runJsonHelper("fetch_usage.py");
            },

            getPanelContributions(state) {
                let data = currentData(state);
                if (!data) {
                    return [{
                        type: "icon",
                        iconPath: runtime.assets.resolve("panelIndicator"),
                        priority: 85
                    }, {
                        type: "text",
                        text: state.error ? t("errLabel") : "--",
                        priority: 90
                    }];
                }

                let items = [{
                    type: "icon",
                    iconPath: runtime.assets.resolve("panelIndicator"),
                    priority: 85
                }];
                let weeklyMonthlyRemaining = minRemainingPercent(data.weekly, data.monthly);
                if (weeklyMonthlyRemaining !== null) {
                    items.push({
                        type: "text",
                        text: displayPercent(weeklyMonthlyRemaining),
                        priority: 90
                    });
                    return items;
                }

                if (data.rolling) {
                    items.push({
                        type: "text",
                        text: displayPercent(data.rolling.percent_remaining),
                        priority: 90
                    });
                }

                return items.length > 0 ? items : [{
                    type: "icon",
                    iconPath: runtime.assets.resolve("panelIndicator"),
                    priority: 85
                }, {
                    type: "text",
                    text: "--",
                    priority: 90
                }];
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
                ["rolling", "weekly", "monthly"].forEach(kind => {
                    let windowData = data[kind];
                    if (!windowData) {
                        return;
                    }

                    lines.push(t("usedLeftDetail", {
                        used: displayPercent(windowData.usage_percent),
                        left: displayPercent(windowData.percent_remaining)
                    }).replace("Used", windowName(kind, t) + " | Used"));

                    if (windowData.reset_time_ms) {
                        let formatted = Formatters.formatAbsoluteTime(Math.floor(windowData.reset_time_ms / 1000));
                        if (formatted !== "-") {
                            lines.push(t("resetLine", { time: formatted }));
                        }
                    }
                });

                return [{
                    title: t("title"),
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

                let card = buildSummaryCard(runtime, t);

                if (data.rolling) {
                    let rollingMeter = new UsageMeter(windowName("rolling", t), PRIMARY_ACCENT);
                    rollingMeter.setState(buildWindowState(data.rolling, "rolling", t));
                    rollingMeter.actor.remove_style_class_name("codex-window-card");
                    rollingMeter.actor.add_style_class_name("codex-inline-meter");
                    card.add_actor(rollingMeter.actor);
                }

                if (data.weekly) {
                    let weeklyMeter = new UsageMeter(windowName("weekly", t), SECONDARY_ACCENT);
                    weeklyMeter.setState(buildWindowState(data.weekly, "weekly", t));
                    weeklyMeter.actor.remove_style_class_name("codex-window-card");
                    weeklyMeter.actor.add_style_class_name("codex-inline-meter");
                    card.add_actor(weeklyMeter.actor);
                }

                if (data.monthly) {
                    let monthlyMeter = new UsageMeter(windowName("monthly", t), SUMMARY_ACCENT);
                    monthlyMeter.setState(buildWindowState(data.monthly, "monthly", t));
                    monthlyMeter.actor.remove_style_class_name("codex-window-card");
                    monthlyMeter.actor.add_style_class_name("codex-inline-meter");
                    card.add_actor(monthlyMeter.actor);
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
