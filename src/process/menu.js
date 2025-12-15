import { app, Menu, shell } from "electron";
import { getMainWindow } from "./window.js";
import { showDiagnostics } from "./diagnostics.js";

/**
 * @typedef {import("electron").MenuItemConstructorOptions} MenuItemConstructorOptions
 */

export function setAppMenu() {
	const mainWindow = getMainWindow();
	//TypeScript has problems evaluating types with ternary operators in the menu template, hence the push method solution.
	const isMacOs = process.platform === "darwin";

	/**
	 * @type {MenuItemConstructorOptions[]}
	 */
	const template = [];

	/** @type {MenuItemConstructorOptions} */
	const aboutMenu = {
		label: app.name,
		submenu: [
			{ role: "about" },
			{ type: "separator" },
			{ role: "services" },
			{ type: "separator" },
			{ role: "hide" },
			{ role: "hideOthers" },
			{ role: "unhide" },
			{ type: "separator" },
			{ role: "quit" },
		],
	};

	/** @type {MenuItemConstructorOptions} */
	const fileMenu = {
		label: "File",
		submenu: [
			{
				label: "New Tab",
				accelerator: "CmdOrCtrl+T",
				click: () => {
					mainWindow.webContents.executeJavaScript(
						`document.querySelector("tab-group").shadowRoot.querySelector("div > nav > div.buttons > button").click()`,
					);
				},
			},
			{
				label: "Close Tab",
				accelerator: "CmdOrCtrl+W",
				click: () => {
					mainWindow.webContents.executeJavaScript(
						`document.querySelector("tab-group").shadowRoot.querySelector("div > nav > div.tabs > div.tab.visible.active > span.tab-close > button").click()`,
					);
				},
			},
			{ type: "separator" },
			{
				label: "Quit",
				accelerator: "CmdOrCtrl+Q",
				click: () => {
					app.quit();
				},
			},
		],
	};

	/** @type {MenuItemConstructorOptions} */
	const editMenu = {
		label: "Edit",
		submenu: [
			{ role: "undo" },
			{ role: "redo" },
			{ type: "separator" },
			{ role: "cut" },
			{ role: "copy" },
			{ role: "paste" },
		],
	};

	if (Array.isArray(editMenu.submenu)) {
		if (isMacOs) {
			editMenu.submenu.push(
				{ role: "pasteAndMatchStyle" },
				{ role: "delete" },
				{ role: "selectAll" },
				{ type: "separator" },
				{
					label: "Speech",
					submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
				},
			);
		} else {
			editMenu.submenu.push(
				{ role: "delete" },
				{ type: "separator" },
				{ role: "selectAll" },
			);
		}
	}

	/** @type {MenuItemConstructorOptions} */
	const viewMenu = {
		label: "View",
		submenu: [
			{
				label: "Reload Tab",
				accelerator: "CmdOrCtrl+R",
				click: async () => {
					mainWindow.webContents.executeJavaScript(
						`document.querySelector("tab-group").shadowRoot.querySelector("webview.visible").reload()`,
					);
				},
			},
			{
				label: "Reload Window",
				accelerator: "CmdOrCtrl+Shift+R",
				click: async () => {
					mainWindow.reload();
				},
			},
			{ role: "toggleDevTools" },
			{
				label: "Open Tab Developer Tools",
				accelerator: "CmdOrCtrl+Shift+D",
				click: () => {
					mainWindow.webContents.executeJavaScript(
						`document.querySelector("body > #include-tabs > tab-group").shadowRoot.querySelector("div > div > webview.visible").openDevTools()`,
					);
				},
			},
			{
				label: "Toggle Diagnostics",
				accelerator: "CmdOrCtrl+Shift+Y",
				click: () => {
					showDiagnostics(mainWindow);
				},
			},
			{ type: "separator" },
			{ role: "resetZoom" },
			{ role: "zoomIn" },
			{ role: "zoomOut" },
			{ type: "separator" },
			{ role: "togglefullscreen" },
		],
	};

	/** @type {MenuItemConstructorOptions} */
	const windowMenu = {
		label: "Window",
		submenu: [{ role: "minimize" }, { role: "zoom" }],
	};

	if (Array.isArray(windowMenu.submenu)) {
		if (isMacOs) {
			windowMenu.submenu.push(
				{ type: "separator" },
				{ role: "front" },
				{ type: "separator" },
				{
					role: "close",
					accelerator: "CmdOrCtrl+Shift+W",
				},
			);
		} else {
			windowMenu.submenu.push({
				role: "close",
				accelerator: "CmdOrCtrl+Shift+W",
			});
		}
	}

	/** @type {MenuItemConstructorOptions} */
	const helpMenu = {
		role: "help",
		submenu: [
			{
				label: "User Guide",
				click: () => {
					shell.openExternal("https://help.penpot.app/user-guide/");
				},
			},
			{
				label: "FAQ",
				click: () => {
					shell.openExternal("https://help.penpot.app/faqs");
				},
			},
			{
				label: "Learn to Self-host",
				click: () => {
					shell.openExternal("https://penpot.app/self-host");
				},
			},
			{
				label: "Penpot Community",
				click: () => {
					shell.openExternal("https://community.penpot.app/");
				},
			},
			{ type: "separator" },
			{
				label: "Source Code",
				click: () => {
					shell.openExternal("https://github.com/author-more/penpot-desktop");
				},
			},
		],
	};

	if (isMacOs) {
		template.push(aboutMenu);
	}
	template.push(fileMenu);
	template.push(editMenu);
	template.push(viewMenu);
	template.push(windowMenu);
	template.push(helpMenu);

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

/**
 * @param {number} tabId
 */
export function getTabMenu(tabId) {
	const mainWindow = getMainWindow();

	/** @type {(command: string) => void} */
	const dispatchAction = (command) =>
		mainWindow.webContents.send("tab:menu-action", {
			command,
			tabId,
		});

	return Menu.buildFromTemplate([
		{
			label: "Reload Tab",
			click: () => dispatchAction("reload-tab"),
		},
		{
			label: "Duplicate Tab",
			click: () => dispatchAction("duplicate-tab"),
		},
		{ type: "separator" },
		{
			label: "Close Other Tabs",
			click: () => dispatchAction("close-tabs-other"),
		},
		{
			label: "Close Tabs To Right",
			click: () => dispatchAction("close-tabs-right"),
		},
		{
			label: "Close Tabs To Left",
			click: () => dispatchAction("close-tabs-left"),
		},
	]);
}
