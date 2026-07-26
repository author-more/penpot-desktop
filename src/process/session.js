import { session } from "electron";
import { settings } from "./settings.js";
import { getUserInstanceOrigins } from "./navigation.js";

// Penpot webviews are partitioned and have their own sessions, therefore are not affected by the default session's headers injection.
session.defaultSession.webRequest.onHeadersReceived(
	{ urls: ["file://*/base/index.html"] },
	(details, callback) => {
		const sources = Array.from(getUserInstanceOrigins(settings)).join(" ");
		const sourcePolicies = sources
			? `frame-src ${sources}; child-src ${sources};`
			: "";

		callback({
			responseHeaders: {
				...details.responseHeaders,
				// 'unsafe-inline' is required for electron-tabs (dependency).
				// frame-src/child-src does NOT restrict <webview> navigation. Webview enforcement is done through the navigation guards (will-navigate/will-redirect/setWindowOpenHandler).
				// data: in connect-src is required for Shoelace icons, loaded with fetch from the icon component.
				"Content-Security-Policy": [
					`default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' data:; ${sourcePolicies} object-src 'none'; base-uri 'none'; form-action 'none'`,
				],
			},
		});
	},
);
