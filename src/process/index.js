import { app } from "electron";
import electronUpdater from "electron-updater";
import { MainWindow } from "./window.js";

await import("./instance.js");
await import("./navigation.js");

app.enableSandbox();

// https://www.electronjs.org/docs/latest/breaking-changes#changed-gtk-4-is-default-when-running-gnome
// https://github.com/electron/electron/issues/46538
app.commandLine.appendSwitch("gtk-version", "3");

app.whenReady().then(() => {
	electronUpdater.autoUpdater.checkForUpdatesAndNotify();
	MainWindow.create();
});
