import { getIncludedElement, typedQuerySelector } from "./dom.js";
import { handleInTabThemeUpdate, THEME_TAB_EVENTS } from "./theme.js";

/**
 * @typedef {import("electron-tabs").TabGroup} TabGroup
 * @typedef {import("electron-tabs").Tab} Tab
 * @typedef {import("electron").WebviewTag} WebviewTag
 */

const DEFAULT_INSTANCE = "https://design.penpot.app/";
const PRELOAD_PATH = "./scripts/webviews/preload.mjs";
const DEFAULT_TAB_OPTIONS = Object.freeze({
	src: DEFAULT_INSTANCE,
	active: true,
	webviewAttributes: {
		preload: PRELOAD_PATH,
		allowpopups: true,
	},
	ready: tabReadyHandler,
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
}

export async function resetTabs() {
	const tabGroup = await getTabGroup();
	tabGroup?.eachTab((tab) => tab.close(false));
	openTab();
}

/**
 * @param {string =} href
 */
export async function setDefaultTab(href) {
	const tabGroup = await getTabGroup();

	tabGroup?.setDefaultTab({
		...DEFAULT_TAB_OPTIONS,
		...(href ? { src: href } : {}),
	});
}

/**
 * @param {string =} href
 */
export async function openTab(href) {
	const tabGroup = await getTabGroup();

	tabGroup?.addTab(
		href
			? {
					...DEFAULT_TAB_OPTIONS,
					src: href,
				}
			: undefined,
	);
}

async function prepareTabReloadButton() {
	const reloadButton = await getIncludedElement(
		"#reload-tab",
		"#include-controls",
	);
	const tabGroup = await getTabGroup();

	reloadButton?.addEventListener("click", () => {
		const tab = tabGroup?.getActiveTab();
		/** @type {WebviewTag} */ (tab?.webview)?.reload();
	});
}

/**
 * @param {Tab} tab
 */
function tabReadyHandler(tab) {
	const webview = /** @type {WebviewTag} */ (tab.webview);

	tab.once("webview-dom-ready", () => {
		tab.on("active", () => requestTabTheme(tab));
	});
	tab.element.addEventListener("contextmenu", (event) => {
		event.preventDefault();
		window.api.send("openTabMenu", tab.id);
	});
	webview.addEventListener("ipc-message", (event) => {
		const isThemeUpdate = event.channel === THEME_TAB_EVENTS.UPDATE;
		if (isThemeUpdate) {
			const [theme] = event.args;

			handleInTabThemeUpdate(theme);
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

	if (command === "reload-tab") {
		/** @type {WebviewTag} */ (tab?.webview)?.reload();
	}

	if (command === "duplicate-tab") {
		const url = /** @type {WebviewTag} */ (tab?.webview)?.getURL();
		openTab(url);
	}

	if (command.startsWith("close-tabs-")) {
		const pivotPosition = tab?.getPosition();

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

		if (tabGroup && pivotPosition) {
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
