import { promisify } from "node:util";
import child_process from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { isMacOs, isWindows } from "./platform.js";

const exec = promisify(child_process.exec);
const access = promisify(fs.access);
const stat = promisify(fs.stat);

/**
 * Returns a full path to the command.
 *
 * @param {string} command
 *
 * @returns
 */
export async function getCommandPath(command) {
	return (
		(await getCommandByShell(command)) || (await getCommandFromPath(command))
	);
}

/**
 * Executes shell command to get path if command is available.
 *
 * @param {string} command
 *
 * @returns
 */
async function getCommandByShell(command) {
	const cmd = isWindows()
		? `where "$path:${command}"`
		: `command -v ${command}`;

	try {
		const { stdout } = await exec(cmd);
		if (stdout) {
			const path = isWindows() ? stdout.split("\r")[0] : stdout;
			return path.trim();
		}

		return null;
	} catch (error) {
		return null;
	}
}

/**
 * Checks PATH for the command's executable, returns path if found.
 *
 * @param {string} command
 *
 * @returns
 */
export async function getCommandFromPath(command) {
	const paths = process.env.PATH?.split(path.delimiter) || [];

	if (isMacOs()) {
		paths.push("/usr/local/bin");
	}

	for (const dir of new Set(paths)) {
		const commandPath = path.join(
			dir,
			process.platform === "win32" ? `${command}.exe` : command,
		);

		try {
			// Exclude directories. For example, on Linux, PATH contains `docker` directories.
			const fileStats = await stat(commandPath);
			if (fileStats.isDirectory()) {
				continue;
			}

			await access(commandPath, fs.constants.X_OK);

			return commandPath;
		} catch (error) {
			continue;
		}
	}

	return null;
}
