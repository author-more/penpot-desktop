export const ERROR_CODES = Object.freeze({
	NO_AVAILABLE_PORT: "NOPORT",
	FAILED_CONTAINER_SETUP: "FAILEDCONTAINER",
	MISSING_DOCKER: "NODOCKER",
	FAILED_CONFIG_DEPLOY: "NOCONFDEP",
});

/**
 * @typedef {string|number} Code
 */

/**
 * Custom error class that extends built-in Error and adds new properties.
 */
export class AppError extends Error {
	/**
	 * @param {Code} code - The error code.
	 * @param {string} message - The error message.
	 */
	constructor(code, message) {
		super(message);

		this.name = this.constructor.name;
		this.code = code;
	}
}

/**
 * Checks if a subject is a specific AppError based on the given code.
 *
 * @param {AppError} error
 * @param {Code} code
 *
 * @returns {boolean}
 */
export function isErrorCode(error, code) {
	return error.code === code;
}

/**
 * Checks if a subject is an AppError.
 *
 * @param {unknown} error
 *
 * @returns {error is AppError}
 */
export function isAppError(error) {
	return error instanceof AppError;
}
