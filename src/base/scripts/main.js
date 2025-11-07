import "./shoelace.js";
import "../../../node_modules/electron-tabs/dist/electron-tabs.js";

import "../components/editableText.js";
import "../components/instanceCreator.js";

import { initTabs } from "./electron-tabs.js";
import { initInstance } from "./instance.js";
import { initSettings } from "./settings.js";
import { initTheme } from "./theme.js";
import { initToggles } from "./toggles.js";
import { initTitleBarType } from "./titleBar.js";
import { initViewMode } from "./viewMode.js";

import "./devtools.js";

window.addEventListener("DOMContentLoaded", () => {
	initTabs();
	initInstance();
	initTheme();
	initToggles();
	initSettings();
	initTitleBarType();
	initViewMode();
});

window.api.onSetFlag((flag, value) => {
	document.documentElement.setAttribute(flag, value);
});
