import { expect, Page } from "@playwright/test";

export async function openSettings(page: Page) {
	const toggleButton = page.getByRole("button", {
		name: "Toggle settings",
	});

	await toggleButton.waitFor({ state: "visible" });
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

export async function selectTheme(page: Page, theme: string) {
	const selector = page.locator("sl-select#theme-select");
	await selector.waitFor({ state: "visible" });
	await selector.click();

	const option = selector.locator(`sl-option[value="${theme}"]`);
	await option.waitFor({ state: "visible" });
	await option.click();
	await option.waitFor({ state: "hidden" });
}
