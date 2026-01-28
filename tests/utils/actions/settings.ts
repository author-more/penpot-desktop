import { expect, Page } from "@playwright/test";

export async function openSettings(page: Page) {
	const toggleButton = page.getByRole("button", {
		name: "Toggle settings",
	});

	toggleButton.waitFor({ state: "visible" });
	await toggleButton.click();

	const sidePanel = page.locator("sl-drawer#settings");
	expect(await sidePanel.isVisible()).toBeTruthy();
}

export async function closeSettings(page: Page) {
	const closeButton = page.getByRole("button", {
		name: "Close settings",
	});

	await closeButton.click();
}
