export function isMacOs() {
	return process.platform === "darwin";
}

export function isWindows() {
	return process.platform === "win32";
}
