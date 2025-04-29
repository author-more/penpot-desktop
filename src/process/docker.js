import util from "node:util";
import child_process from "node:child_process";
import { exec as sudoExec } from "@vscode/sudo-prompt";
import path from "node:path";
import { app } from "electron";
import { AppError, ERROR_CODES } from "../tools/error.js";

const exec = util.promisify(child_process.exec);

/**
 * @typedef {import("zod").z.infer<typeof import("./instance.js").localInstanceConfig>} LocalInstanceConfig
 */

const sudoOptions = {
	name: "Penpot Desktop",
};
const dockerComposeFilePath = path.join(
	app.getAppPath(),
	"bin/docker-compose.yaml",
);

export async function isDockerAvailable() {
	try {
		await exec("docker --version");
		await exec("docker compose version");

		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Creates and starts containers
 *
 * @typedef {LocalInstanceConfig["ports"]} ContainerPorts
 *
 * @param {string} containerNamePrefix
 * @param {ContainerPorts} ports
 */
export async function composeUp(
	containerNamePrefix,
	{ frontend: frontendPort, mailcatch: mailcatchPort },
) {
	const dockerComposeCommand = `PENPOT_DESKTOP_FRONTEND_PORT=${frontendPort} PENPOT_DESKTOP_MAILCATCH_PORT=${mailcatchPort} docker compose -p ${containerNamePrefix} -f ${dockerComposeFilePath} up -d`;

	return new Promise((resolve, reject) => {
		sudoExec(dockerComposeCommand, sudoOptions, (error) => {
			if (error) {
				reject(new AppError(ERROR_CODES.FAILED_CONTAINER_SETUP, error.message));
			}

			resolve(true);
		});
	});
}
