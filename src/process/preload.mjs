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
				"openTabMenu",
			];

			if (validChannels.includes(channel)) {
				ipcRenderer.send(channel, data);
			}
		},
		instance: {
			getSetupInfo: () => ipcRenderer.invoke("instance:setup-info"),
			getAll: () => ipcRenderer.invoke("instance:get-all"),
			getConfig: (id) => ipcRenderer.invoke("instance:get-config", id),
			register: (instance) => ipcRenderer.send("instance:register", instance),
			create: (instance) => ipcRenderer.invoke("instance:create", instance),
			update: (id, instance) =>
				ipcRenderer.invoke("instance:update", id, instance),
			remove: (id) => ipcRenderer.send("instance:remove", id),
			setDefault: (id) => ipcRenderer.send("instance:setDefault", id),
		},
		file: {
			export: (file) => ipcRenderer.invoke("file:export", file),
			change: (fileId) => ipcRenderer.send("file:change", fileId),
		},
		diagnostics: {
			onToggle: (callback) => {
				ipcRenderer.on("diagnostics:toggle", (_event, diagnosticsData) =>
					callback(diagnosticsData),
				);
			},
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
		onSetFlag: (callback) => {
			ipcRenderer.on("set-flag", (_event, [flag, value]) =>
				callback(flag, value),
			);
		},
		onOpenTab: (callback) =>
			ipcRenderer.on("open-tab", (_event, value) => callback(value)),
		onTabMenuAction: (callback) =>
			ipcRenderer.on("tab-menu-action", (_event, value) => callback(value)),
	}),
);
