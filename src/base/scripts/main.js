import "./shoelace.js";
import "../../../node_modules/electron-tabs/dist/electron-tabs.js";
import "../components/editableText.js";

import { initTabs } from "./electron-tabs.js";
import { initInstance } from "./instance.js";
import { initSettings } from "./settings.js";
import { initTheme } from "./theme.js";
import { initToggles } from "./toggles.js";
import { initTitleBarType } from "./titleBar.js";

import "./devtools.js";

window.addEventListener("DOMContentLoaded", () => {
	initTabs();
	initInstance();
	initTheme();
	initToggles();
	initSettings();
	initTitleBarType();
});

window.api.onSetFlag((flag, value) => {
	document.documentElement.setAttribute(flag, value);
});
