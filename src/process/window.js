import { app, BrowserWindow, shell, nativeTheme } from "electron";
import windowStateKeeper from "electron-window-state";
import path from "path";

import { setAppMenu, getTabMenu } from "./menu.js";
import { deepFreeze } from "../tools/object.js";
import { settings } from "./settings.js";
import { CONFIG_SETTINGS_TITLE_BAR_TYPES } from "../shared/settings.js";
import { ipcOn, ipcOnce, ipcSend } from "./ipc.js";

const TITLEBAR_OVERLAY = deepFreeze({
	BASE: {
		height: 40,
	},
	DARK: {
		color: "#18181a",
		symbolColor: "#ffffff",
	},
	LIGHT: {
		color: "#ffffff",
		symbolColor: "#000000",
	},
});

const FLAGS = Object.freeze({
	PLATFORM: "platform",
	FULL_SCREEN: "is-full-screen",
	FOCUS: "is-focused",
	TITLE_BAR_TYPE: "title-bar-type",
});

const titleBarType = settings.titleBarType;

/** @type {import("electron").BrowserWindow} */
let mainWindow;

export function getMainWindow() {
	return mainWindow;
}

export const MainWindow = {
	create: function () {
		let mainWindowState = windowStateKeeper({
			// Remember the positiona and size of the window
			defaultWidth: 1400,
			defaultHeight: 900,
		});
		mainWindow = new BrowserWindow({
			// Size
			x: mainWindowState.x,
			y: mainWindowState.y,
			width: mainWindowState.width,
			height: mainWindowState.height,
			minWidth: 1000,
			minHeight: 400,
			transparent: global.transparent,
			vibrancy: "sidebar",
			// Titlebar
			trafficLightPosition: { x: 16, y: 12 }, // for macOS
			...(titleBarType === CONFIG_SETTINGS_TITLE_BAR_TYPES.OVERLAY && {
				titleBarStyle: "hidden",
				titleBarOverlay: TITLEBAR_OVERLAY.BASE,
				frame: false,
			}),
			// Other Options
			autoHideMenuBar: true,
			icon: global.AppIcon,
			webPreferences: {
				preload: path.join(app.getAppPath(), "src/process/preload.mjs"),
				webviewTag: true,
			},
		});
		mainWindow.loadFile(path.join(app.getAppPath(), "src/base/index.html"));
		mainWindow.on("ready-to-show", () => {
			ipcSend(mainWindow, "env:set-flag", [FLAGS.PLATFORM, process.platform]);
			ipcSend(mainWindow, "env:set-flag", [FLAGS.TITLE_BAR_TYPE, titleBarType]);
		});

		// IPC Functions
		ipcOn("app:open-in-browser", (_event, resource) => {
			let url;

			switch (resource) {
				case "help":
					url = "https://github.com/author-more/penpot-desktop/wiki";
					break;
				case "selfhost":
					url =
						"https://github.com/author-more/penpot-desktop/wiki/Self%E2%80%90hosting";
					break;
				case "credits":
					url = "https://github.com/author-more/penpot-desktop/wiki/Credits";
					break;
			}

			if (url) {
				shell.openExternal(url);
			}
		});
		ipcOn("tab:open-context-menu", (_event, tabId) => {
			const tabMenu = getTabMenu(tabId);
			tabMenu.popup({
				window: mainWindow,
			});
		});
		ipcOn("app:set-theme", (_event, themeId) => {
			nativeTheme.themeSource = themeId;

			if (titleBarType === CONFIG_SETTINGS_TITLE_BAR_TYPES.OVERLAY) {
				mainWindow.setTitleBarOverlay?.({
					...TITLEBAR_OVERLAY.BASE,
					...(nativeTheme.shouldUseDarkColors
						? TITLEBAR_OVERLAY.DARK
						: TITLEBAR_OVERLAY.LIGHT),
				});
			}
		});

		mainWindow.on("enter-full-screen", () => {
			ipcSend(mainWindow, "env:set-flag", [FLAGS.FULL_SCREEN, "true"]);
		});
		mainWindow.on("leave-full-screen", () => {
			ipcSend(mainWindow, "env:set-flag", [FLAGS.FULL_SCREEN, "false"]);
		});
		mainWindow.on("focus", () => {
			ipcSend(mainWindow, "env:set-flag", [FLAGS.FOCUS, "true"]);
		});
		mainWindow.on("blur", () => {
			ipcSend(mainWindow, "env:set-flag", [FLAGS.FOCUS, "true"]);
		});
		mainWindow.once("close", (event) => {
			event.preventDefault();

			ipcOnce("app:ready-for-close", () => {
				app.quit();
			});

			ipcSend(mainWindow, "app:will-close");
		});

		mainWindowState.manage(mainWindow);
		setAppMenu();
	},
};
