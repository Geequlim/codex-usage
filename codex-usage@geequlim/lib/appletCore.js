const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;

const {
    DEFAULT_REFRESH_INTERVAL_MINUTES,
    MIN_REFRESH_INTERVAL_MINUTES,
    MAX_REFRESH_INTERVAL_MINUTES,
    DEFAULT_INITIAL_REFRESH_DELAY_SECONDS,
    MIN_INITIAL_REFRESH_DELAY_SECONDS,
    MAX_INITIAL_REFRESH_DELAY_SECONDS,
    PROVIDERS_DIRECTORY_NAME,
} = require("./lib/constants");
const {
    detectLanguage,
    translate,
} = require("./lib/host/i18n");
const { SettingsStore } = require("./lib/host/settingsStore");
const { StateStore } = require("./lib/host/stateStore");
const { loadProviders } = require("./lib/host/providerRegistry");
const { createProviderRuntime } = require("./lib/host/providerRuntime");
const { PanelHost } = require("./lib/host/panelHost");
const { PopupHost } = require("./lib/host/popupHost");
const { buildTooltipText } = require("./lib/host/tooltipHost");
const Formatters = require("./lib/shared/formatters");

class UsageDeckApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this.metadata = metadata;
        this.instanceId = instanceId;
        this._language = detectLanguage();
        this._providersRootPath = metadata.path + "/" + PROVIDERS_DIRECTORY_NAME;
        this._userProvidersRootPath = GLib.build_filenamev([GLib.get_user_config_dir(), "usage-deck", "providers"]);
        this._refreshLoopId = 0;
        this._initialRefreshId = 0;
        this._refreshing = false;
        this._activeSubprocesses = [];
        this._settingsStore = new SettingsStore("usage-deck");
        this._stateStore = new StateStore();
        this.refreshIntervalMinutes = DEFAULT_REFRESH_INTERVAL_MINUTES;
        this.initialRefreshDelaySeconds = DEFAULT_INITIAL_REFRESH_DELAY_SECONDS;

        this.settings = new Settings.AppletSettings(this, metadata.uuid, instanceId);
        this.settings.bind("refresh-interval-minutes", "refreshIntervalMinutes", this._onSettingsChanged.bind(this));
        this.settings.bind("initial-refresh-delay-seconds", "initialRefreshDelaySeconds", this._onInitialRefreshDelayChanged.bind(this));

        this._providerDescriptors = loadProviders([
            { path: this._providersRootPath, source: "bundled" },
            { path: this._userProvidersRootPath, source: "user" },
        ], this._logErrorToLookingGlass.bind(this));
        this._providerEntries = this._providerDescriptors.map(descriptor => {
            let enabled = this._settingsStore.isProviderEnabled(descriptor.id, descriptor.enabledByDefault);
            this._stateStore.initializeProvider(descriptor.id, enabled);

            return createProviderRuntime(descriptor, {
                applet: this,
                activeSubprocesses: this._activeSubprocesses,
                settingsStore: this._settingsStore,
                language: this._language,
                translate: this._t.bind(this),
                ui: require("./lib/ui"),
                logger: this._logErrorToLookingGlass.bind(this),
            });
        });

        this.setAllowedLayout(Applet.AllowedLayout.BOTH);
        this.actor.add_style_class_name("codex-usage-applet");
        this.actor.connect("enter-event", this._onAppletEnter.bind(this));

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);
        this.menu.connect("open-state-changed", this._onMenuStateChanged.bind(this));

        this._panelHost = new PanelHost(this);
        this.menu.actor.add_style_class_name("codex-usage-menu");
        this._popupHost = new PopupHost(this);

        this._buildContextMenu();
        this._applySettings();
        this._render();
        this._scheduleInitialRefresh();
    }

    _t(key, replacements) {
        return translate(this._language, key, replacements);
    }

    _enabledEntries() {
        return this._providerEntries.filter(entry => {
            let state = this._stateStore.get(entry.descriptor.id);
            return state && state.enabled;
        });
    }

    _sanitizeRefreshInterval(value) {
        let numeric = parseInt(value, 10);
        if (isNaN(numeric)) {
            return DEFAULT_REFRESH_INTERVAL_MINUTES;
        }

        return Math.max(MIN_REFRESH_INTERVAL_MINUTES, Math.min(MAX_REFRESH_INTERVAL_MINUTES, numeric));
    }

    _sanitizeInitialRefreshDelay(value) {
        let numeric = parseInt(value, 10);
        if (isNaN(numeric)) {
            return DEFAULT_INITIAL_REFRESH_DELAY_SECONDS;
        }

        return Math.max(MIN_INITIAL_REFRESH_DELAY_SECONDS, Math.min(MAX_INITIAL_REFRESH_DELAY_SECONDS, numeric));
    }

    _onSettingsChanged() {
        this._applySettings();
        this._render();
        this._refreshNow();
    }

    _onInitialRefreshDelayChanged() {
        this.initialRefreshDelaySeconds = this._sanitizeInitialRefreshDelay(this.initialRefreshDelaySeconds);

        if (this._initialRefreshId !== 0) {
            this._scheduleInitialRefresh();
        }
    }

    _applySettings() {
        this.refreshIntervalMinutes = this._sanitizeRefreshInterval(this.refreshIntervalMinutes);
        this.initialRefreshDelaySeconds = this._sanitizeInitialRefreshDelay(this.initialRefreshDelaySeconds);
        this._restartRefreshLoop();
    }

    _restartRefreshLoop() {
        if (this._refreshLoopId !== 0) {
            Mainloop.source_remove(this._refreshLoopId);
        }

        this._refreshLoopId = Mainloop.timeout_add_seconds(
            this.refreshIntervalMinutes * 60,
            this._onRefreshTimer.bind(this)
        );
    }

    _scheduleInitialRefresh() {
        if (this._initialRefreshId !== 0) {
            Mainloop.source_remove(this._initialRefreshId);
        }

        this._initialRefreshId = Mainloop.timeout_add_seconds(this.initialRefreshDelaySeconds, () => {
            this._initialRefreshId = 0;
            this._refreshNow();
            return false;
        });
    }

    _onRefreshTimer() {
        this._refreshNow();
        return true;
    }

    _onMenuStateChanged(menu, open) {
        if (open && !this._refreshing) {
            this._render();
        }
    }

    _onAppletEnter() {
        if (!this._refreshing) {
            this._render();
        }
    }

    _buildContextMenu() {
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let refreshItem = new PopupMenu.PopupIconMenuItem(this._t("refreshNow"), "view-refresh-symbolic", imports.gi.St.IconType.SYMBOLIC);
        refreshItem.connect("activate", () => this._refreshNow({ manual: true }));
        this._applet_context_menu.addMenuItem(refreshItem);

        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let providersTitle = new PopupMenu.PopupMenuItem(this._t("providersMenuTitle"));
        providersTitle.actor.reactive = false;
        providersTitle.actor.can_focus = false;
        providersTitle.actor.track_hover = false;
        providersTitle.actor.add_style_pseudo_class("insensitive");
        this._applet_context_menu.addMenuItem(providersTitle);

        this._providerSwitchItems = [];
        this._providerEntries.forEach(entry => {
            let state = this._stateStore.get(entry.descriptor.id);
            let switchItem = new PopupMenu.PopupSwitchMenuItem(entry.descriptor.name, state ? state.enabled : false);
            switchItem.connect("toggled", (item, enabled) => {
                this._setProviderEnabled(entry.descriptor.id, enabled);
            });
            this._providerSwitchItems.push({
                providerId: entry.descriptor.id,
                item: switchItem,
            });
            this._applet_context_menu.addMenuItem(switchItem);
        });
    }

    _setProviderEnabled(providerId, enabled) {
        this._settingsStore.setProviderEnabled(providerId, enabled);
        this._stateStore.setEnabled(providerId, enabled);
        this._syncProviderSwitches();
        this._render();

        if (enabled) {
            this._refreshNow({ manual: true });
        }
    }

    _syncProviderSwitches() {
        if (!this._providerSwitchItems) {
            return;
        }

        this._providerSwitchItems.forEach(entry => {
            let state = this._stateStore.get(entry.providerId);
            if (!state) {
                return;
            }

            entry.item.setToggleState(state.enabled);
        });
    }

    _runProviderCollect(entry) {
        return Promise.resolve()
            .then(() => entry.plugin.collect ? entry.plugin.collect(this._stateStore.get(entry.descriptor.id), entry.context) : null)
            .then(data => ({
                providerId: entry.descriptor.id,
                ok: true,
                data: data,
            }))
            .catch(error => ({
                providerId: entry.descriptor.id,
                ok: false,
                error: error,
            }));
    }

    _refreshNow(options) {
        let manual = Boolean((options || {}).manual);

        if (this._initialRefreshId !== 0) {
            Mainloop.source_remove(this._initialRefreshId);
            this._initialRefreshId = 0;
        }

        if (this._refreshing) {
            if (manual) {
                this._notify(this._t("refreshInProgress"), this._t("refreshInProgressBody"));
            }
            return;
        }

        let entries = this._enabledEntries();
        if (entries.length === 0) {
            this._render();
            return;
        }

        this._refreshing = true;
        entries.forEach(entry => this._stateStore.markLoading(entry.descriptor.id));
        this._render();

        Promise.all(entries.map(entry => this._runProviderCollect(entry)))
            .then(results => {
                results.forEach(result => {
                    if (result.ok) {
                        let data = result.data;
                        let updatedAt = data && typeof data.updated_at === "number" ? data.updated_at : Math.floor(Date.now() / 1000);
                        this._stateStore.markReady(result.providerId, data, updatedAt);
                    } else {
                        this._stateStore.markError(result.providerId, result.error && (result.error.stack || result.error.message) ? (result.error.message || result.error.stack) : String(result.error || "unknown"));
                        this._logErrorToLookingGlass("Provider refresh failed: " + result.providerId, result.error);
                    }
                });
                this._refreshing = false;
                this._render();

                if (manual) {
                    this._notifyManualOutcome(results);
                }
            })
            .catch(error => {
                this._refreshing = false;
                this._logErrorToLookingGlass("Unexpected refresh failure", error);
                this._render();
            });
    }

    _notify(title, body) {
        imports.ui.main.notify(title, body);
    }

    _notifyManualOutcome(results) {
        let failed = results.filter(result => !result.ok);
        if (failed.length === 0) {
                this._notify(
                    this._t("refreshSuccessTitle"),
                    results.map(result => this._t("providerUpdated", { name: result.providerId })).join(" | ")
                );
                return;
            }

            let body = results.map(result => result.ok
            ? this._t("providerUpdated", { name: result.providerId })
            : this._t("providerFailed", {
                name: result.providerId,
                error: Formatters.singleLine(result.error && result.error.message ? result.error.message : result.error)
            })
        ).join(" | ");
        this._notify(results.length === failed.length ? this._t("refreshFailedTitle") : this._t("refreshPartialTitle"), body);
    }

    _setAppletIcon() {
        this.hide_applet_icon();
    }

    _buildTooltip() {
        let sections = [];
        this._enabledEntries().forEach(entry => {
            let state = this._stateStore.get(entry.descriptor.id);
            if (entry.plugin.getTooltipSections) {
                sections = sections.concat(entry.plugin.getTooltipSections(state, entry.context) || []);
            }
        });

        if (sections.length === 0) {
            sections.push({
                title: this._t("appTitle"),
                lines: [this._t("waitingFirstSuccessful")]
            });
        }

        return buildTooltipText(this._t("appTitle"), sections);
    }

    _buildPanelContributions() {
        let contributions = [];
        this._enabledEntries().forEach(entry => {
            let state = this._stateStore.get(entry.descriptor.id);
            let items = entry.plugin.getPanelContributions ? entry.plugin.getPanelContributions(state, entry.context) : [];
            (items || []).forEach(item => {
                contributions.push({
                    providerId: entry.descriptor.id,
                    order: entry.descriptor.order,
                    priority: typeof item.priority === "number" ? item.priority : 100,
                    type: item.type,
                    text: item.text,
                    iconPath: item.iconPath,
                    iconSize: item.iconSize,
                });
            });
        });

        contributions.sort((left, right) => {
            if (left.order !== right.order) {
                return left.order - right.order;
            }
            return left.priority - right.priority;
        });

        return contributions;
    }

    _renderPopup() {
        this._popupHost.renderProviderSections(this._providerEntries, this._stateStore, (entry, section, state) => {
            if (entry.plugin.renderPopup) {
                entry.plugin.renderPopup(section, state, entry.context);
            }
        });
    }

    _render() {
        this._syncProviderSwitches();
        this._setAppletIcon();
        this._panelHost.render(this._buildPanelContributions());
        this.set_applet_tooltip(this._buildTooltip());
        this._renderPopup();
    }

    _logErrorToLookingGlass(context, error) {
        let message = error instanceof Error ? error.stack || error.message : String(error || "unknown");
        let formatted = context + ": " + message;

        if (typeof global !== "undefined" && global.logError) {
            global.logError(new Error(formatted));
            return;
        }

        if (typeof global !== "undefined" && global.log) {
            global.log(formatted);
        }
    }

    on_applet_clicked() {
        this.menu.toggle();
    }

    on_applet_removed_from_panel() {
        if (this._initialRefreshId !== 0) {
            Mainloop.source_remove(this._initialRefreshId);
            this._initialRefreshId = 0;
        }

        if (this._refreshLoopId !== 0) {
            Mainloop.source_remove(this._refreshLoopId);
            this._refreshLoopId = 0;
        }

        this._providerEntries.forEach(entry => {
            if (entry.plugin.dispose) {
                entry.plugin.dispose();
            }
        });

        this._activeSubprocesses.forEach(subprocess => {
            if (subprocess && subprocess.cancellable) {
                subprocess.cancellable.cancel();
            }
        });
        this._activeSubprocesses = [];

        if (this.settings) {
            this.settings.finalize();
            this.settings = null;
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new UsageDeckApplet(metadata, orientation, panelHeight, instanceId);
}

module.exports = {
    UsageDeckApplet,
    main,
};
