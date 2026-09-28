import { shell } from "electron";

const ALLOWED_BROWSER_PROTOCOLS = Object.freeze(["http:", "https:"]);

/**
 * Opens a URL in a browser.
 *
 * Only web URLs (http, https) are allowed.
 *
 * @param {string} url
 */
export async function openInBrowser(url) {
	const parsedUrl = URL.canParse(url) && new URL(url);
	const isWebUrl =
		parsedUrl && ALLOWED_BROWSER_PROTOCOLS.includes(parsedUrl.protocol);

	if (!isWebUrl) {
		console.warn(
			`[WARNING] [browser.open] Forbidden external URL: ${url}. Only web URLs (http, https) are allowed.`,
		);
		return;
	}

	await shell.openExternal(parsedUrl.href);
}
