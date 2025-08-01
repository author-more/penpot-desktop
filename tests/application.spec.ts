import { ElectronApplication, expect, test } from "@playwright/test";
import { describe } from "node:test";
import { launchElectronApp } from "./utils/app.js";

let electronApp: ElectronApplication;

test.beforeAll(async () => {
	electronApp = await launchElectronApp();
});

test.afterAll(async () => {
	await electronApp.close();
});

describe("application", () => {
	test("should open main window", async () => {
		const window = await electronApp.firstWindow();

		expect(window).toBeDefined();
		expect(await window.title()).toBe("Penpot Desktop");
	});
});
