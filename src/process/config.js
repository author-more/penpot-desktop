import { app } from "electron";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * @template Config
 *
 * @param {string} configName
 *
 * @returns {Promise<Config | undefined>}
 */
export async function readConfig(configName) {
	const configFilePath = getConfigFilePath(configName);

	try {
		const configData = await readFile(configFilePath, "utf8");
		const config = configData && JSON.parse(configData);

		return config;
	} catch (error) {
		const isError = error instanceof Error;
		const isNoFile = isError && "code" in error && error.code === "ENOENT";
		const message = `[ERROR] [config:read:${configName}] ${isError ? error.message : "Failed to read config."}`;

		if (isError && !isNoFile) {
			throw new Error(message, {
				cause: error,
			});
		}

		console.error(message);
	}
}

/**
 * @template Config
 *
 * @param {string} configName
 * @param {Partial<Config>} config
 */
export function writeConfig(configName, config) {
	const configFilePath = getConfigFilePath(configName);

	try {
		const configJSON = JSON.stringify(config, null, "\t");
		writeFile(configFilePath, configJSON, "utf8");
	} catch (error) {
		const isError = error instanceof Error;
		const message = isError ? error.message : "Failed to save the  config.";
		console.error(`[ERROR] [config:write:${configName}] ${message}`);
	}
}

/**
 * @param {string} configName
 * @param {string =} suffix
 */
export function duplicateConfig(configName, suffix) {
	const configFilePath = getConfigFilePath(configName);
	const modifier = suffix ? `.${suffix}` : "";
	const configFileCopyPath = getConfigFilePath(`${configName}${modifier}`);

	try {
		copyFile(configFilePath, configFileCopyPath);
	} catch (error) {
		const isError = error instanceof Error;
		const message = isError
			? error.message
			: "Failed to duplicate the  config.";
		console.error(`[ERROR] [config:duplicate:${configName}] ${message}`);
	}
}

/**
 * @param {string} configName
 *
 * @returns
 */
function getConfigFilePath(configName) {
	const configDir = app.getPath("userData");

	return join(configDir, `${configName}.json`);
}
