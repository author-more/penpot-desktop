import { app } from "electron";

/**
 * @param {import("electron").BrowserWindow} window
 */
export function showDiagnostics(window) {
	window.webContents.send("diagnostics:toggle", {
		system: getSystemDiagnostics(),
		gpu: getGPUDiagnostics(),
	});
}

export function getSystemDiagnostics() {
	return {
		version: app.getVersion(),
		platform: process.platform,
		arch: process.arch,
		electronVersion: process.versions.electron,
		nodeVersion: process.versions.node,
		chromeVersion: process.versions.chrome,
	};
}

export function getGPUDiagnostics() {
	return app.getGPUFeatureStatus();
}
