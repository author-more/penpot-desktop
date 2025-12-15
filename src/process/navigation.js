import { app, shell, dialog } from "electron";
import { URL } from "url";
import { join } from "path";
import { toMultiline } from "./string.js";
import { getMainWindow } from "./window.js";
import { settings } from "./settings.js";
import { isViewModeUrl } from "../tools/penpot.js";

// Covered origins and URLs are scoped to the Penpot web app (e.g. links in the Menu > Help & info).
const ALLOWED_INTERNAL_ORIGINS = Object.freeze([
	"https://penpot.app",
	"https://help.penpot.app",
]);
const ALLOWED_AUTH_ORIGINS = Object.freeze([
	"https://accounts.google.com",
	"https://github.com",
	"https://gitlab.com",
]);
const ALLOWED_EXTERNAL_URLS = Object.freeze([
	"https://community.penpot.app/",
	"https://www.youtube.com/c/Penpot", // Tutorials
	"https://github.com/penpot/penpot",
	// Local instance instructions
	"https://docs.docker.com/get-started/get-docker/",
]);

app.on("web-contents-created", (event, contents) => {
	const mainWindow = getMainWindow();

	// Open links in a new tab or a browser, instead of a new window
	contents.setWindowOpenHandler(({ url }) => {
		const parsedUrl = new URL(url);
		const isAllowedOrigin = [
			...ALLOWED_INTERNAL_ORIGINS,
			...getUserInstanceOrigins(settings),
		].includes(parsedUrl.origin);
		const isAllowedExternal = ALLOWED_EXTERNAL_URLS.includes(parsedUrl.href);
		const isAllowedNavigation = isAllowedOrigin || isAllowedExternal;

		if (isAllowedOrigin) {
			if (isViewModeUrl(parsedUrl) && settings.enableViewModeWindow) {
				return {
					action: "allow",
					overrideBrowserWindowOptions: { autoHideMenuBar: true },
				};
			}

			mainWindow.webContents.send("tab:open", parsedUrl.href);
		} else {
			console.warn(
				`[WARNING] [app.web-contents-created.setWindowOpenHandler] Forbidden origin: ${parsedUrl.origin}`,
			);
		}

		if (isAllowedExternal) {
			shell.openExternal(parsedUrl.href);
		} else {
			console.warn(
				`[WARNING] [app.web-contents-created.setWindowOpenHandler] Forbidden external URL: ${parsedUrl.href}`,
			);
		}

		if (!isAllowedNavigation) {
			console.error(
				`[ERROR] [app.web-contents-created.setWindowOpenHandler] Forbidden navigation.`,
			);

			showNavigationQuestion(parsedUrl.href, {
				buttons: ["Open in a browser"],
				onAllow: () => shell.openExternal(parsedUrl.href),
				logLabel: "app.web-contents-created.setWindowOpenHandler",
			});
		}

		return { action: "deny" };
	});

	// Limit navigation within the app
	contents.on("will-navigate", (event, url) => {
		const parsedUrl = new URL(url);
		const isAllowedOrigin = [
			...ALLOWED_INTERNAL_ORIGINS,
			...ALLOWED_AUTH_ORIGINS,
			...getUserInstanceOrigins(settings),
		].includes(parsedUrl.origin);

		if (!isAllowedOrigin) {
			console.error(
				`[ERROR] [app.web-contents-created.will-navigate] Forbidden origin: ${parsedUrl.origin}`,
			);

			showNavigationQuestion(parsedUrl.href, {
				buttons: ["Open"],
				onCancel: () => event.preventDefault(),
				logLabel: "app.web-contents-created.will-navigate",
			});
		}
	});

	contents.on("will-redirect", (event) => {
		const internalOrigins = [
			...ALLOWED_INTERNAL_ORIGINS,
			...getUserInstanceOrigins(settings),
		];
		const currentUrl = contents.getURL();

		// A new/empty tab doesn't have a URL before redirect to its initial page.
		if (!currentUrl) {
			return;
		}

		const parsedCurrentUrl = new URL(currentUrl);
		const parsedUrl = new URL(event.url);
		const isFromInternalOrigin = internalOrigins.includes(
			parsedCurrentUrl.origin,
		);
		const isToInternalOrigin = internalOrigins.includes(parsedUrl.origin);

		if (!isFromInternalOrigin && isToInternalOrigin) {
			// Prevents Electron from holding sessions for external services e.g. OpenID providers.
			console.log("Clear non-instance origins data.");

			contents.session.clearData({
				excludeOrigins: [...getUserInstanceOrigins(settings)],
			});
		}
	});

	contents.on("will-attach-webview", (event, webPreferences, params) => {
		webPreferences.allowRunningInsecureContent = false;
		webPreferences.contextIsolation = true;
		webPreferences.enableBlinkFeatures = "";
		webPreferences.experimentalFeatures = false;
		webPreferences.nodeIntegration = false;
		webPreferences.nodeIntegrationInSubFrames = false;
		webPreferences.nodeIntegrationInWorker = false;
		webPreferences.sandbox = true;
		webPreferences.webSecurity = true;

		const allowedPreloadScriptPath = join(
			app.getAppPath(),
			"src/base/scripts/webviews/preload.mjs",
		);
		const isAllowedPreloadScript =
			!webPreferences.preload ||
			webPreferences.preload === allowedPreloadScriptPath;

		if (!isAllowedPreloadScript) {
			console.warn(
				`[WARNING] [app.web-contents-created.will-attach-webview] Forbidden preload script.`,
			);

			delete webPreferences.preload;
		}

		const parsedSrc = new URL(params.src);
		const isAllowedOrigin = [
			...ALLOWED_INTERNAL_ORIGINS,
			...getUserInstanceOrigins(settings),
		].includes(parsedSrc.origin);

		if (!isAllowedOrigin) {
			console.error(
				`[ERROR] [app.web-contents-created.will-attach-webview] Forbidden origin: ${parsedSrc.origin}`,
			);

			event.preventDefault();
		}
	});
});

/**
 * Presents a question dialog about the given url and executes selected action.
 *
 * @typedef {() => void} Callback
 *
 * @param {string} url
 * @param {{ buttons: [string], onCancel?: Callback, onAllow?: Callback, logLabel?: string}} options
 */
function showNavigationQuestion(url, { buttons, onCancel, onAllow, logLabel }) {
	const mainWindow = getMainWindow();

	const DIALOG_NAVIGATION_ANSWERS = Object.freeze({
		CANCEL: 0,
		ALLOW: 1,
	});
	const decision = dialog.showMessageBoxSync(mainWindow, {
		type: "question",
		title: "Navigation request",
		message: `Do you want to open this website?`,
		detail: toMultiline(url),
		buttons: ["Cancel", ...buttons],
		defaultId: DIALOG_NAVIGATION_ANSWERS.CANCEL,
		cancelId: DIALOG_NAVIGATION_ANSWERS.CANCEL,
	});

	switch (decision) {
		case DIALOG_NAVIGATION_ANSWERS.ALLOW:
			console.log(`[INFO] [${logLabel}.navigation-question] Allow`);
			onAllow?.();
			break;
		case DIALOG_NAVIGATION_ANSWERS.CANCEL:
		default:
			console.log(`[INFO] [${logLabel}.navigation-question] Cancel`);
			onCancel?.();
	}
}

/**
 * @param {import("./settings.js").Settings} settings
 */
function getUserInstanceOrigins(settings) {
	return new Set(settings.instances.map(({ origin }) => origin));
}
