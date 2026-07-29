const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

function PopupHost(applet) {
    this._init(applet);
}

PopupHost.prototype = {
    _init: function(applet) {
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

        this.providersBox = new St.BoxLayout({
            vertical: true,
            style_class: "codex-provider-stack",
            x_expand: true
        });
        this.root.add_actor(this.providersBox);
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
