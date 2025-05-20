/**
 * @typedef {Parameters<typeof window.api.setSetting<"titleBarType">>[1]} TitleBarTypeSetting
 */

import { SlSelect } from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { CONFIG_SETTINGS_TITLE_BAR_TYPES } from "../../shared/settings.js";
import { getIncludedElement } from "./dom.js";

/** @type {TitleBarTypeSetting | null} */
let currentSetting = null;

export async function initTitleBarType() {
	currentSetting = await window.api.getSetting("titleBarType");

	prepareForm(currentSetting);
}

/**
 * @param {TitleBarTypeSetting | null} settingValue
 */
async function prepareForm(settingValue) {
	const { titleBarTypeSelect } = await getSettingForm();

	if (titleBarTypeSelect && settingValue) {
		titleBarTypeSelect.setAttribute("value", settingValue);
	}

	titleBarTypeSelect?.addEventListener("sl-change", (event) => {
		const { target } = event;
		const value = target instanceof SlSelect && target.value;

		if (isTitleBarTypeSetting(value)) {
			currentSetting = value;
			window.api.setSetting("titleBarType", value);
		}
	});
}

async function getSettingForm() {
	const titleBarTypeSelect = await getIncludedElement(
		"#title-bar-type-select",
		"#include-settings",
		SlSelect,
	);

	return { titleBarTypeSelect };
}

/**
 * @param {unknown} value
 * @returns {value is TitleBarTypeSetting}
 */
function isTitleBarTypeSetting(value) {
	return (
		typeof value === "string" &&
		Object.values(CONFIG_SETTINGS_TITLE_BAR_TYPES).includes(
			/** @type {typeof CONFIG_SETTINGS_TITLE_BAR_TYPES[keyof typeof CONFIG_SETTINGS_TITLE_BAR_TYPES]} */ (
				value
			),
		)
	);
}
