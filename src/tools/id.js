import { randomBytes } from "node:crypto";

/**
 * Generates a random id.
 *
 * This method is NOT suitable for cryptographic purposes and most suited for low number of generated ids.
 *
 * @param {number} length
 * @returns {string}
 */
export function generateId(length = 8) {
	const allowedCharacters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const allowedCharactersCount = allowedCharacters.length;

	const getRandomCharacter = () =>
		allowedCharacters.charAt(
			Math.floor(Math.random() * allowedCharactersCount),
		);

	return Array.from({ length }, getRandomCharacter).join("");
}

/**
 * Generates a random, urlsafe, base64 encoded string.
 *
 * @param {number} [bytes=64] bytes
 * @returns {string}
 */
export function generateUrlsafeToken(bytes = 64) {
	return randomBytes(bytes).toString("base64url");
}
