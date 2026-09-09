import { app, dialog, ipcMain, shell } from "electron";
import { getChangedProperties, isRecord, observe } from "../tools/object.js";
import { ConfigReadError, readConfig, writeConfig } from "./config.js";
import { z, ZodError } from "zod";
import { DEFAULT_INSTANCE } from "../shared/instance.js";
import { getMainWindow } from "./window.js";
import { HSLA_REGEXP } from "../tools/color.js";
import { CONFIG_SETTINGS_TITLE_BAR_TYPES } from "../shared/settings.js";
import { instanceIdSchema } from "./instance.js";

const CONFIG_SETTINGS_NAME = "settings";

const titleBarTypes = Object.values(CONFIG_SETTINGS_TITLE_BAR_TYPES);

const instanceSchema = z
	.object({
		id: instanceIdSchema.default(() => crypto.randomUUID()),
		origin: z.url().default(DEFAULT_INSTANCE.origin),
		label: z.string().default("Your instance"),
		color: z
			.string()
			.trim()
			// For settings with the old, invalid, default color value, updates the setting and prevents the settings invalidation.
			.transform((value) =>
				value === "hsla(0,0,0,0)" ? DEFAULT_INSTANCE.color : value,
			)
			.pipe(
				z
					.string()
					.regex(
						HSLA_REGEXP,
						`Invalid format. Currently, only the legacy format (with comma separated values), without optional units (deg), is supported. For example, ${DEFAULT_INSTANCE.color}.`,
					),
			)
			.default(DEFAULT_INSTANCE.color),
		isDefault: z.boolean().default(false),
	})
	.prefault({});

/**
 * Schemas kept as a record for a per-key validation.
 */
const settingsShape = Object.freeze({
	theme: z.enum(["light", "dark", "system", "tab"]),
	titleBarType: z.enum([titleBarTypes[0], ...titleBarTypes.slice(1)]),
	enableTabsRemembering: z.boolean(),
	enableAutoReload: z.boolean(),
	enableViewModeWindow: z.boolean(),
	instances: z.array(instanceSchema),
});

/**
 * @typedef {z.infer<z.ZodObject<typeof settingsShape>>} Settings
 * @typedef {{ key?: string, error: unknown }} ConfigError
 */

/** @type {Settings} */
const DEFAULT_SETTINGS = Object.freeze({
	theme: "system",
	titleBarType: CONFIG_SETTINGS_TITLE_BAR_TYPES.OVERLAY,
	enableTabsRemembering: false,
	enableAutoReload: false,
	enableViewModeWindow: false,
	instances: [],
});

const {
	raw: rawSettings,
	accepted: acceptedSettings,
	errors,
} = await getUserSettings();
const initialSettings = normalize({
	...DEFAULT_SETTINGS,
	...acceptedSettings,
});

/**
 * Writes are suspended when the file couldn't be read. Since contents are unknown, overwriting would discard whatever the user has set.
 */
const canSaveConfig = !hasConfigReadError(errors);

/**
 * In-operation settings config consist of accepted (known and valid) properties. On save, the config's all properties are retained and overwritten only with accepted properties that have changed (overwriting an  invalid property only if the user changed that setting).
 *
 * E.g. `{ theme: "lig", customProperty: true, enableTabsRemembering: true }`. User can change `enableTabsRemembering` setting, without losing `theme`'s invalid value (typo "lig" instead of "light") they set manually. However, `theme` will be fixed (overwritten) if they change the setting through the application's UI. Unknown property, like `customProperty`, is retained.
 */
export const settings = observe(structuredClone(initialSettings), (current) => {
	if (!canSaveConfig) {
		return;
	}

	writeConfig(CONFIG_SETTINGS_NAME, {
		...rawSettings,
		...getChangedProperties(current, initialSettings),
	});
});

const hasErrors = !!errors.length;
if (hasErrors) {
	app.whenReady().then(() => {
		showSettingsIssues(errors);
	});
}

ipcMain.handle(
	"setting:get",
	/**
	 * @template {keyof Settings} S
	 *
	 * @function
	 * @param {import("electron").IpcMainInvokeEvent} _event
	 * @param {S} setting
	 *
	 * @returns {Settings[S] | undefined}
	 */
	(_event, setting) => {
		if (isAllowedSetting(setting)) {
			return settings[setting];
		}
	},
);

ipcMain.on(
	"setting:set",
	/**
	 * @template {keyof Settings} S
	 *
	 * @function
	 * @param {import("electron").IpcMainEvent} _event
	 * @param {S} setting
	 * @param {Settings[S]} value
	 */
	(_event, setting, value) => {
		if (isAllowedSetting(setting)) {
			settings[setting] = value;
		}
	},
);

/**
 * @returns {Promise<{
 *   raw: Record<string, unknown>,
 *   accepted: Partial<Settings>,
 *   errors: ConfigError[],
 * }>}
 */
async function getUserSettings() {
	try {
		const raw = (await readConfig(CONFIG_SETTINGS_NAME)) ?? {};

		if (!isRecord(raw)) {
			throw new ConfigReadError(
				"Expected the settings file to contain an object.",
			);
		}

		return { raw, ...validateSettings(raw) };
	} catch (error) {
		const readError =
			error instanceof ConfigReadError
				? error
				: new ConfigReadError("Failed to read the settings file.", {
						cause: error,
					});

		return { raw: {}, accepted: {}, errors: [{ error: readError }] };
	}
}

/**
 * Validates the config setting by setting. Rejected settings are left out.
 *
 * @param {Record<string, unknown>} rawConfig
 *
 * @returns {{ accepted: Partial<Settings>, errors: ConfigError[] }}
 */
function validateSettings(rawConfig) {
	/** @type {Partial<Settings>} */
	const accepted = {};
	/** @type {ConfigError[]} */
	const errors = [];

	for (const [key, value] of Object.entries(rawConfig)) {
		if (!isAllowedSetting(key)) {
			continue;
		}

		const isInstances = key === "instances";
		if (isInstances && Array.isArray(value)) {
			const result = validateInstances(value);

			accepted.instances = result.valid;
			errors.push(...result.errors);

			continue;
		}

		const result = settingsShape[key].safeParse(value);

		if (result.success) {
			accepted[key] = /** @type {never} */ (result.data);
		} else {
			errors.push({ key, error: result.error });
		}
	}

	return { accepted, errors };
}

/**
 * @param {unknown[]} entries
 *
 * @returns {{ valid: Settings["instances"], errors: ConfigError[] }}
 */
function validateInstances(entries) {
	/** @type {Settings["instances"]} */
	const valid = [];
	/** @type {ConfigError[]} */
	const errors = [];

	entries.forEach((entry, index) => {
		const result = instanceSchema.safeParse(entry);

		if (result.success) {
			valid.push(result.data);
		} else {
			errors.push({ key: `instances/${index}`, error: result.error });
		}
	});

	return { valid, errors };
}

/**
 * @param {Settings} settings
 *
 * @returns {Settings}
 */
function normalize(settings) {
	const settingsNormalized = structuredClone(settings);

	const hasInstances = !!settingsNormalized.instances[0];
	if (!hasInstances) {
		settingsNormalized.instances.push({
			...DEFAULT_INSTANCE,
			id: crypto.randomUUID(),
		});
	}

	const hasOneInstance = settingsNormalized.instances.length === 1;
	if (hasOneInstance) {
		settingsNormalized.instances[0].isDefault = true;
	}

	return settingsNormalized;
}

/**
 * Returns true if a setting name is a know property from settings config's shape.
 *
 * @param {string} key
 *
 * @returns {key is keyof Settings}
 */
function isAllowedSetting(key) {
	return typeof key === "string" && key in settingsShape;
}

/**
 * Shows a dialog about settings config's issues, with errors' details.
 *
 * @param {ConfigError[]} errors
 */
function showSettingsIssues(errors) {
	const mainWindow = getMainWindow();

	const hasReadError = hasConfigReadError(errors);
	const errorDetails = errors.map(formatConfigError).join("\n");
	const detail = hasReadError
		? `The settings file couldn't be read, the app will use the default settings. Your file has been left untouched and settings won't be saved. Fix or remove the corrupted settings file and restart the app to restore settings persistence.`
		: `The settings file contains invalid entries and the app will use the default settings in their place. Your file has been left untouched. Correct the entries and restart the app to apply them.`;

	const DIALOG_DECISIONS = Object.freeze({
		CONFIRM: 0,
		REPORT: 1,
	});
	const decision = dialog.showMessageBoxSync(mainWindow, {
		type: "error",
		title: "Settings Error",
		message: "The app encountered an issue with your settings.",
		detail: `${detail}\n\nReported errors:\n${errorDetails}\n\nIf you didn't manually edit the settings file, please report this issue.`,
		buttons: ["OK", "Report"],
		defaultId: DIALOG_DECISIONS.CONFIRM,
		cancelId: DIALOG_DECISIONS.CONFIRM,
	});

	const isReport = decision === DIALOG_DECISIONS.REPORT;
	if (isReport) {
		shell.openExternal("https://github.com/author-more/penpot-desktop/issues");
		return;
	}
}

/**
 * Converts an error into a human readble string.
 *
 * @param {ConfigError} configError
 *
 * @returns {string}
 */
function formatConfigError({ key, error }) {
	if (error instanceof ZodError) {
		return error.issues
			.map(
				({ path, message }) =>
					`${[key, ...path].filter((part) => part !== undefined && part !== "").join("/")}: ${message}`,
			)
			.join("\n");
	}

	const message = error instanceof Error ? error.message : String(error);

	return [key, message]
		.filter((part) => part !== undefined && part !== "")
		.join(": ");
}

/**
 * @param {ConfigError[]} errors
 */
function hasConfigReadError(errors) {
	return errors.some(({ error }) => error instanceof ConfigReadError);
}
