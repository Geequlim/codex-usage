const St = imports.gi.St;

const PRIMARY_ACCENT = { red: 16, green: 185, blue: 129 };
const SECONDARY_ACCENT = { red: 59, green: 130, blue: 246 };
const {
    createWrappedLabel,
    applySecondaryTextStyle,
    UsageMeter,
} = require("./lib/ui");
const Formatters = require("./lib/shared/formatters");
const { createTranslator } = require("./providers/codex/strings");

function usedPercent(windowData) {
    if (!windowData || typeof windowData.used_percent !== "number") {
        return null;
    }

    return Math.max(0, Math.min(100, windowData.used_percent));
}

function remainingPercent(windowData) {
    let used = usedPercent(windowData);
    if (used === null) {
        return null;
    }

    return Math.max(0, 100 - used);
}

function displayPercent(value) {
    if (value === null) {
        return "--";
    }

    return String(value) + "%";
}

function formatWindowTooltipLine(windowData, fallbackName, t) {
    let name = shortWindowName(windowData ? windowData.window_duration_mins : null, fallbackName, t);
    let left = displayPercent(remainingPercent(windowData || null));
    let used = displayPercent(usedPercent(windowData || null));
    let time = Formatters.formatAbsoluteTime((windowData || {}).resets_at);

    if (time === "-") {
        return name + " | " + left + " left | " + used + " used";
    }

    return t("windowLine", {
        name: name,
        left: left,
        used: used,
        time: time
    });
}

function windowName(minutes, fallbackName, t) {
    if (minutes === 300) {
        return t("known5hWindow");
    }

    if (minutes === 10080) {
        return t("known7dWindow");
    }

    if (typeof minutes === "number" && minutes > 0) {
        if (minutes % 1440 === 0) {
            return t("dayWindow", { value: minutes / 1440 });
        }

        if (minutes % 60 === 0) {
            return t("hourWindow", { value: minutes / 60 });
        }

        return t("minuteWindow", { value: minutes });
    }

    if (fallbackName === "primary") {
        return t("primaryWindow");
    }

    if (fallbackName === "secondary") {
        return t("secondaryWindow");
    }

    return t("window");
}

function shortWindowName(minutes, fallbackName, t) {
    if (minutes === 300) {
        return t("short5h");
    }

    if (minutes === 10080) {
        return t("short7d");
    }

    if (typeof minutes === "number" && minutes > 0) {
        if (minutes % 1440 === 0) {
            return t("shortDay", { value: minutes / 1440 });
        }

        if (minutes % 60 === 0) {
            return t("shortHour", { value: minutes / 60 });
        }

        return t("shortMinute", { value: minutes });
    }

    return fallbackName === "secondary" ? t("short7d") : t("short5h");
}

function formatCreditsLine(credits, t) {
    if (!credits) {
        return null;
    }

    if (credits.unlimited) {
        return t("creditsUnlimited");
    }

    if (credits.balance === null || typeof credits.balance === "undefined" || Number(credits.balance) === 0) {
        return null;
    }

    return t("creditsValue", { value: credits.balance || "0" });
}

function buildWindowState(windowData, fallbackName, t) {
    let remaining = remainingPercent(windowData);
    let resetText = windowData && windowData.resets_at
        ? t("resetsAt", { time: Formatters.formatAbsoluteTime(windowData.resets_at) })
        : "";
    if (resetText.endsWith("-")) {
        resetText = "";
    }

    return {
        title: windowName(windowData ? windowData.window_duration_mins : null, fallbackName, t),
        remaining: remaining,
        detailText: "",
        resetText: resetText
    };
}

function buildSummaryCard(data, runtime, t) {
    let rateLimit = data ? data.rate_limit || {} : {};
    let credits = rateLimit.credits || null;
    let planName = Formatters.formatPlanName(rateLimit.plan_type || ((data.account || {}).plan_type) || t("unknown"));

    let card = new St.BoxLayout({
        vertical: true,
        style_class: "codex-hero-card",
        x_expand: true
    });

    let header = new St.BoxLayout({
        style_class: "codex-hero-header",
        x_expand: true
    });
    header.add_actor(new St.Label({
        text: runtime.descriptor.name,
        style_class: "codex-hero-title",
        x_expand: true
    }));
    header.add_actor(new St.Label({
        text: planName,
        style_class: "codex-status-badge codex-status-muted"
    }));
    card.add_actor(header);

    let meta = [];
    let creditsLine = formatCreditsLine(credits, t);
    if (creditsLine !== null) {
        meta.push(creditsLine);
    }
    if (meta.length > 0) {
        card.add_actor(applySecondaryTextStyle(createWrappedLabel(meta.join(" | "), "codex-context-label")));
    }

    return card;
}

function currentData(state) {
    return state.data || state.lastSuccessfulData || null;
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
                        type: "text",
                        text: state.error ? t("errLabel") : "--",
                        priority: 10
                    }];
                }

                let rateLimit = data.rate_limit || {};
                let primary = rateLimit.primary || null;
                let secondary = rateLimit.secondary || null;
                let items = [];
                let showPrimary = runtime.settings.get("showPrimaryWindow", false);

                if (showPrimary) {
                    items.push({
                        type: "text",
                        text: shortWindowName(primary ? primary.window_duration_mins : 300, "primary", t) + " " + displayPercent(remainingPercent(primary)),
                        priority: 10
                    });
                    items.push({ type: "separator", text: "·", priority: 20 });
                }

                items.push({
                    type: "text",
                    text: displayPercent(remainingPercent(secondary)),
                    priority: 30
                });

                return items;
            },

            getTooltipSections(state) {
                let data = currentData(state);
                if (!data) {
                    return [{
                        title: runtime.descriptor.name,
                        lines: [state.error ? t("refreshFailed", { error: Formatters.singleLine(state.error) }) : t("waitingFirstSuccessful")]
                    }];
                }

                let account = data.account || {};
                let rateLimit = data.rate_limit || {};
                let planName = Formatters.formatPlanName(rateLimit.plan_type || account.plan_type || t("unknown"));
                let lines = [
                    t("updatedTitle") + " " + Formatters.formatUpdatedTime(data.updated_at, t),
                ];
                lines.push(formatWindowTooltipLine(rateLimit.primary || null, "primary", t));
                lines.push(formatWindowTooltipLine(rateLimit.secondary || null, "secondary", t));
                let creditsLine = formatCreditsLine(rateLimit.credits || null, t);
                if (creditsLine !== null) {
                    lines.push(creditsLine);
                }

                return [{
                    title: runtime.descriptor.name + " | " + planName,
                    lines: lines
                }];
            },

            renderPopup(container, state) {
                let data = currentData(state);
                if (!data) {
                    container.add_actor(applySecondaryTextStyle(createWrappedLabel(
                        state.error ? t("refreshFailed", { error: Formatters.singleLine(state.error) }) : t("waitingFirstSuccessful"),
                        "codex-card-detail"
                    )));
                    return;
                }

                let card = buildSummaryCard(data, runtime, t);

                let rateLimit = data.rate_limit || {};
                let primaryMeter = new UsageMeter(windowName((rateLimit.primary || {}).window_duration_mins, "primary", t), PRIMARY_ACCENT);
                primaryMeter.setState(buildWindowState(rateLimit.primary || null, "primary", t));
                primaryMeter.actor.remove_style_class_name("codex-window-card");
                primaryMeter.actor.add_style_class_name("codex-inline-meter");
                card.add_actor(primaryMeter.actor);

                let secondaryMeter = new UsageMeter(windowName((rateLimit.secondary || {}).window_duration_mins, "secondary", t), SECONDARY_ACCENT);
                secondaryMeter.setState(buildWindowState(rateLimit.secondary || null, "secondary", t));
                secondaryMeter.actor.remove_style_class_name("codex-window-card");
                secondaryMeter.actor.add_style_class_name("codex-inline-meter");
                card.add_actor(secondaryMeter.actor);

                container.add_actor(card);
            },

            getActions() {
                return [];
            },

            getSettingsSchema() {
                return {
                    showPrimaryWindow: {
                        type: "boolean",
                        defaultValue: false
                    }
                };
            },

            dispose() {}
        };
    }
};
