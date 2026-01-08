import { ElectronApplication, expect, test } from "@playwright/test";
import { describe } from "node:test";
import { launchElectronApp } from "./utils/app.js";

let electronApp: ElectronApplication;

test.beforeEach(async () => {
	electronApp = await launchElectronApp();
});

test.afterEach(async () => {
	const window = await electronApp.firstWindow();

	await window.close();
	await electronApp.close();
});

describe("tabs", () => {
	test("should show no tabs screen", async () => {
		const window = await electronApp.firstWindow();

		const screen = window.locator(".no-tabs-exist");
		const tabs = window.locator("tab-group .tabs > .tab");

		await expect(screen).toBeHidden();
		await expect(tabs).toHaveCount(1);

		const tab = tabs.first();
		await tab.getByRole("button", { name: "×" }).click();

		await expect(tabs).toHaveCount(0);
		await expect(screen).toBeVisible();
		await expect(screen).toContainText("No tabs are opened");
		await expect(screen).toContainText(
			"Add a new tab to start making awesome things.",
		);
	});

	test("should add a tab from no tabs screen", async () => {
		const window = await electronApp.firstWindow();

		const tabs = window.locator("tab-group .tabs > .tab");
		const tab = tabs.first();
		await tab.getByRole("button", { name: "×" }).click();

		await expect(tabs).toHaveCount(0);

		const addTabButton = window.getByRole("button", {
			name: "Create a tab",
		});
		await addTabButton.waitFor({ state: "visible" });
		await addTabButton.click();

		await expect(tabs).toHaveCount(1);
	});
});
