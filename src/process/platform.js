import { CONTAINER_SOLUTIONS } from "../shared/platform.js";

export function isMacOs() {
	return process.platform === "darwin";
}

export function isWindows() {
	return process.platform === "win32";
}

export function isLinux() {
	return process.platform === "linux";
}

export function getContainerSolution() {
	if (isFlatpakContainer()) {
		return CONTAINER_SOLUTIONS.FLATPAK;
	}

	return null;
}

function isFlatpakContainer() {
	return Boolean(process.env.FLATPAK_ID);
}
