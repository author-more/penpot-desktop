import { app } from "electron";

app.enableSandbox();

// https://www.electronjs.org/docs/latest/breaking-changes#changed-gtk-4-is-default-when-running-gnome
// https://github.com/electron/electron/issues/46538
app.commandLine.appendSwitch("gtk-version", "3");

const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) {
	app.quit();
} else {
	app.on("second-instance", async () => {
		const { getMainWindow } = await import("./window.js");
		const mainWindow = getMainWindow();

		if (mainWindow) {
			if (mainWindow.isMinimized()) {
				mainWindow.restore();
			}

			mainWindow.focus();
		}
	});

	await import("./main.js");
}
