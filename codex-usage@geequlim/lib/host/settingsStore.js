const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;

function SettingsStore(appName) {
    this._init(appName);
}

SettingsStore.prototype = {
    _init: function(appName) {
        this._appName = appName || "usage-deck";
        this._configDir = GLib.build_filenamev([GLib.get_user_config_dir(), this._appName]);
        this._providersPath = GLib.build_filenamev([this._configDir, "providers.json"]);
        this._data = this._load();
    },

    _load: function() {
        if (!GLib.file_test(this._providersPath, GLib.FileTest.EXISTS)) {
            return { providers: {} };
        }

        try {
            let [ok, contents] = GLib.file_get_contents(this._providersPath);
            if (!ok) {
                return { providers: {} };
            }

            let parsed = JSON.parse(ByteArray.toString(contents));
            if (!parsed || typeof parsed !== "object") {
                return { providers: {} };
            }

            if (!parsed.providers || typeof parsed.providers !== "object") {
                parsed.providers = {};
            }

            return parsed;
        } catch (error) {
            return { providers: {} };
        }
    },

    _save: function() {
        GLib.mkdir_with_parents(this._configDir, 0o755);
        GLib.file_set_contents(this._providersPath, JSON.stringify(this._data, null, 2));
    },

    _providerSettings: function(providerId) {
        if (!this._data.providers[providerId] || typeof this._data.providers[providerId] !== "object") {
            this._data.providers[providerId] = {};
        }

        return this._data.providers[providerId];
    },

    isProviderEnabled: function(providerId, enabledByDefault) {
        let settings = this._providerSettings(providerId);
        if (typeof settings.enabled === "boolean") {
            return settings.enabled;
        }

        return enabledByDefault !== false;
    },

    setProviderEnabled: function(providerId, enabled) {
        let settings = this._providerSettings(providerId);
        settings.enabled = Boolean(enabled);
        this._save();
    },

    getProviderSetting: function(providerId, key, fallbackValue) {
        let settings = this._providerSettings(providerId);
        return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallbackValue;
    },

    setProviderSetting: function(providerId, key, value) {
        let settings = this._providerSettings(providerId);
        settings[key] = value;
        this._save();
    }
};

module.exports = {
    SettingsStore,
};
