import {
	_electron as electron,
	ElectronApplication,
	expect,
	test,
} from "@playwright/test";
import { describe } from "node:test";
import { platform } from "node:process";

let electronApp: ElectronApplication;

test.beforeAll(async () => {
	electronApp = await electron.launch({
		// Instead of changing the sandbox binary permissions in the CI environment, which would affect the entire pipeline unless jobs run isolated, sandbox is disabled for Linux in tests.
		// https://github.com/electron/electron/issues/17972
		args: [process.cwd(), platform === "linux" ? "--no-sandbox" : ""],
		env: {
			...process.env,
			CI: "1",
		},
	});
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
