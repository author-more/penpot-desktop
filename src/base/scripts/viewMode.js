/**
 * @typedef {Parameters<typeof window.api.setSetting<"enableAutoReload">>[1]} AutoReloadSetting
 * @typedef {Parameters<typeof window.api.setSetting<"enableViewModeWindow">>[1]} ViewModeWindowSetting
 */

import { SlCheckbox } from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { getIncludedElement } from "./dom.js";

export async function initViewMode() {
	const enableAutoReload = await window.api.getSetting("enableAutoReload");
	const enableViewModeWindow = await window.api.getSetting(
		"enableViewModeWindow",
	);

	prepareForm({ enableAutoReload, enableViewModeWindow });
}

/**
 * @typedef {Object} PrepareFormOptions
 * @property {AutoReloadSetting} enableAutoReload
 * @property {ViewModeWindowSetting} enableViewModeWindow
 *
 * @param {PrepareFormOptions} settingValues
 */
async function prepareForm({ enableAutoReload, enableViewModeWindow }) {
	const { autoReloadSwitch, viewModeWindowSwitch } = await getSettingForm();

	if (autoReloadSwitch) {
		autoReloadSwitch.checked = enableAutoReload;

		autoReloadSwitch.addEventListener("sl-change", (event) => {
			const { target } = event;
			const value = target instanceof SlCheckbox && target.checked;

			window.api.setSetting("enableAutoReload", value);
		});
	}

	if (viewModeWindowSwitch) {
		viewModeWindowSwitch.checked = enableViewModeWindow;

		viewModeWindowSwitch.addEventListener("sl-change", (event) => {
			const { target } = event;
			const value = target instanceof SlCheckbox && target.checked;

			window.api.setSetting("enableViewModeWindow", value);
		});
	}
}

async function getSettingForm() {
	const autoReloadSwitch = await getIncludedElement(
		"#auto-reload-switch",
		"#include-settings",
		SlCheckbox,
	);
	const viewModeWindowSwitch = await getIncludedElement(
		"#view-mode-window-switch",
		"#include-settings",
		SlCheckbox,
	);

	return { autoReloadSwitch, viewModeWindowSwitch };
}
