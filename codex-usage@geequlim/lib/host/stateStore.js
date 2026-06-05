function StateStore() {
    this._states = {};
}

StateStore.prototype = {
    initializeProvider: function(providerId, enabled) {
        this._states[providerId] = {
            id: providerId,
            enabled: Boolean(enabled),
            phase: "idle",
            data: null,
            error: null,
            updatedAt: null,
            lastSuccessfulData: null,
        };
    },

    list: function() {
        return Object.keys(this._states).map(providerId => this._states[providerId]);
    },

    get: function(providerId) {
        return this._states[providerId] || null;
    },

    setEnabled: function(providerId, enabled) {
        let state = this.get(providerId);
        if (!state) {
            return;
        }

        state.enabled = Boolean(enabled);
    },

    markLoading: function(providerId) {
        let state = this.get(providerId);
        if (!state) {
            return;
        }

        state.phase = "loading";
        state.error = null;
    },

    markReady: function(providerId, data, updatedAt) {
        let state = this.get(providerId);
        if (!state) {
            return;
        }

        state.phase = "ready";
        state.data = data;
        state.error = null;
        state.updatedAt = typeof updatedAt === "number" ? updatedAt : Math.floor(Date.now() / 1000);
        state.lastSuccessfulData = data;
    },

    markError: function(providerId, error) {
        let state = this.get(providerId);
        if (!state) {
            return;
        }

        state.phase = "error";
        state.error = String(error || "unknown");
        state.data = null;
    },

    latestUpdatedAt: function(enabledProviderIds) {
        let timestamps = enabledProviderIds.map(providerId => this.get(providerId))
            .filter(Boolean)
            .map(state => state.updatedAt)
            .filter(updatedAt => typeof updatedAt === "number");

        if (timestamps.length === 0) {
            return null;
        }

        return Math.max.apply(null, timestamps);
    }
};

module.exports = {
    StateStore,
};
