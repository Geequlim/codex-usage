const Gio = imports.gi.Gio;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

const SUMMARY_ACCENT = { red: 168, green: 85, blue: 247 };
const WARNING_ACCENT = { red: 246, green: 211, blue: 45 };
const DANGER_ACCENT = { red: 224, green: 27, blue: 36 };

function drawRoundedRect(cr, x, y, width, height, radius) {
    let safeRadius = Math.max(0, Math.min(radius, Math.floor(Math.min(width, height) / 2)));

    cr.newSubPath();
    cr.arc(x + width - safeRadius, y + safeRadius, safeRadius, -Math.PI / 2, 0);
    cr.arc(x + width - safeRadius, y + height - safeRadius, safeRadius, 0, Math.PI / 2);
    cr.arc(x + safeRadius, y + height - safeRadius, safeRadius, Math.PI / 2, Math.PI);
    cr.arc(x + safeRadius, y + safeRadius, safeRadius, Math.PI, 1.5 * Math.PI);
    cr.closePath();
}

function setSourceColor(cr, color, alpha) {
    cr.setSourceRGBA(color.red / 255, color.green / 255, color.blue / 255, alpha);
}

function progressFillColor(fraction, accentColor) {
    if (fraction > 0.5) {
        return accentColor;
    }
    if (fraction >= 0.2) {
        return WARNING_ACCENT;
    }

    return DANGER_ACCENT;
}

function createWrappedLabel(text, styleClass) {
    let label = new St.Label({
        text: text,
        style_class: styleClass
    });
    label.clutter_text.line_wrap = true;
    label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
    return label;
}

function applySecondaryTextStyle(label) {
    label.add_style_class_name("popup-inactive-menu-item");
    label.add_style_pseudo_class("insensitive");
    return label;
}

function createProviderTitle(iconPath, title, labelStyleClass) {
    let actor = new St.BoxLayout({
        style_class: "codex-provider-title",
        x_expand: true,
        y_align: St.Align.MIDDLE
    });

    if (iconPath) {
        let icon = new St.Icon({
            gicon: new Gio.FileIcon({ file: Gio.file_new_for_path(iconPath) }),
            icon_type: St.IconType.SYMBOLIC,
            icon_size: 18,
            style_class: "codex-provider-title-icon",
            y_align: St.Align.MIDDLE
        });
        let iconBin = new St.Bin({
            style_class: "codex-provider-title-icon-bin",
            y_align: St.Align.MIDDLE
        });
        iconBin.set_fill(false, false);
        iconBin.set_alignment(St.Align.MIDDLE, St.Align.MIDDLE);
        iconBin.set_child(icon);
        actor.add_actor(iconBin);
    }

    let label = new St.Label({
        text: title,
        style_class: labelStyleClass,
        x_expand: true,
        y_align: St.Align.MIDDLE
    });
    actor.add_actor(label);

    return { actor, label };
}

function UsageMeter(title, accentColor) {
    this._init(title, accentColor);
}

UsageMeter.prototype = {
    _init: function(title, accentColor) {
        this._accentColor = accentColor;
        this._fraction = 0;
        this._hasData = false;

        this.actor = new St.BoxLayout({
            vertical: true,
            style_class: "codex-window-card",
            x_expand: true
        });

        let header = new St.BoxLayout({
            style_class: "codex-card-header",
            x_expand: true
        });

        this._titleLabel = new St.Label({
            text: title,
            style_class: "codex-card-title",
            x_expand: true
        });
        this._percentLabel = new St.Label({
            text: "--",
            style_class: "codex-card-percent"
        });

        header.add_actor(this._titleLabel);
        header.add_actor(this._percentLabel);
        this.actor.add_actor(header);

        this._bar = new St.DrawingArea({
            style_class: "codex-progress-bar",
            x_expand: true,
            height: 14
        });
        this._bar.connect("repaint", this._onRepaint.bind(this));
        this.actor.add_actor(this._bar);

        this._detailLabel = applySecondaryTextStyle(createWrappedLabel("", "codex-card-detail"));
        this.actor.add_actor(this._detailLabel);

        this._resetLabel = applySecondaryTextStyle(new St.Label({
            text: "",
            style_class: "codex-card-reset"
        }));
        this.actor.add_actor(this._resetLabel);
    },

    setState: function(state) {
        this._titleLabel.set_text(state.title);

        if (state.remaining === null) {
            this._hasData = false;
            this._fraction = 0;
            this._percentLabel.set_text("--");
        } else {
            this._hasData = true;
            this._fraction = Math.max(0, Math.min(1, state.remaining / 100));
            this._percentLabel.set_text(String(state.remaining) + "%");
        }

        this._detailLabel.set_text(state.detailText);
        this._resetLabel.set_text(state.resetText);
        this._detailLabel.visible = Boolean(state.detailText);
        this._resetLabel.visible = Boolean(state.resetText);
        this._bar.queue_repaint();
    },

    _onRepaint: function(area) {
        let cr = area.get_context();
        let [width, height] = area.get_surface_size();
        let radius = Math.floor(height / 2);

        drawRoundedRect(cr, 0, 0, width, height, radius);
        setSourceColor(cr, { red: 255, green: 255, blue: 255 }, this._hasData ? 0.09 : 0.05);
        cr.fill();

        if (this._fraction > 0) {
            let fillWidth = Math.max(radius * 2, Math.round(width * this._fraction));
            drawRoundedRect(cr, 0, 0, fillWidth, height, radius);
            setSourceColor(cr, progressFillColor(this._fraction, this._accentColor), this._hasData ? 0.95 : 0.4);
            cr.fill();
        }

        cr.$dispose();
    }
};

function SummaryCard(title, iconPath) {
    this._init(title, iconPath);
}

SummaryCard.prototype = {
    _init: function(title, iconPath) {
        this._accentColor = SUMMARY_ACCENT;
        this._fraction = 0;
        this._hasData = false;

        this.actor = new St.BoxLayout({
            vertical: true,
            style_class: "codex-window-card codex-copilot-card",
            x_expand: true
        });

        let header = new St.BoxLayout({
            style_class: "codex-card-header",
            x_expand: true
        });

        let headerTextBox = new St.BoxLayout({
            vertical: true,
            style_class: "codex-card-header-copy",
            x_expand: true
        });

        let providerTitle = createProviderTitle(
            iconPath,
            title,
            "codex-hero-title codex-copilot-title"
        );
        this._titleLabel = providerTitle.label;
        this._valueLabel = new St.Label({
            text: "--",
            style_class: "codex-summary-value"
        });

        this._subtitleLabel = applySecondaryTextStyle(createWrappedLabel("", "codex-card-subtitle"));
        headerTextBox.add_actor(providerTitle.actor);
        headerTextBox.add_actor(this._subtitleLabel);
        header.add_actor(headerTextBox);
        header.add_actor(this._valueLabel);
        this.actor.add_actor(header);

        this._bar = new St.DrawingArea({
            style_class: "codex-progress-bar",
            x_expand: true,
            height: 14
        });
        this._bar.connect("repaint", this._onRepaint.bind(this));
        this.actor.add_actor(this._bar);

        this._detailLabel = applySecondaryTextStyle(createWrappedLabel("", "codex-card-detail"));
        this.actor.add_actor(this._detailLabel);

        this._metaRow = new St.BoxLayout({
            style_class: "codex-card-meta-row",
            x_expand: true
        });
        this._footerLabel = applySecondaryTextStyle(new St.Label({
            text: "",
            style_class: "codex-card-reset",
            x_expand: true,
            y_align: St.Align.MIDDLE
        }));
        this._metaSpacer = new St.Widget({ x_expand: true });
        this._metaLabel = applySecondaryTextStyle(new St.Label({
            text: "",
            style_class: "codex-status-badge codex-status-muted codex-card-meta-label",
            x_align: St.Align.END
        }));
        this._metaRow.add_actor(this._footerLabel);
        this._metaRow.add_actor(this._metaSpacer);
        this._metaRow.add_actor(this._metaLabel);
        this.actor.add_actor(this._metaRow);
    },

    setState: function(state) {
        this._titleLabel.set_text(state.title);
        this._valueLabel.set_text(state.valueText);
        this._subtitleLabel.set_text(state.subtitleText || "");
        this._subtitleLabel.visible = Boolean(state.subtitleText);

        if (typeof state.progressFraction === "number") {
            this._fraction = Math.max(0, Math.min(1, state.progressFraction));
            this._hasData = true;
        } else {
            this._fraction = 0;
            this._hasData = false;
        }

        this._detailLabel.set_text(state.detailText);
        this._metaLabel.set_text(state.metaText);
        this._footerLabel.set_text(state.footerText);
        this._metaLabel.visible = state.metaText !== "";
        this._footerLabel.visible = state.footerText !== "";
        this._metaRow.visible = state.metaText !== "" || state.footerText !== "";
        this._bar.queue_repaint();
    },

    _onRepaint: function(area) {
        let cr = area.get_context();
        let [width, height] = area.get_surface_size();
        let radius = Math.floor(height / 2);

        drawRoundedRect(cr, 0, 0, width, height, radius);
        setSourceColor(cr, { red: 255, green: 255, blue: 255 }, this._hasData ? 0.09 : 0.05);
        cr.fill();

        if (this._fraction > 0) {
            let fillWidth = Math.max(radius * 2, Math.round(width * this._fraction));
            drawRoundedRect(cr, 0, 0, fillWidth, height, radius);
            setSourceColor(cr, progressFillColor(this._fraction, this._accentColor), this._hasData ? 0.95 : 0.4);
            cr.fill();
        }

        cr.$dispose();
    }
};

module.exports = {
    createWrappedLabel,
    applySecondaryTextStyle,
    createProviderTitle,
    UsageMeter,
    SummaryCard,
};
