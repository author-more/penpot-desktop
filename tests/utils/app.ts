import { _electron as electron } from "@playwright/test";
import { platform } from "node:process";

export function launchElectronApp() {
	return electron.launch({
		// Instead of changing the sandbox binary permissions in the CI environment, which would affect the entire pipeline unless jobs run isolated, sandbox is disabled for Linux in tests.
		// https://github.com/electron/electron/issues/17972
		args: [process.cwd(), platform === "linux" ? "--no-sandbox" : ""],
		env: {
			...process.env,
			CI: "1",
		},
	});
}
