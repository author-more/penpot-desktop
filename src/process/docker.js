import { promisify } from "node:util";
import child_process from "node:child_process";
import { exec as sudoExec } from "@vscode/sudo-prompt";
import path from "node:path";
import { app } from "electron";
import { AppError, ERROR_CODES } from "../tools/error.js";
import { getCommandPath } from "./path.js";
import { constants as fsConstants, copyFile } from "node:fs/promises";

const exec = promisify(child_process.exec);

/**
 * @typedef {import("zod").z.infer<typeof import("./instance.js").localInstanceConfig>} LocalInstanceConfig
 */

const sudoOptions = {
	name: "Penpot Desktop",
};
const dockerPath = await getCommandPath("docker");

export async function isDockerAvailable() {
	if (!dockerPath) {
		return false;
	}

	try {
		await exec(`${dockerPath} --version`);
		await exec(`${dockerPath} compose version`);

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
	if (!dockerPath) {
		throw new AppError(ERROR_CODES.MISSING_DOCKER, "Docker command not found.");
	}

	const dockerComposeFilePath = await deployComposeFile();
	const dockerComposeCommand = `PENPOT_DESKTOP_FRONTEND_PORT=${frontendPort} PENPOT_DESKTOP_MAILCATCH_PORT=${mailcatchPort} ${dockerPath} compose -p ${containerNamePrefix} -f '${dockerComposeFilePath}' up -d`;

	return new Promise((resolve, reject) => {
		sudoExec(dockerComposeCommand, sudoOptions, (error) => {
			if (error) {
				reject(new AppError(ERROR_CODES.FAILED_CONTAINER_SETUP, error.message));
			}

			resolve(true);
		});
	});
}

async function deployComposeFile() {
	const fileName = "docker-compose.yaml";
	const composeFileAsarPath = path.join(app.getAppPath(), "bin", fileName);
	const deployPath = path.join(app.getPath("userData"), fileName);

	try {
		await copyFile(composeFileAsarPath, deployPath, fsConstants.COPYFILE_EXCL);
	} catch (error) {
		const isError = error instanceof Error;
		const isExistingFile =
			isError && "code" in error && error.code === "EEXIST";

		if (!isExistingFile) {
			throw new AppError(
				ERROR_CODES.FAILED_CONFIG_DEPLOY,
				"Failed to deploy Docker Compose config.",
			);
		}
	}

	return deployPath;
}
