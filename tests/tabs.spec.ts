import { expect, Page, test } from "@playwright/test";
import { describe } from "node:test";
import { TestApp } from "./utils/app.js";

let app: TestApp;
let window: Page;

test.beforeEach(async () => {
	app = new TestApp();
	window = await app.launch();
});

test.afterEach(async () => {
	await app.close();
});

describe("tabs", () => {
	test("should show no tabs screen", async () => {
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
