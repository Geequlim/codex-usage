const Gio = imports.gi.Gio;
const St = imports.gi.St;

function PanelHost(applet) {
    this._init(applet);
}

PanelHost.prototype = {
    _init: function(applet) {
        this._applet = applet;
        this._box = new St.BoxLayout({
            style_class: "codex-panel-copilot-box",
            y_expand: true,
            y_align: St.Align.MIDDLE,
        });
        this._container = new St.Bin({
            style_class: "codex-panel-copilot-container",
            x_expand: false,
            y_expand: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE,
            reactive: false,
            track_hover: false,
            visible: true,
        });
        this._container.set_child(this._box);
        this._applet.actor.insert_child_at_index(this._container, 2);
    },

    _clear: function() {
        this._box.destroy_all_children();
    },

    render: function(contributions) {
        this._clear();
        this._applet.set_applet_label("");

        contributions.forEach(item => {
            if (!item || !item.type) {
                return;
            }

            if (item.type === "text" || item.type === "badge") {
                this._box.add_actor(new St.Label({
                    text: String(item.text || ""),
                    style_class: item.type === "badge" ? "codex-panel-copilot-value" : "applet-label codex-panel-copilot-value",
                    y_expand: true,
                    y_align: St.Align.MIDDLE,
                }));
                return;
            }

            if (item.type === "separator") {
                this._box.add_actor(new St.Label({
                    text: String(item.text || "·"),
                    style_class: "applet-label codex-panel-copilot-value",
                    y_expand: true,
                    y_align: St.Align.MIDDLE,
                }));
                return;
            }

            if (item.type === "icon" && item.iconPath) {
                let icon = new St.Icon({
                    gicon: new Gio.FileIcon({ file: Gio.file_new_for_path(item.iconPath) }),
                    icon_type: St.IconType.SYMBOLIC,
                    icon_size: item.iconSize || 18,
                    style_class: "system-status-icon codex-panel-copilot-icon",
                    y_expand: true,
                    y_align: St.Align.MIDDLE,
                });
                this._box.add_actor(icon);
            }
        });

        this._container.visible = contributions.length > 0;
        this._applet.actor.queue_relayout();
    }
};

module.exports = {
    PanelHost,
};
