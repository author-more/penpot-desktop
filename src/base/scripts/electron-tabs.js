import { SlIconButton } from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { FILE_EVENTS } from "../../shared/file.js";
import { DEFAULT_INSTANCE } from "../../shared/instance.js";
import { showAlert } from "./alert.js";
import { hideContextMenu, showContextMenu } from "./contextMenu.js";
import { getIncludedElement, typedQuerySelector } from "./dom.js";
import { handleFileExport } from "./file.js";
import { handleInTabThemeUpdate, THEME_TAB_EVENTS } from "./theme.js";

/**
 * @typedef {import("electron-tabs").TabGroup} TabGroup
 * @typedef {import("electron-tabs").Tab} Tab
 * @typedef {import("electron").WebviewTag} WebviewTag
 *
 * @typedef {Object} TabOptions
 * @property {string =} accentColor
 * @property {string =} partition
 */

const PRELOAD_PATH = "./scripts/webviews/preload.mjs";
const DEFAULT_TAB_OPTIONS = Object.freeze({
	src: DEFAULT_INSTANCE.origin,
	active: true,
	webviewAttributes: {
		preload: PRELOAD_PATH,
		allowpopups: true,
	},
	ready: tabReadyHandler,
});

const TAB_STYLE_PROPERTIES = Object.freeze({
	ACCENT_COLOR: "--tab-accent-color",
	ACCENT_COLOR_HUE: "--tab-accent-color-hue",
	ACCENT_COLOR_SATURATION: "--tab-accent-color-saturation",
	ACCENT_COLOR_LIGHTNESS: "--tab-accent-color-lightness",
	ACCENT_COLOR_ALPHA: "--tab-accent-color-alpha",
});

export async function initTabs() {
	const tabGroup = await getTabGroup();

	tabGroup?.on("tab-removed", () => {
		handleNoTabs();
	});
	tabGroup?.on("tab-added", () => {
		handleNoTabs();
	});

	prepareTabReloadButton();

	window.api.onOpenTab(openTab);
	window.api.onTabMenuAction(handleTabMenuAction);

	const addTabButton = typedQuerySelector(
		".buttons > button",
		HTMLButtonElement,
		tabGroup?.shadow,
	);
	addTabButton?.addEventListener("contextmenu", async () => {
		const instances = await window.api.getSetting("instances");
		const hasMultipleInstances = instances.length > 1;

		if (!hasMultipleInstances) {
			return;
		}

		const menuItems = instances.map(({ id, origin, label, color }) => ({
			label: label || origin,
			color,
			onClick: () => {
				openTab(origin, { accentColor: color, partition: id });
				hideContextMenu();
			},
		}));

		showContextMenu(addTabButton, menuItems);
	});
}

/**
 * @param {string =} href
 * @param {TabOptions} options
 */
export async function setDefaultTab(href, { accentColor, partition } = {}) {
	const tabGroup = await getTabGroup();

	tabGroup?.setDefaultTab({
		...DEFAULT_TAB_OPTIONS,
		...(href ? { src: href } : {}),
		webviewAttributes: {
			...DEFAULT_TAB_OPTIONS.webviewAttributes,
			...(partition && { partition: `persist:${partition}` }),
		},
		ready: (tab) => tabReadyHandler(tab, { accentColor }),
	});
}

/**
 * @param {string =} href
 * @param {TabOptions} options
 */
export async function openTab(href, { accentColor, partition } = {}) {
	const tabGroup = await getTabGroup();
	const activeTab = tabGroup?.getActiveTab();

	// Use the same instance as the active tab if not requested otherwise.
	const activeTabProperties = activeTab && getTabProperties(activeTab);
	partition = partition || activeTabProperties?.partition;
	accentColor = accentColor || activeTabProperties?.accentColor;

	tabGroup?.addTab(
		href
			? {
					...DEFAULT_TAB_OPTIONS,
					src: href,
					webviewAttributes: {
						...DEFAULT_TAB_OPTIONS.webviewAttributes,
						...(partition && { partition: `persist:${partition}` }),
					},
					ready: (tab) => {
						tabReadyHandler(tab, { accentColor });
					},
				}
			: undefined,
	);
}

async function prepareTabReloadButton() {
	const reloadButton = await getIncludedElement(
		"#reload-tab",
		"#include-controls",
		SlIconButton,
	);
	const tabGroup = await getTabGroup();

	reloadButton?.addEventListener("click", () => {
		const tab = tabGroup?.getActiveTab();
		/** @type {WebviewTag} */ (tab?.webview)?.reload();
	});
}

/**
 * @param {Tab} tab
 * @param {TabOptions} options
 */
function tabReadyHandler(tab, { accentColor } = {}) {
	const webview = /** @type {WebviewTag} */ (tab.webview);

	if (accentColor) {
		const [hue, saturation, lightness, alpha] =
			accentColor
				?.replaceAll(/[hsla()]/g, "")
				.split(",")
				.map((entry) => entry.trim()) || [];

		[
			[TAB_STYLE_PROPERTIES.ACCENT_COLOR, accentColor],
			[TAB_STYLE_PROPERTIES.ACCENT_COLOR_HUE, hue],
			[TAB_STYLE_PROPERTIES.ACCENT_COLOR_SATURATION, saturation],
			[TAB_STYLE_PROPERTIES.ACCENT_COLOR_LIGHTNESS, lightness],
			[TAB_STYLE_PROPERTIES.ACCENT_COLOR_ALPHA, alpha],
		].forEach(([key, value]) => {
			tab.element.style.setProperty(key, value);
		});
	}

	tab.once("webview-dom-ready", () => {
		tab.on("active", () => requestTabTheme(tab));
	});
	tab.element.addEventListener("contextmenu", (event) => {
		event.preventDefault();
		window.api.send("openTabMenu", tab.id);
	});
	webview.addEventListener("ipc-message", async (event) => {
		const isError = event.channel === "error";
		if (isError) {
			const [{ heading, message }] = event.args;

			showAlert(
				"danger",
				{
					heading,
					message,
				},
				{
					closable: true,
				},
			);

			return;
		}

		const isThemeUpdate = event.channel === THEME_TAB_EVENTS.UPDATE;
		if (isThemeUpdate) {
			const [theme] = event.args;

			handleInTabThemeUpdate(theme);
		}

		const isFileChange = event.channel === FILE_EVENTS.CHANGE;
		if (isFileChange) {
			const [fileId] = event.args;
			const tabGroup = await getTabGroup();
			const tabs = tabGroup?.getTabs() || [];

			for (const tab of tabs) {
				const webview = /** @type {WebviewTag} */ (tab.webview);
				const tabUrl = new URL(webview.src);
				const isViewModeTab =
					tabUrl.hash.startsWith("#/view") && tabUrl.hash.includes(fileId);
				if (isViewModeTab) {
					webview.reload();
				}
			}
		}

		const isFileExport = event.channel === FILE_EVENTS.EXPORT;
		if (isFileExport) {
			const [files, failedExports] = event.args;

			await handleFileExport(files, failedExports);

			webview.send("file:export-finish");
		}
	});
	webview.addEventListener("page-title-updated", () => {
		const newTitle = webview.getTitle();
		tab.setTitle(newTitle);
	});
}

/**
 * Calls a tab and requests a theme update send-out.
 * If no tab is provided, calls the active tab.
 *
 * @param {Tab =} tab
 */
export async function requestTabTheme(tab) {
	tab = tab || (await getActiveTab());

	if (tab) {
		const webview = /** @type {WebviewTag} */ (tab.webview);
		webview?.send(THEME_TAB_EVENTS.REQUEST_UPDATE);
	}
}

async function getActiveTab() {
	const tabGroup = await getTabGroup();
	return tabGroup?.getActiveTab();
}

async function handleNoTabs() {
	const tabGroup = await getTabGroup();
	const tabs = tabGroup?.getTabs();
	const hasTabs = !!tabs?.length;

	const noTabsExistPage = typedQuerySelector(".no-tabs-exist", HTMLElement);
	if (noTabsExistPage) {
		noTabsExistPage.style.display = hasTabs ? "none" : "inherit";
	}
}

export async function getTabGroup() {
	return /** @type {TabGroup | null} */ (
		await getIncludedElement("tab-group", "#include-tabs")
	);
}

/**
 * Handles action from a tab menu interaction.
 *
 * @param {{command: string, tabId: number}} action
 */
async function handleTabMenuAction({ command, tabId }) {
	const tabGroup = await getTabGroup();
	const tab = tabGroup?.getTab(tabId);

	if (!tab) {
		return;
	}

	if (command === "reload-tab") {
		/** @type {WebviewTag} */ (tab.webview).reload();
	}

	if (command === "duplicate-tab") {
		const { url, accentColor, partition } = getTabProperties(tab);

		openTab(url, {
			accentColor,
			partition,
		});
	}

	if (command.startsWith("close-tabs-")) {
		const pivotPosition = tab.getPosition();

		/** @type {-1 | 0| 1} */
		let direction;
		switch (command) {
			case "close-tabs-right":
				direction = 1;
				break;
			case "close-tabs-left":
				direction = -1;
				break;
			case "close-tabs-other":
			default:
				direction = 0;
		}

		if (tabGroup) {
			closeTabs(tabGroup, pivotPosition, direction);
		}
	}
}

/**
 * Close tabs from the given tab's position.
 *
 * @param {TabGroup} tabs
 * @param {number} from - Position of the pivot tab.
 * @param {-1 | 0 | 1} direction - Direction of the closing. 1 for higher position, 0 any other position, -1 for lower position.
 */
function closeTabs(tabs, from, direction) {
	tabs.eachTab((tab) => {
		const position = tab.getPosition();

		const isMatchingPosition = position === from;
		const isLowerPosition = position < from;
		const isHigherPosition = position > from;
		const isOtherDirection = direction === 0;
		const isLowerDirection = direction === -1;
		const isHigherDirection = direction === 1;

		const isOtherClose = isOtherDirection && !isMatchingPosition;
		const isHigherClose = isLowerDirection && isLowerPosition;
		const isLowerClose = isHigherDirection && isHigherPosition;

		const isClose = isOtherClose || isHigherClose || isLowerClose;

		if (isClose) {
			tab.close(true);
		}
	});
}

/**
 * @param {Tab} tab
 *
 * @returns {Required<TabOptions & { url: string}>}
 */
function getTabProperties(tab) {
	const webview = /** @type {WebviewTag} */ (tab.webview);
	const url = webview.getURL();
	const { partition } = webview;
	const [, id] = partition.split(":");
	const accentColor = tab.element.style.getPropertyValue(
		TAB_STYLE_PROPERTIES.ACCENT_COLOR,
	);

	return {
		url,
		accentColor,
		partition: id,
	};
}
