export function isCI() {
	try {
		// eslint-disable-next-line no-undef
		return process.env.CI === "1";
	} catch (error) {
		return false;
	}
}
