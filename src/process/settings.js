import { app, dialog, ipcMain, shell } from "electron";
import { observe } from "../tools/object.js";
import { duplicateConfig, readConfig, writeConfig } from "./config.js";
import { z, ZodError } from "zod";
import { DEFAULT_INSTANCE } from "../shared/instance.js";
import { getMainWindow } from "./window.js";
import { HSLA_REGEXP } from "../tools/color.js";

const CONFIG_SETTINGS_NAME = "settings";
const CONFIG_SETTINGS_ENTRY_NAMES = Object.freeze(["theme", "instances"]);

const settingsSchema = z.object({
	theme: z.enum(["light", "dark", "system", "tab"]).default("system"),
	instances: z
		.array(
			z
				.object({
					id: z
						.string()
						.uuid()
						.default(() => crypto.randomUUID()),
					origin: z.string().url().default(DEFAULT_INSTANCE.origin),
					label: z.string().default("Your instance"),
					color: z
						.string()
						.trim()
						// For settings with the old, invalid, default color value, updates the setting and prevents the settings invalidation.
						.transform((value) => {
							const isOldDefault = value === "hsla(0,0,0,0)";

							return isOldDefault ? DEFAULT_INSTANCE.color : value;
						})
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
				.default({}),
		)
		.default([]),
});

/**
 * @typedef {z.infer<typeof settingsSchema>} Settings
 */
const userSettings = await getUserSettings();
writeConfig(CONFIG_SETTINGS_NAME, userSettings);

export const settings = observe(userSettings, (newSettings) => {
	writeConfig(CONFIG_SETTINGS_NAME, newSettings);
});

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
		const isAllowedSetting = CONFIG_SETTINGS_ENTRY_NAMES.includes(setting);

		if (isAllowedSetting) {
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
		const isAllowedSetting = CONFIG_SETTINGS_ENTRY_NAMES.includes(setting);

		if (isAllowedSetting) {
			settings[setting] = value;
		}
	},
);

async function getUserSettings() {
	let settings;

	try {
		/** @type {Settings | Record<string, unknown>} */
		const userSettings = (await readConfig(CONFIG_SETTINGS_NAME)) || {};

		settings = settingsSchema.parse(userSettings);
	} catch (error) {
		settings = settingsSchema.parse({});

		if (error instanceof Error) {
			duplicateConfig(CONFIG_SETTINGS_NAME, "old");

			app.whenReady().then(() => {
				showSettingsValidationIssue(error);
			});
		}
	}

	const hasInstances = !!settings.instances[0];
	if (!hasInstances) {
		settings.instances.push({
			...DEFAULT_INSTANCE,
			id: crypto.randomUUID(),
		});
	}

	const hasOneInstance = settings.instances.length === 1;
	if (hasOneInstance) {
		settings.instances[0].isDefault = true;
	}

	return settings;
}

/**
 * @param {Error} error
 */
function showSettingsValidationIssue(error) {
	const mainWindow = getMainWindow();

	const isZodError = error instanceof ZodError;
	const errorDetails =
		(isZodError &&
			error.issues
				.map(({ path, message }) => {
					const dataInfo = path.join("/");

					return `${dataInfo}: ${message}`;
				})
				.join("\n")) ||
		error.message;

	const DIALOG_DECISIONS = Object.freeze({
		CONFIRM: 0,
		REPORT: 1,
	});
	const decision = dialog.showMessageBoxSync(mainWindow, {
		type: "error",
		title: "Settings Error",
		message: `The app encountered an issue with your settings.`,
		detail: `The settings file contains invalid data and was backed up to "settings.old.json". The app will use the default settings.\n\nReported errors:\n${errorDetails}\n\n If you didn't manually edit the settings file, please report this issue.`,
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
