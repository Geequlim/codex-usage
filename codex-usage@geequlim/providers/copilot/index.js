const Formatters = require("./lib/shared/formatters");
const { SummaryCard } = require("./lib/ui");
const { createTranslator } = require("./providers/copilot/strings");

function getSnapshot(payload, quotaId) {
    if (!payload || !payload.snapshots) {
        return null;
    }

    return payload.snapshots[quotaId] || null;
}

function quotaShortValue(snapshot, t) {
    if (!snapshot) {
        return "--";
    }

    if (snapshot.unlimited) {
        return t("quotaUnlimitedShort");
    }

    if (typeof snapshot.remaining === "number" && typeof snapshot.entitlement === "number" && snapshot.entitlement > 0) {
        return String(Math.round((snapshot.remaining / snapshot.entitlement) * 100)) + "%";
    }

    if (typeof snapshot.percent_remaining === "number") {
        return String(Math.round(snapshot.percent_remaining)) + "%";
    }

    return "--";
}

function tooltipQuotaValue(snapshot, t) {
    if (!snapshot) {
        return t("copilotUnavailable");
    }

    if (snapshot.unlimited) {
        return t("quotaUnlimitedShort");
    }

    return typeof snapshot.remaining === "number" ? Formatters.formatCount(snapshot.remaining) : t("copilotUnavailable");
}

function tooltipEntitlementValue(snapshot, t) {
    if (!snapshot) {
        return "-";
    }

    if (snapshot.unlimited) {
        return t("quotaUnlimitedShort");
    }

    return typeof snapshot.entitlement === "number" ? Formatters.formatCount(snapshot.entitlement) : "-";
}

function tooltipPercent(snapshot) {
    if (!snapshot) {
        return "-";
    }

    if (snapshot.unlimited) {
        return "100";
    }

    if (typeof snapshot.remaining === "number" && typeof snapshot.entitlement === "number" && snapshot.entitlement > 0) {
        return String(Math.round((snapshot.remaining / snapshot.entitlement) * 100));
    }

    if (typeof snapshot.percent_remaining === "number") {
        return String(Math.round(snapshot.percent_remaining));
    }

    return "-";
}

function progressFraction(snapshot) {
    if (!snapshot) {
        return null;
    }

    if (snapshot.unlimited) {
        return 1;
    }

    if (typeof snapshot.percent_remaining === "number") {
        return Math.max(0, Math.min(1, snapshot.percent_remaining / 100));
    }

    if (typeof snapshot.remaining === "number" && typeof snapshot.entitlement === "number" && snapshot.entitlement > 0) {
        return Math.max(0, Math.min(1, snapshot.remaining / snapshot.entitlement));
    }

    return null;
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
                let contributions = [{
                    type: "icon",
                    iconPath: runtime.assets.resolve("panelIndicator"),
                    iconSize: 20,
                    priority: 10
                }];

                if (!data) {
                    contributions.push({
                        type: "text",
                        text: state.error ? t("errLabel") : "--",
                        priority: 20
                    });
                    return contributions;
                }

                contributions.push({
                    type: "text",
                    text: quotaShortValue(getSnapshot(data, "premium_interactions"), t),
                    priority: 20
                });
                return contributions;
            },

            getTooltipSections(state) {
                let data = currentData(state);
                if (!data) {
                    return [{
                        title: t("copilotTitle"),
                        lines: [state.error ? t("refreshFailed", { error: Formatters.singleLine(state.error) }) : t("copilotWaiting")]
                    }];
                }

                let premium = getSnapshot(data, "premium_interactions");
                let reset = (data.quota_reset_date || "-") === "-" ? "" : data.quota_reset_date;
                let summary = t("copilotTooltipSummary", {
                    remaining: tooltipQuotaValue(premium, t),
                    entitlement: tooltipEntitlementValue(premium, t),
                    percent: tooltipPercent(premium),
                    reset: reset
                });
                if (reset === "") {
                    summary = summary.replace(/\s*\|\s*Reset\s*$/, "").replace(/\s*\|\s*重置\s*$/, "");
                }
                return [{
                    title: t("copilotTitle"),
                    lines: [
                        t("copilotSubtitle", {
                            login: (data.user || {}).login || t("unknown"),
                            plan: Formatters.formatPlanName((data.user || {}).copilot_plan || t("unknown"))
                        }),
                        t("copilotTooltipDetails", {
                            chat: tooltipQuotaValue(getSnapshot(data, "chat"), t),
                            completions: tooltipQuotaValue(getSnapshot(data, "completions"), t),
                            plan: Formatters.formatPlanName((data.user || {}).copilot_plan || t("unknown")),
                            updated: Formatters.formatUpdatedTime(data.updated_at, t)
                        }),
                        summary
                    ]
                }];
            },

            renderPopup(container, state) {
                let card = new SummaryCard(
                    t("copilotTitle"),
                    runtime.assets.resolve("panelIndicator")
                );
                let data = currentData(state);

                if (!data) {
                    card.setState({
                        title: t("copilotTitle"),
                        valueText: state.error ? t("errLabel") : "--",
                        subtitleText: "",
                        progressFraction: null,
                        detailText: state.error
                            ? t("refreshFailed", { error: Formatters.singleLine(state.error) })
                            : t("copilotWaiting"),
                        metaText: "",
                        footerText: ""
                    });
                    container.add_actor(card.actor);
                    return;
                }

                let premium = getSnapshot(data, "premium_interactions");
                card.setState({
                    title: t("copilotTitle"),
                    valueText: quotaShortValue(premium, t),
                    subtitleText: t("copilotSubtitle", {
                        login: (data.user || {}).login || t("unknown"),
                        plan: Formatters.formatPlanName((data.user || {}).copilot_plan || t("unknown"))
                    }),
                    progressFraction: progressFraction(premium),
                    detailText: t("copilotUsageLine", {
                        requests: premium && premium.unlimited
                            ? t("quotaUnlimitedShort")
                            : tooltipQuotaValue(premium, t) + "/" + tooltipEntitlementValue(premium, t),
                        chat: tooltipQuotaValue(getSnapshot(data, "chat"), t),
                        completions: tooltipQuotaValue(getSnapshot(data, "completions"), t)
                    }),
                    metaText: "",
                    footerText: (() => {
                        let reset = Formatters.formatAbsoluteTime(data.quota_reset_date_utc || data.quota_reset_date || null);
                        return reset === "-" ? "" : t("resetsAt", { time: reset });
                    })()
                });
                container.add_actor(card.actor);
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
