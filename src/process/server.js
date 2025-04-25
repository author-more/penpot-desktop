import { createServer } from "node:net";
import { AppError, ERROR_CODES } from "../tools/error.js";

/**
 * Checks if the specified port is available.
 *
 * Creates a server and attempts to bind it to a port.
 *
 * @param {number} port - The port to check.
 * @param {string} host - THe host to use for binding.
 *
 * @returns {Promise<boolean>} - Returns true if port is available, false if not or a check failed.
 */
export function isPortAvailable(port, host = "127.0.0.1") {
	return new Promise((resolve, reject) => {
		const server = createServer()
			.once("error", (/** @type {NodeJS.ErrnoException} */ error) => {
				const { code } = error;
				const isPortInUse = code === "EADDRINUSE";

				if (isPortInUse) {
					resolve(false);
				}

				reject(error);
			})
			.once("listening", () => {
				server.once("close", () => resolve(true)).close();
			})
			.listen(port, host);
	});
}

/**
 * Finds the first available port from the provided range.
 *
 * @param {[number, number]} range - Inclusive range of ports to test.
 * @param {string =} host - The host to check the port availability on.
 *
 * @returns {Promise<number>}
 * @throws Throws an error if no ports are available from a given range.
 */
export async function findAvailablePort(range, host) {
	const [start, end] = range;

	for (let port = start; port <= end; port++) {
		if (await isPortAvailable(port, host)) {
			return port;
		}
	}

	throw new AppError(
		ERROR_CODES.NO_AVAILABLE_PORT,
		`No available ports found in the range ${start}-${end}.`,
	);
}
