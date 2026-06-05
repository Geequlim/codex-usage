const ByteArray = imports.byteArray;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

function readJsonFile(path) {
    let [ok, contents] = GLib.file_get_contents(path);
    if (!ok) {
        throw new Error("Unable to read " + path);
    }

    return JSON.parse(ByteArray.toString(contents));
}

function findManifestPath(providerDir) {
    let candidates = [
        GLib.build_filenamev([providerDir, "manifest.json"]),
        GLib.build_filenamev([providerDir, "provider.json"]),
    ];

    for (let index = 0; index < candidates.length; index++) {
        if (GLib.file_test(candidates[index], GLib.FileTest.EXISTS)) {
            return candidates[index];
        }
    }

    return null;
}

function resolveProviderAsset(providerDir, assets, key) {
    if (!assets || typeof assets !== "object") {
        return null;
    }

    let value = assets[key];
    if (!value) {
        return null;
    }

    return GLib.build_filenamev([providerDir, String(value)]);
}

function normalizeDescriptor(providerDir, manifestPath, raw, source) {
    let directoryName = GLib.path_get_basename(providerDir);
    let entry = String(raw.entry || "index.js").trim();
    let entryPath = GLib.build_filenamev([providerDir, entry]);
    let moduleExports = require(entryPath);

    if (!moduleExports || typeof moduleExports.create !== "function") {
        throw new Error("Provider entry must export create(): " + entryPath);
    }

    return {
        id: String(raw.id || directoryName),
        name: String(raw.name || raw.title || directoryName),
        source: source,
        version: String(raw.version || "1.0.0"),
        order: typeof raw.order === "number" ? raw.order : 1000,
        enabledByDefault: raw.enabledByDefault !== false && raw.defaultEnabled !== false,
        providerDir: providerDir,
        manifestPath: manifestPath,
        module: moduleExports,
        assets: raw.assets || {
            panelSymbolic: raw.symbolicIcon || null,
            panelLegacy: raw.legacyIcon || null,
            panelIndicator: raw.panelIcon || null,
        },
        capabilities: raw.capabilities || {
            panel: true,
            tooltip: true,
            popup: true,
            actions: true,
            settings: true,
        },
    };
}

function scanProviderRoot(providersRootPath, source, logger) {
    let root = Gio.file_new_for_path(providersRootPath);
    if (!root.query_exists(null)) {
        return [];
    }

    let descriptors = [];
    let enumerator = null;

    try {
        enumerator = root.enumerate_children(
            "standard::name,standard::type",
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            if (info.get_file_type() !== Gio.FileType.DIRECTORY) {
                continue;
            }

            let providerDir = GLib.build_filenamev([providersRootPath, info.get_name()]);
            let manifestPath = findManifestPath(providerDir);
            if (manifestPath === null) {
                continue;
            }

            try {
                let descriptor = normalizeDescriptor(providerDir, manifestPath, readJsonFile(manifestPath), source);
                descriptor.assetPaths = {
                    panelSymbolic: resolveProviderAsset(providerDir, descriptor.assets, "panelSymbolic"),
                    panelLegacy: resolveProviderAsset(providerDir, descriptor.assets, "panelLegacy"),
                    panelIndicator: resolveProviderAsset(providerDir, descriptor.assets, "panelIndicator"),
                };
                descriptors.push(descriptor);
            } catch (error) {
                if (logger) {
                    logger("Failed to load provider " + providerDir, error);
                }
            }
        }
    } finally {
        if (enumerator !== null) {
            enumerator.close(null);
        }
    }

    descriptors.sort((left, right) => {
        if (left.order !== right.order) {
            return left.order - right.order;
        }

        return left.id.localeCompare(right.id);
    });

    return descriptors;
}

function loadProviders(providerRoots, logger) {
    let roots = Array.isArray(providerRoots) ? providerRoots : [providerRoots];
    let byId = {};

    roots.forEach(root => {
        let descriptors = scanProviderRoot(root.path, root.source, logger);
        descriptors.forEach(descriptor => {
            let existing = byId[descriptor.id];
            if (existing && logger) {
                logger(
                    "Provider override: " + descriptor.id + " (" + descriptor.source + " overrides " + existing.source + ")",
                    new Error(existing.providerDir + " -> " + descriptor.providerDir)
                );
            }

            byId[descriptor.id] = descriptor;
        });
    });

    let merged = Object.keys(byId).map(providerId => byId[providerId]);
    merged.sort((left, right) => {
        if (left.order !== right.order) {
            return left.order - right.order;
        }

        return left.id.localeCompare(right.id);
    });

    return merged;
}

module.exports = {
    loadProviders,
};
