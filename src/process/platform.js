import { getMainWindow } from "./window.js";

export function applyDirectStyling() {
	const mainWindow = getMainWindow();

	if (process.platform === "darwin") {
		setTimeout(() => {
			mainWindow.webContents.executeJavaScript(
				`document.querySelector("tab-group").shadowRoot.querySelector("nav").style.left = '80px'`,
			);
			mainWindow.webContents.executeJavaScript(
				`document.querySelector(".controls").style.left = '75px'`,
			);
		}, 1500);
	}
}
