import { app } from "electron";
import electronUpdater from "electron-updater";
import { MainWindow } from "./window.js";

await import("./instance.js");
await import("./navigation.js");

app.enableSandbox();

app.whenReady().then(() => {
	electronUpdater.autoUpdater.checkForUpdatesAndNotify();
	MainWindow.create();
});
