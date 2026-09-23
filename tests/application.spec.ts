import { expect, Page, test } from "@playwright/test";
import { describe } from "node:test";
import { TestApp } from "./utils/app.js";

let app: TestApp;
let window: Page;

test.beforeAll(async () => {
	app = new TestApp();
	window = await app.launch();
});

test.afterAll(async () => {
	await app.destroy();
});

describe("application", () => {
	test("should open main window", async () => {
		expect(window).toBeDefined();
		expect(await window.title()).toBe("Penpot Desktop");
	});
});
