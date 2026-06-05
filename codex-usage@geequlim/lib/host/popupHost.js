const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

const { createWrappedLabel, applySecondaryTextStyle } = require("./lib/ui");

function PopupHost(applet, translate) {
    this._init(applet, translate);
}

PopupHost.prototype = {
    _init: function(applet, translate) {
        this._t = translate;
        this._applet = applet;

        let shellItem = new PopupMenu.PopupBaseMenuItem({
            style_class: "codex-menu-shell"
        });
        shellItem.actor.reactive = false;
        shellItem.actor.track_hover = false;
        shellItem.actor.can_focus = false;
        shellItem.actor.remove_style_class_name("popup-inactive-menu-item");
        shellItem.actor.remove_style_pseudo_class("insensitive");

        this.root = new St.BoxLayout({
            vertical: true,
            style_class: "codex-menu-root",
            x_expand: true
        });
        shellItem.addActor(this.root, { span: -1, expand: true });
        applet.menu.addMenuItem(shellItem);

        let heroCard = new St.BoxLayout({
            vertical: true,
            style_class: "codex-hero-card",
            x_expand: true
        });
        let heroHeader = new St.BoxLayout({
            style_class: "codex-hero-header",
            x_expand: true
        });
        this._titleLabel = new St.Label({
            text: this._t("appTitle"),
            style_class: "codex-hero-title",
            x_expand: true
        });
        this._statusBadge = new St.Label({
            text: this._t("loading"),
            style_class: "codex-status-badge codex-status-loading"
        });
        heroHeader.add_actor(this._titleLabel);
        heroHeader.add_actor(this._statusBadge);
        heroCard.add_actor(heroHeader);

        this._contextLabel = applySecondaryTextStyle(createWrappedLabel("", "codex-context-label"));
        heroCard.add_actor(this._contextLabel);
        this.root.add_actor(heroCard);

        this.providersBox = new St.BoxLayout({
            vertical: true,
            style_class: "codex-provider-stack",
            x_expand: true
        });
        this.root.add_actor(this.providersBox);
    },

    setStatus: function(state, badgeText, statusText, contextText, hintText) {
        this._statusBadge.set_text(badgeText);
        this._statusBadge.remove_style_class_name("codex-status-live");
        this._statusBadge.remove_style_class_name("codex-status-loading");
        this._statusBadge.remove_style_class_name("codex-status-error");
        this._statusBadge.remove_style_class_name("codex-status-muted");
        this._statusBadge.add_style_class_name("codex-status-" + state);
        this._contextLabel.set_text(contextText || "");
    },

    renderProviderSections: function(entries, stateStore, renderProvider) {
        this.providersBox.destroy_all_children();

        entries.forEach(entry => {
            let state = stateStore.get(entry.descriptor.id);
            if (!state || !state.enabled) {
                return;
            }

            let section = new St.BoxLayout({
                vertical: true,
                style_class: "codex-provider-section",
                x_expand: true
            });
            section.set_x_align(St.Align.FILL);
            section.x_expand = true;

            renderProvider(entry, section, state);
            section.get_children().forEach(child => {
                child.x_expand = true;
                child.set_x_align(St.Align.FILL);
            });
            this.providersBox.add_actor(section);
        });
    }
};

module.exports = {
    PopupHost,
};
