/**
 * Preload script's have limited import possibilities, channel names have to be updated manually.
 */
export const FILE_EVENTS = Object.freeze({
	PREPARE_PATH: "file:prepare-path",
	EXPORT: "file:export",
});

/**
 * @typedef {Object} FileInfo
 * @property {string} name - The name of the file.
 * @property {string} projectName - The name of the project.
 *
 * JSDoc doesn't support Object extension: https://github.com/jsdoc/jsdoc/issues/1199
 * @typedef {FileInfo & {data: ArrayBuffer}} File
 */

/**
 * @param {Object} obj
 *
 * @returns {obj is File}
 */
export function isFile(obj) {
	return isFileInfo(obj) && "data" in obj && obj.data instanceof ArrayBuffer;
}

/**
 * @param {Object} obj
 *
 * @returns {obj is FileInfo}
 */
export function isFileInfo(obj) {
	return (
		!!obj && typeof obj === "object" && "name" in obj && "projectName" in obj
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

/**
 * @param {Array<Object>} arr
 *
 * @returns {arr is Array<FileInfo>}
 */
export function isArrayOfFileInfos(arr) {
	return Array.isArray(arr) && arr.every(isFileInfo);
}
