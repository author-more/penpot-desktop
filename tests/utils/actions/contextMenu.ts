import { Locator, Page } from "@playwright/test";

export async function clickContextMenu(
	menuHost: Page,
	menuTrigger: Locator,
	targetMenuItemName: string,
) {
	menuTrigger.click({ button: "right" });

	const contextMenu = menuHost.locator("#context-menu sl-menu");
	await contextMenu.waitFor({ state: "visible" });
	const targetMenuItem = contextMenu.getByRole("menuitem", {
		name: targetMenuItemName,
	});
	await targetMenuItem.click();

	await contextMenu.waitFor({ state: "hidden" });
}
