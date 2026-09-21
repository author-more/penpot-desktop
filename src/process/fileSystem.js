import { readdir } from "node:fs/promises";

/**
 * Returns the directory names in a given path.
 *
 * @param {string} path
 */
export async function getDirNamesForPath(path) {
	try {
		return (await readdir(path, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map(({ name }) => name);
	} catch (error) {
		const isError = error instanceof Error;
		const message = isError ? error.message : "Failed to read directory names.";

		console.error(`[ERROR] [fileSystem:dirNamesRead:${path}] ${message}`);
	}
}
