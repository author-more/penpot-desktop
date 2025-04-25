import { app, ipcMain, shell } from "electron";
import path, { join } from "node:path";
import { settings } from "./settings.js";
import { DEFAULT_INSTANCE, INSTANCE_EVENTS } from "../shared/instance.js";
import { isDockerAvailable } from "./docker.js";
import { exec as sudoExec } from "@vscode/sudo-prompt";
import { z, ZodError } from "zod";
import { findAvailablePort } from "./server.js";
import { isErrorCode, ERROR_CODES, isAppError } from "../tools/error.js";

const DEFAULT_FRONTEND_CONTAINER_PORT = 9001;
const DEFAULT_MAILCATCH_CONTAINER_PORT = 1080;

const sudoOptions = {
	name: "Penpot Desktop",
};

export const instanceCreateFormSchema = z.object({
	label: z.string().trim().min(1),
});

ipcMain.handle(INSTANCE_EVENTS.SETUP_INFO, async () => ({
	isDockerAvailable: await isDockerAvailable(),
}));

ipcMain.handle(INSTANCE_EVENTS.CREATE, async (_event, instance) => {
	let validInstance;
	let frontendPort;
	let mailcatchPort;

	try {
		validInstance = instanceCreateFormSchema.parse(instance);
		frontendPort = await findAvailablePort([
			DEFAULT_FRONTEND_CONTAINER_PORT,
			DEFAULT_FRONTEND_CONTAINER_PORT + 9,
		]);
		mailcatchPort = await findAvailablePort([
			DEFAULT_MAILCATCH_CONTAINER_PORT,
			DEFAULT_MAILCATCH_CONTAINER_PORT + 9,
		]);
	} catch (error) {
		let message;

		if (error instanceof ZodError) {
			message = "Invalid input.";
		}
		if (
			isAppError(error) &&
			isErrorCode(error, ERROR_CODES.NO_AVAILABLE_PORT)
		) {
			message = error.message;
		}

		console.error(`[ERROR] [instance:create]: ${message}`);

		throw new Error(message);
	}

	const { label } = validInstance;
	const id = crypto.randomUUID();
	const dockerComposeFilePath = path.join(
		app.getAppPath(),
		"bin/docker-compose.yaml",
	);
	const dockerComposeCommand = `PENPOT_DESKTOP_FRONTEND_PORT=${frontendPort} PENPOT_DESKTOP_MAILCATCH_PORT=${mailcatchPort} docker compose -p ${label} -f ${dockerComposeFilePath} up -d`;

	return new Promise((resolve) => {
		sudoExec(dockerComposeCommand, sudoOptions, (error) => {
			if (!error) {
				registerInstance({
					...DEFAULT_INSTANCE,
					id,
					label,
					origin: `http://localhost:${frontendPort}`,
				});

				resolve(id);
			}
		});
	});
});

ipcMain.on(INSTANCE_EVENTS.REGISTER, (_event, instance) =>
	registerInstance(instance),
);

ipcMain.on(INSTANCE_EVENTS.REMOVE, (_event, id) => {
	const userDataPath = app.getPath("sessionData");
	const partitionPath = join(userDataPath, "Partitions", id);

	shell.trashItem(partitionPath);
	settings.instances = settings.instances.filter(
		({ id: registeredId }) => registeredId !== id,
	);
});

ipcMain.on(INSTANCE_EVENTS.SET_DEFAULT, (_event, id) => {
	settings.instances = settings.instances.map((instance) => {
		instance.isDefault = instance.id === id ? true : false;
		return instance;
	});
});

/**
 * Add instance to the registry.
 *
 * @param {import("./settings.js").Settings["instances"][number]} instance
 */
function registerInstance(instance) {
	const { id, origin } = instance;
	const hasValidOrigin = URL.canParse(origin);
	if (hasValidOrigin) {
		const instanceIndex = settings.instances.findIndex(
			({ id: registeredId }) => registeredId === id,
		);
		if (instanceIndex > -1) {
			settings.instances = settings.instances.toSpliced(
				instanceIndex,
				1,
				instance,
			);
			return;
		}

		settings.instances = [...settings.instances, instance];
	} else {
		console.warn(
			`[WARN] [IPC.${INSTANCE_EVENTS.REGISTER}] Failed with: ${origin}`,
		);
	}
}
