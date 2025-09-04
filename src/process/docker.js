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
 * @typedef {Object} TagImage
 * @property {string} architecture
 * @property {string} features
 * @property {string|null} variant
 * @property {string} digest
 * @property {string} os
 * @property {string} os_features
 * @property {string|null} os_version
 * @property {number} size
 * @property {string} status
 * @property {string} last_pulled
 * @property {string} last_pushed
 */

/**
 * @typedef {Object} Tag
 * @property {number} creator
 * @property {number} id
 * @property {TagImage[]} images
 * @property {string} last_updated
 * @property {number} last_updater
 * @property {string} last_updater_username
 * @property {string} name
 * @property {number} repository
 * @property {number} full_size
 * @property {boolean} v2
 * @property {string} tag_status
 * @property {string} tag_last_pulled
 * @property {string} tag_last_pushed
 * @property {string} media_type
 * @property {string} content_type
 * @property {string} digest
 */

/**
 * @typedef {Object} Tags
 * @property {number} count
 * @property {string|null} next
 * @property {string|null} previous
 * @property {Tag[]} results
 */

/**
 * @typedef {import("zod").z.infer<typeof import("./instance.js").localInstanceConfig>} LocalInstanceConfig
 *
 * @typedef {Object} CommandOptions
 * @property {boolean =} isSudoEnabled
 * @property {boolean =} isInstanceTelemetryEnabled
 */

export const DOCKER_REPOSITORIES = Object.freeze({
	FRONTEND: "penpotapp/frontend",
});

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
 * Retrieves the list of available Docker tags.
 *
 * @param {string} repository
 */
export async function getAvailableTags(repository) {
	try {
		const res = await fetch(
			`https://hub.docker.com/v2/repositories/${repository}/tags`,
		);

		if (!res.ok) {
			return [];
		}

		const { results } = /** @type {Tags}*/ (await res.json());
		const tags = results.map(({ name }) => name);

		return tags;
	} catch (error) {
		return [];
	}
}
/**
 * Checks if a specific Docker tag is available.
 *
 * @param {string} repository
 * @param {string} tag
 */
export async function isTagAvailable(repository, tag) {
	try {
		const res = await fetch(
			`https://hub.docker.com/v2/repositories/${repository}/tags/${tag}`,
		);

		if (!res.ok) {
			return false;
		}

		const { tag_status } = /** @type {Tag}*/ (await res.json());
		const isActive = tag_status === "active";

		return isActive;
	} catch (error) {
		return false;
	}
}

/**
 * Creates and starts containers
 *
 * @typedef {LocalInstanceConfig["ports"]} ContainerPorts
 *
 * @param {"up" | "pull"} command
 * @param {string} containerNamePrefix
 * @param {Tag["name"]} tag
 * @param {ContainerPorts} ports
 * @param {CommandOptions} options
 */
export async function compose(
	command,
	containerNamePrefix,
	tag,
	{ frontend: frontendPort, mailcatch: mailcatchPort },
	{ isSudoEnabled, isInstanceTelemetryEnabled } = {},
) {
	if (!dockerPath) {
		throw new AppError(ERROR_CODES.MISSING_DOCKER, "Docker command not found.");
	}

	if (!(await isTagAvailable(DOCKER_REPOSITORIES.FRONTEND, tag))) {
		throw new AppError(
			ERROR_CODES.DOCKER_TAG_UNAVAILABLE,
			`Tag ${tag} is not available.`,
		);
	}

	const dockerComposeFilePath = await deployComposeFile();
	const instanceTelemetryFlag = `${isInstanceTelemetryEnabled ? "enable" : "disable"}-telemetry`;

	const envVariables = {
		PENPOT_VERSION: `${tag}`,
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
	const commandString = command === "up" ? "up -d" : "pull";
	const dockerComposeCommand = `"${dockerPath}" compose -p ${containerNamePrefix} -f "${dockerComposeFilePath}" ${commandString}`;

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
			error instanceof Error
				? error.message
				: `Failed to run Docker's compose ${command} command.`;

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
