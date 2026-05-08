import { app } from "electron";
import { ipcSend } from "./ipc.js";

/**
 * @param {import("electron").BrowserWindow} window
 */
export function showDiagnostics(window) {
	ipcSend(window, "diagnostics:toggle", {
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
