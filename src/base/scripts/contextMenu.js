import {
	SlMenu,
	SlMenuItem,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { typedQuerySelector } from "./dom.js";
import { trapFocus } from "./ui.js";

/**
 * @typedef {Object} MenuItem
 * @property {string} label
 * @property {string =} color
 * @property {Function} onClick
 */

/** @type {ResizeObserver | null} */
let resizeObserver;
/** @type {HTMLElement | null} */
let currentHost;

/**
 * Opens a context menu with given items, positioned "relatively" to a host element.
 *
 * @param {HTMLElement} host
 * @param {MenuItem[]} items
 */
export function showContextMenu(host, items) {
	const { contextMenu, menu } = getContextMenuElement();
	if (!contextMenu || !menu) {
		return;
	}

	currentHost = host;

	const menuItems = items.map(createContextMenuItem);
	menu.replaceChildren(...menuItems);

	trapFocus(menuItems);

	// When inserting elements browser(s) set tabindex of the last element to -1, to prevent it from catching focus. It has to be manually reset.
	setTimeout(() => {
		menuItems.forEach((element) => (element.tabIndex = 0));
		menuItems[0].focus();
	});

	// By default the menu has display set to `none`.
	// Position calculation has to be delayed until the menu is part of the DOM. Otherwise the menu's size and position are reported as 0.
	resizeObserver = new ResizeObserver(() => {
		const {
			top: hostTop,
			left: hostLeft,
			height: hostHeight,
			width: hostWidth,
		} = host.getBoundingClientRect();
		const { width: menuWidth } = menu.getBoundingClientRect();
		menu.style.top = `${hostTop + hostHeight + 4}`;
		menu.style.left = `${hostLeft + hostWidth - menuWidth}`;
	});
	resizeObserver.observe(menu);

	contextMenu.addEventListener("click", hideContextMenu);
	contextMenu.addEventListener("keydown", hideWithKeyboard);
	contextMenu.classList.add("visible");
}

/**
 * @param {KeyboardEvent} event
 */
function hideWithKeyboard(event) {
	const { key } = event;
	const isEscape = key === "Escape";

	if (isEscape) {
		event.preventDefault();
		hideContextMenu();
	}
}

export function hideContextMenu() {
	const { contextMenu, menu } = getContextMenuElement();
	if (!contextMenu || !menu) {
		return;
	}

	contextMenu?.classList.remove("visible");
	contextMenu.removeEventListener("click", hideContextMenu);
	contextMenu.removeEventListener("keydown", hideWithKeyboard);
	resizeObserver?.unobserve(menu);

	if (currentHost) {
		currentHost.focus();
		currentHost = null;
	}
}

/**
 * Creates a menu item element.
 *
 * @param {MenuItem} item
 */
function createContextMenuItem({ label, color, onClick }) {
	const menuItem = new SlMenuItem();
	menuItem.innerText = label;
	menuItem.addEventListener("click", (event) => {
		event.stopPropagation();
		onClick();
	});

	if (color) {
		const colorIcon = document.createElement("div");
		colorIcon.classList.add("icon", "color");
		colorIcon.style.setProperty("--icon-color", color);

		const slotPrefix = document.createElement("slot");
		slotPrefix.slot = "prefix";

		slotPrefix.append(colorIcon);
		menuItem.prepend(slotPrefix);
	}

	return menuItem;
}

function getContextMenuElement() {
	const contextMenu = typedQuerySelector("#context-menu", HTMLDivElement);
	const menu = typedQuerySelector("sl-menu.menu", SlMenu, contextMenu);

	return { contextMenu, menu };
}
