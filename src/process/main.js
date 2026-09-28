import { app } from "electron";
import electronUpdater from "electron-updater";
import { MainWindow } from "./window.js";
import { hasSettingsConfigAccess } from "./settings.js";
import { removeAbandonedPartitions } from "./instance.js";

await import("./instance.js");
await import("./file.js");
await import("./navigation.js");
await import("./diagnostics.js");

app.whenReady().then(() => {
	electronUpdater.autoUpdater.checkForUpdatesAndNotify();
	MainWindow.create();

	// Removes partitions only when settings are confirmed read. It ensures partitions of registered instances can be excluded from the removal.
	if (hasSettingsConfigAccess) {
		removeAbandonedPartitions();
	}
});
