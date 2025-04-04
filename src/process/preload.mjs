/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
	"api",
	/** @type {import("../types/ipc.js").Api} */ ({
		send: (channel, data) => {
			let validChannels = [
				"updateApp",
				"ReloadApp",
				"MaximizeWindow",
				"UnmaximizeWindow",
				"MinimizeWindow",
				"OpenHelp",
				"OpenOffline",
				"OpenCredits",
				"instance:register",
				"instance:remove",
				"instance:setDefault",
				"openTabMenu",
			];

			if (validChannels.includes(channel)) {
				ipcRenderer.send(channel, data);
			}
		},
		setTheme: (themeId) => {
			ipcRenderer.send("set-theme", themeId);
		},
		getSetting: (setting) => {
			return ipcRenderer.invoke("setting:get", setting);
		},
		setSetting: (setting, value) => {
			ipcRenderer.send("setting:set", setting, value);
		},
		onOpenTab: (callback) =>
			ipcRenderer.on("open-tab", (_event, value) => callback(value)),
		onTabMenuAction: (callback) =>
			ipcRenderer.on("tab-menu-action", (_event, value) => callback(value)),
	}),
);
