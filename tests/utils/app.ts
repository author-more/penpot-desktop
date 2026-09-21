import { _electron as electron, ElectronApplication } from "@playwright/test";
import { platform } from "node:process";

type LaunchOptions = {
	/**
	 * Directory for the application's data e.g. configs, partitions. Isolates a test run from the installed app's data and other tests.
	 */
	userDataPath?: string;
};

export class TestApp {
	#options: LaunchOptions;
	#electronApp: ElectronApplication | undefined;

	constructor(options: LaunchOptions = {}) {
		this.#options = options;
	}

	/**
	 * Launches the application and returns its main window. A running instance is closed first, which makes the method double as a relaunch.
	 */
	async launch() {
		await this.close();

		this.#electronApp = await launchApp(this.#options);

		const window = await this.#electronApp.firstWindow();
		// `firstWindow()` resolves before the renderer's modules have evaluated, affecting process<->renderer events.
		await window.waitForLoadState("domcontentloaded");

		return window;
	}

	async close() {
		if (!this.#electronApp) {
			return;
		}

		// Report an application that closed or lost its window during a test.
		// Waiting for one, e.g. with `firstWindow()`, hangs a case.
		const hasWindow = !!this.#electronApp.windows().length;

		await this.#electronApp.close();
		this.#electronApp = undefined;

		if (!hasWindow) {
			throw new Error("The application had no window to close.");
		}
	}

	/**
	 * The Electron application handle, e.g. to evaluate code in the main process.
	 */
	get electron() {
		if (!this.#electronApp) {
			throw new Error("The application hasn't been launched.");
		}

		return this.#electronApp;
	}
}

function launchApp({ userDataPath }: LaunchOptions = {}) {
	return electron.launch({
		args: [
			process.cwd(),
			// Instead of changing the sandbox binary permissions in the CI environment, which would affect the entire pipeline unless jobs run isolated, sandbox is disabled for Linux in tests.
			// https://github.com/electron/electron/issues/17972
			...(platform === "linux" ? ["--no-sandbox"] : []),
			...(userDataPath ? [`--user-data-dir=${userDataPath}`] : []),
		],
		env: {
			...process.env,
			CI: "1",
		},
	});
}
