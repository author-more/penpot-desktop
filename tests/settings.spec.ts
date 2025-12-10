import { ElectronApplication, expect, Page, test } from "@playwright/test";
import { describe } from "node:test";
import { launchElectronApp } from "./utils/app.js";
import { getFile, saveFile } from "./utils/fs.js";
import { join } from "node:path";

let electronApp: ElectronApplication;
let userDataPath: string;

const CONFIG_NAME = "settings.json";

const DEFAULT_CONFIG = {
	theme: "system",
	titleBarType: "overlay",
	instances: [
		{
			origin: "http://localhost:9008",
			label: "Official",
			color: "hsla(0, 0%, 0%, 0)",
			isDefault: false,
			id: "f6657e6b-4b07-4320-8a3a-9ead32f9549a",
		},
	],
};

test.beforeEach(async () => {
	electronApp = await launchElectronApp();
	userDataPath = await electronApp.evaluate(async ({ app }) => {
		return app.getPath("userData");
	});
});

test.afterEach(async () => {
	saveFile(join(userDataPath, CONFIG_NAME), DEFAULT_CONFIG);

	await electronApp.close();
});

describe("settings", () => {
	const openSettings = async (page: Page) => {
		const toggleButton = page.getByRole("button", {
			name: "Toggle settings",
		});

		toggleButton.waitFor({ state: "visible" });
		await toggleButton.click();

		const sidePanel = page.locator("sl-drawer#settings");
		expect(await sidePanel.isVisible()).toBeTruthy();
	};

	test("should open", async () => {
		const window = await electronApp.firstWindow();

		await openSettings(window);
	});

	test("should control theme", async () => {
		const window = await electronApp.firstWindow();

		await openSettings(window);

		const selector = window.locator("sl-select#theme-select");
		await selector.waitFor({ state: "visible" });

		for (const newValue of ["light", "dark", "system"]) {
			await selector.click();

			const option = selector.locator(`sl-option[value="${newValue}"]`);
			await option.waitFor({ state: "visible" });
			await option.click();
			await option.waitFor({ state: "hidden" });

			const appThemePropertyValue = await electronApp.evaluate(
				async ({ nativeTheme }) => {
					return nativeTheme.themeSource;
				},
			);

			expect(appThemePropertyValue).toBe(newValue);

			const config = await getFile(join(userDataPath, CONFIG_NAME));
			expect(config.theme).toBe(newValue);
		}
	});

	describe("instance", () => {
		test("should add/remove item", async () => {
			const window = await electronApp.firstWindow();

			await openSettings(window);

			const itemList = window.locator("#instance-list .panel");
			await expect(itemList).toHaveCount(1);

			const addItemButton = window.getByRole("button", {
				name: "Add instance",
			});
			await addItemButton.click();

			await expect(itemList).toHaveCount(2);
			expect((await getConfig()).instances.length).toBe(2);

			const newItem = itemList.last();
			const instanceSettingsButton = newItem.getByRole("button", {
				name: "Open settings",
			});
			await instanceSettingsButton.click();

			const instanceSettingsModal = window.locator(
				"sl-dialog#instance-creator-dialog",
			);
			const deleteItemButton = instanceSettingsModal.getByRole("button", {
				name: "Delete instance",
			});
			await deleteItemButton.click();

			await expect(itemList).toHaveCount(1);
			expect((await getConfig()).instances.length).toBe(1);
		});

		test("should edit label", async () => {
			const window = await electronApp.firstWindow();
			const currentValue = "Official";
			const newValue = "Local instance";

			await openSettings(window);

			const itemList = window.locator("#instance-list .panel");
			const item = itemList.first();

			const instanceSettingsButton = item.getByRole("button", {
				name: "Open settings",
			});
			await instanceSettingsButton.click();

			const instanceSettingsModal = window.locator(
				"sl-dialog#instance-creator-dialog",
			);

			const field = instanceSettingsModal.getByLabel("Label");

			await expect(field).toHaveValue(currentValue);
			await field.fill(newValue);
			await expect(field).toHaveValue(newValue);

			const updateItemButton = instanceSettingsModal.getByRole("button", {
				name: "Update",
			});
			await updateItemButton.click();

			expect(item).toContainText(newValue);
			const config = await getFile(join(userDataPath, CONFIG_NAME));
			expect(config.instances[0].label).toBe(newValue);
		});

		test("should edit origin", async () => {
			const window = await electronApp.firstWindow();
			const currentValue = "http://localhost:9008";
			const newValue = "http://localhost:9009";

			await openSettings(window);

			const itemList = window.locator("#instance-list .panel");
			const item = itemList.first();

			const instanceSettingsButton = item.getByRole("button", {
				name: "Open settings",
			});
			await instanceSettingsButton.click();

			const instanceSettingsModal = window.locator(
				"sl-dialog#instance-creator-dialog",
			);

			const field = instanceSettingsModal.getByLabel("Origin");

			await expect(field).toHaveValue(currentValue);
			await field.fill(newValue);
			await expect(field).toHaveValue(newValue);

			const updateItemButton = instanceSettingsModal.getByRole("button", {
				name: "Update",
			});
			await updateItemButton.click();

			expect(item).toContainText(newValue);
			const config = await getFile(join(userDataPath, CONFIG_NAME));
			expect(config.instances[0].origin).toBe(newValue);
		});

		test("should set default", async () => {
			const window = await electronApp.firstWindow();

			await openSettings(window);

			const itemList = window.locator("#instance-list .panel");
			const addItemButton = window.getByRole("button", {
				name: "Add instance",
			});
			await addItemButton.click();

			await expect(itemList).toHaveCount(2);
			expect((await getConfig()).instances[1].isDefault).toBe(false);

			const newItem = itemList.last();
			newItem.click({ button: "right" });

			const contextMenu = window.locator("#context-menu sl-menu");
			await contextMenu.waitFor({ state: "visible" });
			const setDefaultOption = contextMenu.getByRole("menuitem", {
				name: "Set as default",
			});
			await setDefaultOption.click();
			await contextMenu.waitFor({ state: "hidden" });

			expect((await getConfig()).instances[1].isDefault).toBe(true);

			const instanceSettingsButton = newItem.getByRole("button", {
				name: "Open settings",
			});
			await instanceSettingsButton.click();

			const instanceSettingsModal = window.locator(
				"sl-dialog#instance-creator-dialog",
			);
			const deleteItemButton = instanceSettingsModal.getByRole("button", {
				name: "Delete instance",
			});

			await expect(deleteItemButton).toBeDisabled();
		});
	});
});

async function getConfig() {
	const configPath = join(userDataPath, CONFIG_NAME);
	return await getFile(configPath);
}
