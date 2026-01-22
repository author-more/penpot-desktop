import { ElectronApplication, expect, test } from "@playwright/test";
import { describe } from "node:test";
import { launchElectronApp } from "./utils/app.js";
import { execFileSync } from "node:child_process";
import { closeSettings, openSettings } from "./utils/actions/settings.js";
import { SlCheckbox } from "@shoelace-style/shoelace";
import { clickContextMenu } from "./utils/actions/contextMenu.js";
import { platform } from "node:process";

const LOCAL_INSTANCE_LABEL = "Local instance";

let electronApp: ElectronApplication;

test.beforeAll(async () => {
	electronApp = await launchElectronApp();
});

test.afterAll(async () => {
	const window = await electronApp.firstWindow();

	await window.close();
	await electronApp.close();

	// In-app instance deletion doesn't remove an instance's containers.
	try {
		execFileSync("./bin/deleteDockerContainers.sh", []);
	} catch (error) {
		if (error instanceof Error && "code" in error) {
			console.error(error.code);
		}
	}
});

describe("local instance", () => {
	// In GH Actions, macOS runners don't support Docker, and Windows runners can't run Linux containers. Local instance setup will be tested on Linux only, which leaves a testing hole around command strings.
	test.skip(() => platform !== "linux");

	test("should create and remove instance", async () => {
		const window = await electronApp.firstWindow();

		await openSettings(window);
		const openLocalWizardButton = window.getByRole("button", {
			name: "Create local instance",
		});
		await openLocalWizardButton.click();

		const instanceSettingsModal = window.locator(
			"sl-dialog#instance-creator-dialog",
		);

		const field = instanceSettingsModal.getByLabel("Label");
		await expect(field).toBeEmpty();
		await field.fill(LOCAL_INSTANCE_LABEL);

		// Playwright's uncheck and click are confused by SlCheckbox's event handling and have no effect on the checkbox. The checked state is being switched directly with the DOM element's method.
		const slCheckbox = instanceSettingsModal.locator(
			'sl-checkbox [name="enableInstanceTelemetry"]',
		);
		await slCheckbox.evaluate((element: SlCheckbox) => {
			element.click();
		});
		await expect(slCheckbox).not.toBeChecked();

		const createButton = instanceSettingsModal.getByRole("button", {
			name: "Create",
		});
		await createButton.click();
		await expect(createButton).toContainClass("button--loading");
		await expect(createButton).not.toContainClass("button--loading", {
			timeout: 1000 * 30,
		});

		const closeButton = instanceSettingsModal
			.locator(".footer")
			.getByRole("button", {
				name: "Close",
			});
		await closeButton.click();

		const itemList = window.locator("#instance-list .panel");
		await expect(itemList).toHaveCount(2);

		const newItem = itemList.last();
		await expect(newItem).toContainText(LOCAL_INSTANCE_LABEL);
		await expect(newItem).toContainText("http://localhost:9001");

		await closeSettings(window);

		const tabsPanel = window.locator("tab-group");
		const addTab = tabsPanel.getByRole("button", { name: "＋" });

		await clickContextMenu(window, addTab, LOCAL_INSTANCE_LABEL);

		const views = tabsPanel.locator(".views > webview");
		await expect(views).toHaveCount(2);
		await expect(await views.nth(1).getAttribute("src")).toContain(
			"http://localhost:9001",
		);

		const tabs = tabsPanel.locator(".tabs > .tab");
		const tab = tabs.nth(1);
		await tab.getByRole("button", { name: "×" }).click();

		await openSettings(window);

		const instanceSettingsButton = newItem.getByRole("button", {
			name: "Open settings",
		});
		await instanceSettingsButton.click();

		const deleteItemButton = instanceSettingsModal.getByRole("button", {
			name: "Delete instance",
		});
		await deleteItemButton.click();

		await expect(itemList).toHaveCount(1);
	});
});
