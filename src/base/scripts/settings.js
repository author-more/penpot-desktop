import {
	SlDrawer,
	SlIconButton,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { getIncludedElement } from "./dom.js";

export async function initSettings() {
	const {
		toggleSettingsButton,
		closeSettingsButton,
		openDocsButton,
		openSelfhostButton,
	} = await getTriggers();

	toggleSettingsButton?.addEventListener("click", () => toggleSettings());
	closeSettingsButton?.addEventListener("click", () => toggleSettings());
	openDocsButton?.addEventListener("click", () => window.api.send("OpenHelp"));
	openSelfhostButton?.addEventListener("click", () =>
		window.api.send("OpenOffline"),
	);
}

async function toggleSettings() {
	const { settingsDrawer } = await getSettingsElements();

	if (settingsDrawer?.open) {
		settingsDrawer?.hide();
		return;
	}

	settingsDrawer?.show();
}

export async function disableSettingsFocusTrap() {
	const { settingsDrawer } = await getSettingsElements();

	settingsDrawer?.modal.activateExternal();
}

export async function enableSettingsFocusTrap() {
	const { settingsDrawer } = await getSettingsElements();

	settingsDrawer?.modal.deactivateExternal();
}

async function getTriggers() {
	const toggleSettingsButton = await getIncludedElement(
		"#toggle-settings",
		"#include-controls",
		SlIconButton,
	);
	const closeSettingsButton = await getIncludedElement(
		"#close-settings",
		"#include-settings",
		SlIconButton,
	);
	const openDocsButton = await getIncludedElement(
		"#open-docs",
		"#include-settings",
		HTMLAnchorElement,
	);
	const openSelfhostButton = await getIncludedElement(
		"#open-selfhost",
		"#include-settings",
		HTMLAnchorElement,
	);

	return {
		toggleSettingsButton,
		closeSettingsButton,
		openDocsButton,
		openSelfhostButton,
	};
}

async function getSettingsElements() {
	const settingsDrawer = await getIncludedElement(
		"#settings",
		"#include-settings",
		SlDrawer,
	);

	return { settingsDrawer };
}
