const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Util = imports.misc.util;

function createExecHelper(activeSubprocesses) {
    return {
        runCommand(argv) {
            return new Promise((resolve, reject) => {
                let subprocess;

                try {
                    subprocess = Util.spawnCommandLineAsyncIO(
                        null,
                        (stdout, stderr, exitCode) => {
                            let index = activeSubprocesses.indexOf(subprocess);
                            if (index !== -1) {
                                activeSubprocesses.splice(index, 1);
                            }

                            if (exitCode !== 0) {
                                reject(new Error(stderr || stdout || "command failed"));
                                return;
                            }

                            resolve({
                                stdout: stdout,
                                stderr: stderr,
                                exitCode: exitCode,
                            });
                        },
                        { argv: argv }
                    );
                } catch (error) {
                    reject(error);
                    return;
                }

                activeSubprocesses.push(subprocess);
            });
        },

        runJsonCommand(argv) {
            return this.runCommand(argv).then(result => JSON.parse(result.stdout));
        }
    };
}

function createProviderRuntime(descriptor, appContext) {
    let exec = createExecHelper(appContext.activeSubprocesses);
    let context = {
        applet: appContext.applet,
        descriptor: descriptor,
        providerId: descriptor.id,
        providerDir: descriptor.providerDir,
        manifest: descriptor,
        language: appContext.language,
        hostT: appContext.translate,
        ui: appContext.ui,
        notify(title, body) {
            if (body) {
                Main.notify(title, body);
                return;
            }

            Main.notify(title);
        },
        logger(message, error) {
            appContext.logger(message, error);
        },
        exec: {
            runCommand(argv) {
                return exec.runCommand(argv);
            },
            runJsonCommand(argv) {
                return exec.runJsonCommand(argv);
            },
            runJsonHelper(relativePath, argv) {
                let command = ["python3", GLib.build_filenamev([descriptor.providerDir, relativePath || "fetch_usage.py"])];
                if (Array.isArray(argv)) {
                    command = command.concat(argv);
                }

                return exec.runJsonCommand(command);
            }
        },
        assets: {
            resolve(keyOrPath) {
                if (descriptor.assets && Object.prototype.hasOwnProperty.call(descriptor.assets, keyOrPath)) {
                    return GLib.build_filenamev([descriptor.providerDir, descriptor.assets[keyOrPath]]);
                }

                return GLib.build_filenamev([descriptor.providerDir, keyOrPath]);
            },
            fileIcon(keyOrPath) {
                let path = this.resolve(keyOrPath);
                return new Gio.FileIcon({ file: Gio.file_new_for_path(path) });
            }
        },
        settings: {
            isEnabled() {
                return appContext.settingsStore.isProviderEnabled(descriptor.id, descriptor.enabledByDefault);
            },
            setEnabled(enabled) {
                appContext.settingsStore.setProviderEnabled(descriptor.id, enabled);
            },
            get(key, fallbackValue) {
                return appContext.settingsStore.getProviderSetting(descriptor.id, key, fallbackValue);
            },
            set(key, value) {
                appContext.settingsStore.setProviderSetting(descriptor.id, key, value);
            }
        }
    };

    let plugin = descriptor.module.create(context);

    return {
        descriptor: descriptor,
        context: context,
        plugin: plugin,
    };
}

module.exports = {
    createProviderRuntime,
};
