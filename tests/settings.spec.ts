import { expect, test } from "@playwright/test";
import { describe } from "node:test";
import { TestApp } from "./utils/app.js";
import { Config } from "./utils/config.js";
import { expectUUID } from "./utils/assertions.js";
import { openSettings, selectTheme } from "./utils/actions/settings.js";
import { clickContextMenu } from "./utils/actions/contextMenu.js";

let app: TestApp;
let config: Config;

const CONFIG_NAME = "settings.json";

const DEFAULT_INSTANCE = {
	origin: "http://localhost:9008",
	label: "Official",
	color: "hsla(0, 0%, 0%, 0)",
	isDefault: false,
	id: "f6657e6b-4b07-4320-8a3a-9ead32f9549a",
};
const DEFAULT_CONFIG = {
	theme: "system",
	titleBarType: "overlay",
	instances: [DEFAULT_INSTANCE],
};

test.beforeEach(async () => {
	app = new TestApp();
	config = new Config(app.userDataPath, CONFIG_NAME);
});

test.afterEach(async () => {
	await app.destroy();
});

describe("settings", () => {
	test("should open", async () => {
		const window = await launchApp();

		await openSettings(window);
	});

	test("should control theme", async () => {
		const window = await launchApp();

		await openSettings(window);

		for (const newValue of ["light", "dark", "system"]) {
			await selectTheme(window, newValue);

			const appThemePropertyValue = await app.electron.evaluate(
				async ({ nativeTheme }) => {
					return nativeTheme.themeSource;
				},
			);

			expect(appThemePropertyValue).toBe(newValue);

			await expect
				.poll(() => config.readSettled())
				.toMatchObject({ theme: newValue });
		}
	});

	describe("instance", () => {
		test("should add/remove item", async () => {
			const window = await launchApp();

			await openSettings(window);

			const itemList = window.locator("#instance-list .panel");
			await expect(itemList).toHaveCount(1);

			const addItemButton = window.getByRole("button", {
				name: "Add instance",
			});
			await addItemButton.click();

			await expect(itemList).toHaveCount(2);
			await expect
				.poll(async () => (await config.readSettled())?.instances.length)
				.toBe(2);

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
			await expect
				.poll(async () => (await config.readSettled())?.instances.length)
				.toBe(1);
		});

		test("should edit label", async () => {
			const window = await launchApp();
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

			await expect(item).toContainText(newValue);
			await expect
				.poll(() => config.readSettled())
				.toMatchObject({ instances: [{ label: newValue }] });
		});

		test("should edit origin", async () => {
			const window = await launchApp();
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

			await expect(item).toContainText(newValue);
			await expect
				.poll(() => config.readSettled())
				.toMatchObject({ instances: [{ origin: newValue }] });
		});

		test("should set default", async () => {
			const window = await launchApp();

			await openSettings(window);

			const itemList = window.locator("#instance-list .panel");
			const addItemButton = window.getByRole("button", {
				name: "Add instance",
			});
			await addItemButton.click();

			await expect(itemList).toHaveCount(2);
			await expect
				.poll(async () => (await config.readSettled())?.instances[1]?.isDefault)
				.toBe(false);

			const newItem = itemList.last();
			await clickContextMenu(window, newItem, "Set as default");

			await expect
				.poll(async () => (await config.readSettled())?.instances[1]?.isDefault)
				.toBe(true);

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

	describe("config", () => {
		test("should save values derived from an instance's schema", async () => {
			const window = await launchApp({
				instances: [{ origin: DEFAULT_INSTANCE.origin, label: "Official" }],
			});
			expect(window).toBeDefined();

			await expect
				.poll(() => config.readSettled())
				.toEqual({
					instances: [
						{
							...DEFAULT_INSTANCE,
							id: expectUUID,
							isDefault: true,
						},
					],
				});
		});

		test("should save a generated default instance", async () => {
			const window = await launchApp({ theme: "dark" });
			expect(window).toBeDefined();

			await expect
				.poll(() => config.readSettled())
				.toEqual({
					theme: "dark",
					instances: [
						{
							...DEFAULT_INSTANCE,
							id: expectUUID,
							isDefault: true,
						},
					],
				});
		});

		test("should keep a generated instance id between launches", async () => {
			const window = await launchApp({
				instances: [{ origin: DEFAULT_INSTANCE.origin, label: "Official" }],
			});
			expect(window).toBeDefined();

			await expect
				.poll(() => config.readSettled())
				.toMatchObject({
					instances: [{ id: expectUUID }],
				});
			const { instances } = await config.read();

			const relaunchedWindow = await app.launch();
			await openSettings(relaunchedWindow);

			await expect.poll(() => config.readSettled()).toEqual({ instances });
		});

		test("should retain unknown properties", async () => {
			const window = await launchApp({
				...DEFAULT_CONFIG,
				customProperty: true,
			});

			await openSettings(window);
			await selectTheme(window, "dark");

			await expect
				.poll(() => config.readSettled())
				.toMatchObject({
					theme: "dark",
					titleBarType: "overlay",
					customProperty: true,
				});
		});

		test("should not rewrite a config without changes", async () => {
			const settings = {
				...DEFAULT_CONFIG,
				instances: [{ ...DEFAULT_INSTANCE, isDefault: true }],
			};

			await config.save(settings);
			const modificationTime = await config.getModificationTime();

			const window = await app.launch();
			expect(window).toBeDefined();

			expect(await config.read()).toEqual(settings);
			expect(await config.getModificationTime()).toBe(modificationTime);
		});
	});
});

async function launchApp(settings: Record<string, unknown> = DEFAULT_CONFIG) {
	await config.save(settings);

	return await app.launch();
}
