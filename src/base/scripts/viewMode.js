/**
 * @typedef {Parameters<typeof window.api.setSetting<"enableAutoReload">>[1]} AutoReloadSetting
 */

import { SlCheckbox } from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { getIncludedElement } from "./dom.js";

export async function initViewMode() {
	const currentSetting = await window.api.getSetting("enableAutoReload");

	prepareForm(currentSetting);
}

/**
 * @param {AutoReloadSetting} settingValue
 */
async function prepareForm(settingValue) {
	const { autoReloadSwitch } = await getSettingForm();

	if (autoReloadSwitch) {
		autoReloadSwitch.checked = settingValue;

		autoReloadSwitch.addEventListener("sl-change", (event) => {
			const { target } = event;
			const value = target instanceof SlCheckbox && target.checked;

			window.api.setSetting("enableAutoReload", value);
		});
	}
}

async function getSettingForm() {
	const autoReloadSwitch = await getIncludedElement(
		"#auto-reload-switch",
		"#include-settings",
		SlCheckbox,
	);

	return { autoReloadSwitch };
}
