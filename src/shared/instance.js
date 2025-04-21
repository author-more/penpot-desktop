export const DEFAULT_INSTANCE = Object.freeze({
	origin: "https://design.penpot.app",
	label: "Official",
	color: "hsla(0, 0%, 0%, 0)",
	isDefault: false,
});

/**
 * Preload script's have limited import possibilities, channel names have to be updated manually.
 */
export const INSTANCE_EVENTS = Object.freeze({
	SETUP_INFO: "instance:setup-info",
	REGISTER: "instance:register",
	REMOVE: "instance:remove",
	SET_DEFAULT: "instance:setDefault",
});
