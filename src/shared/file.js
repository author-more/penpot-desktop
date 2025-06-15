/**
 * Preload script's have limited import possibilities, channel names have to be updated manually.
 */
export const FILE_EVENTS = Object.freeze({
	PREPARE_PATH: "file:prepare-path",
	EXPORT: "file:export",
});

/**
 * @typedef {Object} File
 * @property {string} name - The name of the file.
 * @property {string} projectName - The name of the project.
 * @property {ArrayBuffer =} data - The file data.
 */

/**
 * @param {Object} obj
 *
 * @returns {obj is File}
 */
export function isFile(obj) {
	return (
		!!obj &&
		typeof obj === "object" &&
		Object.hasOwn(obj, "name") &&
		Object.hasOwn(obj, "projectName")
	);
}

/**
 * @param {Array<Object>} arr
 *
 * @returns {arr is Array<File>}
 */
export function isArrayOfFiles(arr) {
	return Array.isArray(arr) && arr.every(isFile);
}
