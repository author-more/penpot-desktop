/**
 * @typedef {Parameters<typeof window.api.setTheme>[0]} ThemeId
 * @typedef {Awaited<ReturnType<typeof window.api.getSetting<"theme">>>} ThemeSetting
 * @typedef {import("electron").IpcMessageEvent} IpcMessageEvent
 */

import { SlSelect } from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { getIncludedElement } from "./dom.js";
import { requestTabTheme } from "./electron-tabs.js";

export const THEME_TAB_EVENTS = Object.freeze({
	REQUEST_UPDATE: "theme-request-update",
	UPDATE: "theme-update",
});
const THEME_MEDIA = Object.freeze({
	LIGHT: "(prefers-color-scheme: light)",
	DARK: "(prefers-color-scheme: dark)",
});

/** @type {ThemeSetting | null} */
let currentThemeSetting = null;

export async function initTheme() {
	currentThemeSetting = await window.api.getSetting("theme");

	setTheme(currentThemeSetting);
	prepareForm(currentThemeSetting);
	syncThemeClass();
}

function syncThemeClass() {
	/**
	 * @function
	 * @param {Pick<MediaQueryListEvent, 'matches' | 'media'>} arg0
	 */
	const mediaMatchHandler = ({ matches, media }) => {
		if (!matches) {
			return;
		}

		if (media === THEME_MEDIA.LIGHT) {
			document.documentElement.classList.remove("sl-theme-dark");
			document.documentElement.classList.add("sl-theme-light");
			return;
		}

		if (media === THEME_MEDIA.DARK) {
			document.documentElement.classList.remove("sl-theme-light");
			document.documentElement.classList.add("sl-theme-dark");
		}
	};

	Object.values(THEME_MEDIA).forEach((query) => {
		const match = matchMedia(query);
		const { matches, media } = match;

		mediaMatchHandler({ matches, media });
		match.addEventListener("change", mediaMatchHandler);
	});
}

/**
 * @param {ThemeSetting | null} themeSetting
 */
async function prepareForm(themeSetting) {
	const { themeSelect } = await getThemeSettingsForm();

	if (themeSelect && themeSetting) {
		themeSelect.setAttribute("value", themeSetting);
	}

	themeSelect?.addEventListener("sl-change", (event) => {
		const { target } = event;
		const value = target instanceof SlSelect && target.value;

		if (isThemeSetting(value)) {
			const isTabTheme = value === "tab";

			currentThemeSetting = value;
			window.api.setSetting("theme", value);

			if (isTabTheme) {
				requestTabTheme();
				return;
			}

			setTheme(value);
		}
	});
}

/**
 * @param {string} themeId
 */
function setTheme(themeId) {
	if (isThemeId(themeId)) {
		window.api.setTheme(themeId);
	}
}

async function getThemeSettingsForm() {
	const themeSelect = await getIncludedElement(
		"#theme-select",
		"#include-settings",
		SlSelect,
	);

	return { themeSelect };
}

/**
 * @param {string} inTabTheme
 */
export function handleInTabThemeUpdate(inTabTheme) {
	const shouldUseInTabTheme = currentThemeSetting === "tab";

	if (shouldUseInTabTheme) {
		setTheme(inTabTheme);
	}
}

/**
 *
 * @param {unknown} value
 * @returns {value is ThemeId}
 */
function isThemeId(value) {
	return (
		typeof value === "string" && ["light", "dark", "system"].includes(value)
	);
}

/**
 *
 * @param {unknown} value
 * @returns {value is ThemeSetting}
 */
function isThemeSetting(value) {
	return (
		typeof value === "string" &&
		["light", "dark", "system", "tab"].includes(value)
	);
}
