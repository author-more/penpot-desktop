import { expect, Locator } from "@playwright/test";

const FILL_TIMEOUT = 2000;
const VALUE_TIMEOUT = 500;

/**
 * Fills a field in multiple attempts to ensure the value holds.
 *
 * Structure of Shoelace's web component doesn't play well with Playwright. Playwright targets the element inside the shadow-root which may still have update scheduled through Lit's life-cycle and be overwritten. It creates a race of single-digit milliseconds, negligible in production, but with a decent chance of happening at the speed tests run.
 */
export async function fillField(field: Locator, value: string) {
	await expect(async () => {
		await field.fill(value);
		await expect(field).toHaveValue(value, { timeout: VALUE_TIMEOUT });
	}).toPass({ timeout: FILL_TIMEOUT });
}
