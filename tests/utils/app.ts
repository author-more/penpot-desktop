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

		this.#electronApp = await launchElectronApp(this.#options);

		return await this.#electronApp.firstWindow();
	}

	async close() {
		if (!this.#electronApp) {
			return;
		}

		const window = await this.#electronApp.firstWindow();

		await window.close();
		await this.#electronApp.close();

		this.#electronApp = undefined;
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

export function launchElectronApp({ userDataPath }: LaunchOptions = {}) {
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
