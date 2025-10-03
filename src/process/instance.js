import { app, ipcMain, shell } from "electron";
import { join } from "node:path";
import { settings } from "./settings.js";
import { DEFAULT_INSTANCE, INSTANCE_EVENTS } from "../shared/instance.js";
import {
	compose,
	DOCKER_REPOSITORIES,
	getAvailableTags,
	isDockerAvailable,
} from "./docker.js";

import { z, ZodError } from "zod";
import { findAvailablePort } from "./server.js";
import { isErrorCode, ERROR_CODES, isAppError } from "../tools/error.js";
import { generateId } from "../tools/id.js";
import { readConfig, writeConfig } from "./config.js";
import { observe } from "../tools/object.js";
import { getContainerSolution } from "./platform.js";

/**
 * @typedef {z.infer<typeof localInstanceConfig>} LocalInstance
 * @typedef {z.infer<typeof instancesConfigSchema>} LocalInstances
 */

const DEFAULT_FRONTEND_CONTAINER_PORT = 9001;
const DEFAULT_MAILCATCH_CONTAINER_PORT = 1080;
const CONFIG_INSTANCES_NAME = "instances";
const CONTAINER_ID_PREFIX = `pd`;

const checkboxSchema = z
	.literal("on")
	.optional()
	.transform((value) => Boolean(value));

const dockerTag = z.union([
	z.literal(["latest", "main"]),
	z.string().regex(/^\d+\.\d+\.\d+$/),
]);

export const instanceIdSchema = z.uuid();

export const instanceCreateFormSchema = z.object({
	label: z.string().trim().min(1),
	tag: dockerTag,
	enableElevatedAccess: checkboxSchema,
	enableInstanceTelemetry: checkboxSchema,
});

const instanceUpdateSchema = instanceCreateFormSchema.omit({ label: true });

export const localInstanceConfig = z.object({
	dockerId: z.string().transform((value) => {
		const hasPrefixDuplicate = value.startsWith("pd-pd");

		return hasPrefixDuplicate ? value.replace(/^pd-pd/, "pd") : value;
	}),
	tag: dockerTag.default("latest"),
	ports: z.object({
		frontend: z.number().min(0).max(65535),
		mailcatch: z.number().min(0).max(65535),
	}),
	isInstanceTelemetryEnabled: z.boolean(),
});
export const instancesConfigSchema = z
	.record(z.string(), localInstanceConfig)
	.default({});

const instancesConfig = await getInstancesConfig();
export const localInstances = observe(instancesConfig, (newInstances) => {
	writeConfig(CONFIG_INSTANCES_NAME, newInstances);
});

const penpotDockerRepositoryAvailableTags = await getAvailableTags(
	DOCKER_REPOSITORIES.FRONTEND,
);

ipcMain.handle(INSTANCE_EVENTS.SETUP_INFO, async () => ({
	isDockerAvailable: await isDockerAvailable(),
	dockerTags: penpotDockerRepositoryAvailableTags,
	containerSolution: getContainerSolution(),
}));

ipcMain.handle(INSTANCE_EVENTS.GET_LOCAL_CONFIG, async (_event, id) => {
	const isValidId = instanceIdSchema.safeParse(id);
	if (!isValidId.success) {
		return null;
	}

	const instance = settings.instances.find((instance) => instance.id === id);
	const localInstance = localInstances[id];
	if (!instance || !localInstance) {
		return null;
	}

	const { label } = instance;
	const { tag, isInstanceTelemetryEnabled } = localInstance;
	return { id, label, tag, isInstanceTelemetryEnabled };
});

ipcMain.handle(INSTANCE_EVENTS.CREATE, async (_event, instance) => {
	let validInstance;
	let ports = {};

	try {
		validInstance = instanceCreateFormSchema.parse(instance);
		ports.frontend = await findAvailablePort([
			DEFAULT_FRONTEND_CONTAINER_PORT,
			DEFAULT_FRONTEND_CONTAINER_PORT + 9,
		]);
		ports.mailcatch = await findAvailablePort([
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

	const { label, tag, enableElevatedAccess, enableInstanceTelemetry } =
		validInstance;
	const id = crypto.randomUUID();
	const containerNameId = `${CONTAINER_ID_PREFIX}-${generateId().toLowerCase()}`;

	try {
		await compose("up", containerNameId, tag, ports, {
			isSudoEnabled: enableElevatedAccess,
			isInstanceTelemetryEnabled: enableInstanceTelemetry,
		});

		registerInstance({
			...DEFAULT_INSTANCE,
			id,
			label,
			origin: `http://localhost:${ports.frontend}`,
		});

		localInstances[id] = {
			...localInstances[id],
			dockerId: containerNameId,
			tag,
			ports,
			isInstanceTelemetryEnabled: enableInstanceTelemetry,
		};

		return id;
	} catch (error) {
		const message = isAppError(error)
			? error.message
			: "Something went wrong during the local instance setup.";

		throw new Error(message);
	}
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
	delete localInstances[id];
});

ipcMain.on(INSTANCE_EVENTS.SET_DEFAULT, (_event, id) => {
	settings.instances = settings.instances.map((instance) => {
		instance.isDefault = instance.id === id ? true : false;
		return instance;
	});
});

ipcMain.handle(INSTANCE_EVENTS.UPDATE, async (_event, id, instance) => {
	let validInstance;

	try {
		instanceIdSchema.parse(id);
		validInstance = instanceUpdateSchema.parse(instance);
	} catch (error) {
		let message;

		if (error instanceof ZodError) {
			message = "Invalid input.";
		}

		console.error(`[ERROR] [instance:update]: ${message}`);

		throw new Error(message);
	}

	if (localInstances[id]) {
		const {
			tag: newTag,
			enableInstanceTelemetry,
			enableElevatedAccess,
		} = validInstance;

		localInstances[id] = {
			...localInstances[id],
			tag: newTag,
			isInstanceTelemetryEnabled: enableInstanceTelemetry,
		};

		const { dockerId, tag, ports, isInstanceTelemetryEnabled } =
			localInstances[id];
		const isSudoEnabled = enableElevatedAccess;

		await compose("pull", dockerId, tag, ports, {
			isInstanceTelemetryEnabled,
			isSudoEnabled,
		});
		await compose("up", dockerId, tag, ports, {
			isInstanceTelemetryEnabled,
			isSudoEnabled,
		});
	}
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

async function getInstancesConfig() {
	/** @type {LocalInstances | Record<string, unknown>} */
	const instancesConfig = (await readConfig(CONFIG_INSTANCES_NAME)) || {};

	return instancesConfigSchema.parse(instancesConfig);
}
