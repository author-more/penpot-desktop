import { app, BrowserWindow, ipcMain, shell, nativeTheme } from "electron";
import windowStateKeeper from "electron-window-state";
import path from "path";

import { setAppMenu, getTabMenu } from "./menu.js";
import { deepFreeze } from "../tools/object.js";

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
});

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
			titleBarStyle: "hidden",
			trafficLightPosition: { x: 16, y: 12 }, // for macOS
			titleBarOverlay: TITLEBAR_OVERLAY.BASE,
			// Other Options
			autoHideMenuBar: true,
			frame: false,
			icon: global.AppIcon,
			webPreferences: {
				preload: path.join(app.getAppPath(), "src/process/preload.mjs"),
				webviewTag: true,
			},
		});
		mainWindow.loadFile("src/base/index.html");
		mainWindow.on("ready-to-show", () => {
			mainWindow.webContents.send("set-flag", [
				FLAGS.PLATFORM,
				process.platform,
			]);
		});

		// IPC Functions
		ipcMain.on("ReloadApp", () => {
			mainWindow.reload();
		});
		ipcMain.on("MaximizeWindow", () => {
			mainWindow.maximize();
		});
		ipcMain.on("UnmaximizeWindow", () => {
			mainWindow.restore();
		});
		ipcMain.on("MinimizeWindow", () => {
			mainWindow.minimize();
		});
		ipcMain.on("OpenHelp", () => {
			shell.openExternal("https://github.com/author-more/penpot-desktop/wiki");
		});
		ipcMain.on("OpenOffline", () => {
			shell.openExternal(
				"https://github.com/author-more/penpot-desktop/wiki/Self%E2%80%90hosting",
			);
		});
		ipcMain.on("OpenCredits", () => {
			shell.openExternal(
				"https://github.com/author-more/penpot-desktop/wiki/Credits",
			);
		});
		ipcMain.on("openTabMenu", (_event, tabId) => {
			const tabMenu = getTabMenu(tabId);
			tabMenu.popup({
				window: mainWindow,
			});
		});
		ipcMain.on("set-theme", (_event, themeId) => {
			nativeTheme.themeSource = themeId;

			mainWindow.setTitleBarOverlay?.({
				...TITLEBAR_OVERLAY.BASE,
				...(nativeTheme.shouldUseDarkColors
					? TITLEBAR_OVERLAY.DARK
					: TITLEBAR_OVERLAY.LIGHT),
			});
		});

		mainWindow.on("enter-full-screen", () => {
			mainWindow.webContents.send("set-flag", [FLAGS.FULL_SCREEN, true]);
		});
		mainWindow.on("leave-full-screen", () => {
			mainWindow.webContents.send("set-flag", [FLAGS.FULL_SCREEN, false]);
		});
		mainWindow.on("focus", () => {
			mainWindow.webContents.send("set-flag", [FLAGS.FOCUS, true]);
		});
		mainWindow.on("blur", () => {
			mainWindow.webContents.send("set-flag", [FLAGS.FOCUS, false]);
		});

		mainWindowState.manage(mainWindow);
		setAppMenu();
	},
};
