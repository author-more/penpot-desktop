import { isCI } from "../tools/process.js";

export const DEFAULT_INSTANCE = Object.freeze({
	origin: isCI() ? "http://localhost:9008" : "https://design.penpot.app",
	label: "Official",
	color: "hsla(0, 0%, 0%, 0)",
	isDefault: false,
});

/**
 * Preload script's have limited import possibilities, channel names have to be updated manually.
 */
export const INSTANCE_EVENTS = Object.freeze({
	SETUP_INFO: "instance:setup-info",
	GET_LOCAL_CONFIG: "instance:get-config",
	CREATE: "instance:create",
	REGISTER: "instance:register",
	REMOVE: "instance:remove",
	SET_DEFAULT: "instance:setDefault",
	UPDATE: "instance:update",
});
