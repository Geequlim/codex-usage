const St = imports.gi.St;

const {
    createWrappedLabel,
    applySecondaryTextStyle,
} = require("./lib/ui");
const Formatters = require("./lib/shared/formatters");
const { createTranslator } = require("./providers/deepseek/strings");

function currentData(state) {
    return state.data || state.lastSuccessfulData || null;
}

function positiveAmount(balance) {
    let amount = Number(balance && balance.total_balance ? balance.total_balance : 0);
    return isNaN(amount) ? 0 : amount;
}

function currencySymbol(currency) {
    if (currency === "CNY") {
        return "¥";
    }
    if (currency === "USD") {
        return "$";
    }
    return "";
}

function activeBalance(data) {
    let balances = data && Array.isArray(data.balance_infos) ? data.balance_infos : [];
    let nonZero = balances.find(item => positiveAmount(item) > 0);
    return nonZero || balances[0] || null;
}

function formatMoney(value) {
    let numeric = Number(value);
    if (isNaN(numeric)) {
        return "0";
    }

    return numeric.toFixed(2);
}

function buildSummaryCard(data, t) {
    let card = new St.BoxLayout({
        vertical: true,
        style_class: "codex-hero-card",
        x_expand: true
    });

    let balance = activeBalance(data);
    let header = new St.BoxLayout({
        style_class: "codex-hero-header",
        x_expand: true
    });
    header.add_actor(new St.Label({
        text: t("title"),
        style_class: "codex-hero-title",
        x_expand: true
    }));
    header.add_actor(new St.Label({
        text: data && data.is_available ? t("available") : t("unavailable"),
        style_class: "codex-status-badge codex-status-muted"
    }));
    card.add_actor(header);

    if (!balance) {
        card.add_actor(applySecondaryTextStyle(createWrappedLabel(t("noBalance"), "codex-context-label")));
        return card;
    }

    let total = new St.Label({
        text: t("totalLine", {
            symbol: currencySymbol(balance.currency),
            amount: formatMoney(balance.total_balance)
        }),
        style_class: "codex-account-label"
    });
    card.add_actor(total);

    card.add_actor(applySecondaryTextStyle(createWrappedLabel(t("balanceLine", {
        currency: balance.currency || "-",
        total: formatMoney(balance.total_balance),
        granted: formatMoney(balance.granted_balance),
        toppedUp: formatMoney(balance.topped_up_balance)
    }), "codex-context-label")));

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
                        iconSize: 20,
                        priority: 75
                    }, {
                        type: "text",
                        text: state.error ? t("errLabel") : "--",
                        priority: 80
                    }];
                }

                let balance = activeBalance(data);
                if (!balance) {
                    return [{
                        type: "icon",
                        iconPath: runtime.assets.resolve("panelIndicator"),
                        iconSize: 20,
                        priority: 75
                    }, {
                        type: "text",
                        text: "--",
                        priority: 80
                    }];
                }

                return [{
                    type: "icon",
                    iconPath: runtime.assets.resolve("panelIndicator"),
                    iconSize: 20,
                    priority: 75
                }, {
                    type: "text",
                    text: t("totalLine", {
                        symbol: currencySymbol(balance.currency),
                        amount: formatMoney(balance.total_balance)
                    }),
                    priority: 80
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

                let balances = data.balance_infos || [];
                let lines = balances.length === 0
                    ? [t("noBalance")]
                    : balances.map(balance => t("balanceLine", {
                        currency: balance.currency || "-",
                        total: formatMoney(balance.total_balance),
                        granted: formatMoney(balance.granted_balance),
                        toppedUp: formatMoney(balance.topped_up_balance)
                    }));

                lines.unshift(data.is_available ? t("available") : t("unavailable"));

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

                container.add_actor(buildSummaryCard(data, t));
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
