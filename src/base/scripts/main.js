import "./shoelace.js";
import "../components/editableText.js";
import "../components/tabGroup.js";

import { initTabs } from "./tabs.js";
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
