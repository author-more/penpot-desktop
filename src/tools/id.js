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
