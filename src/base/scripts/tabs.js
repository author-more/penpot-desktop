import { TAB_EVENTS, TabGroup } from "../components/tabGroup.js";
import { typedQuerySelector } from "./dom.js";

/**
 * @typedef {import("../components/tabGroup.js").TabFocusEvent} TabFocusEvent
 * @typedef {import("../components/tabGroup.js").TabReorderEvent} TabReorderEvent
 * @typedef {import("../components/tabGroup.js").TabCloseEvent} TabCloseEvent
 */

export function initTabs() {
	const tabGroup = getTabGroup();

	if (!tabGroup) {
		return;
	}

	tabGroup?.addEventListener(TAB_EVENTS.ADD, () => {
		const tabs = structuredClone(tabGroup.tabs);
		const newTab = {
			id: crypto.randomUUID(),
			label: `New Tab ${tabs.length + 1}`,
		};

		tabGroup.tabs = [...tabs, newTab];
		tabGroup.activeTabId = newTab.id;

		handleNoTabs();
	});

	tabGroup.addEventListener(TAB_EVENTS.FOCUS, (event) => {
		const { id } = /** @type {TabFocusEvent} */ (event).detail;

		tabGroup.activeTabId = id;
	});

	tabGroup.addEventListener(TAB_EVENTS.REORDER, (event) => {
		const { id, toIndex } = /** @type {TabReorderEvent} */ (event).detail;
		const tabs = structuredClone(tabGroup.tabs);
		const fromIndex = tabs.findIndex((tab) => tab.id === id);

		const hasExistingPosition = fromIndex !== -1;
		const isSamePosition = toIndex === fromIndex;
		if (hasExistingPosition && !isSamePosition) {
			const movedTab = tabs.splice(fromIndex, 1)[0];
			tabs.splice(toIndex, 0, movedTab);

			tabGroup.tabs = tabs;
		}
	});

	tabGroup.addEventListener(TAB_EVENTS.CLOSE, (event) => {
		const { id } = /** @type {TabCloseEvent} */ (event).detail;
		const tabs = structuredClone(tabGroup.tabs);

		tabGroup.tabs = tabs.filter((tab) => tab.id !== id);

		const isActiveTab = tabGroup.activeTabId === id;
		if (!isActiveTab) {
			return;
		}

		const activeTabIndex = tabs.findIndex(
			(tab) => tab.id === tabGroup.activeTabId,
		);
		const nextActiveTab =
			tabs[activeTabIndex - 1] || tabs[activeTabIndex + 1] || null;

		tabGroup.activeTabId = nextActiveTab ? nextActiveTab.id : null;

		handleNoTabs();
	});

	handleNoTabs();
}

function handleNoTabs() {
	const tabGroup = getTabGroup();
	const tabs = tabGroup?.tabs;
	const hasTabs = !!tabs?.length;

	const noTabsExistPage = typedQuerySelector(".no-tabs-exist", HTMLElement);
	if (noTabsExistPage) {
		noTabsExistPage.style.display = hasTabs ? "none" : "inherit";
	}
}

function getTabGroup() {
	return typedQuerySelector("tab-group", TabGroup);
}
