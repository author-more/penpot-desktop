import { promisify } from "node:util";
import child_process from "node:child_process";
import path from "node:path";
import { app } from "electron";
import { AppError, ERROR_CODES } from "../tools/error.js";
import { getCommandPath } from "./path.js";
import { constants as fsConstants, copyFile } from "node:fs/promises";
import { sudoExec } from "./childProcess.js";
import { isLinux } from "./platform.js";

const exec = promisify(child_process.exec);

/**
 * @typedef {import("zod").z.infer<typeof import("./instance.js").localInstanceConfig>} LocalInstanceConfig
 *
 * @typedef {Object} CommandOptions
 * @property {boolean =} isSudoEnabled
 * @property {boolean =} isInstanceTelemetryEnabled
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
		await exec(`"${dockerPath}" --version`);
		await exec(`"${dockerPath}" compose version`);

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
 * @param {CommandOptions} options
 */
export async function composeUp(
	containerNamePrefix,
	{ frontend: frontendPort, mailcatch: mailcatchPort },
	{ isSudoEnabled, isInstanceTelemetryEnabled } = {},
) {
	if (!dockerPath) {
		throw new AppError(ERROR_CODES.MISSING_DOCKER, "Docker command not found.");
	}

	const dockerComposeFilePath = await deployComposeFile();
	const instanceTelemetryFlag = `${isInstanceTelemetryEnabled ? "enable" : "disable"}-telemetry`;

	const envVariables = {
		PENPOT_DESKTOP_FRONTEND_PORT: `${frontendPort}`,
		PENPOT_DESKTOP_MAILCATCH_PORT: `${mailcatchPort}`,
		PENPOT_DESKTOP_FLAGS: `${instanceTelemetryFlag}`,
		PENPOT_DESKTOP_BACKEND_TELEMETRY: `${isInstanceTelemetryEnabled}`,
	};
	const envVariablesCommandString = Object.entries(envVariables).reduce(
		(envVarString, [key, value]) => {
			return `${envVarString} ${key}=${value}`;
		},
		"",
	);
	const dockerComposeCommand = `"${dockerPath}" compose -p ${containerNamePrefix} -f "${dockerComposeFilePath}" up -d`;

	try {
		const optionEnv = {
			env: { ...process.env, ...envVariables },
		};

		if (isSudoEnabled) {
			// Variables from the `env` option are excluded by `pkexec` and `kdesudo`. On Linux they will be set with the command.
			const command = isLinux()
				? `${envVariablesCommandString} ${dockerComposeCommand}`
				: dockerComposeCommand;

			await sudoExec(command, {
				...sudoOptions,
				...(!isLinux() && optionEnv),
			});
		} else {
			await exec(dockerComposeCommand, {
				...optionEnv,
			});
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to set up an instance.";

		throw new AppError(ERROR_CODES.DOCKER_FAILED_SETUP, message);
	}
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
