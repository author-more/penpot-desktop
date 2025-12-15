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
import { getMainWindow } from "./window.js";

/**
 * @typedef {(import("./settings.js").Settings['instances'][number] & { isLocal: boolean})[]} AllInstances
 *
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

export const instanceFormSchema = z.object({
	label: z.string().trim().min(1),
	color: z.string(),
	origin: z.string().optional(),
	localInstance: z
		.object({
			tag: dockerTag,
			enableElevatedAccess: checkboxSchema,
			enableInstanceTelemetry: checkboxSchema,
			runContainerUpdate: checkboxSchema.optional(),
		})
		.optional(),
});

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

ipcMain.handle(INSTANCE_EVENTS.GET_ALL, async () => {
	const instances = settings.instances.map((instance) => {
		const isLocal = !!localInstances[instance.id];

		return {
			...instance,
			isLocal,
		};
	});

	return instances;
});

ipcMain.handle(INSTANCE_EVENTS.GET_LOCAL_CONFIG, async (_event, id) => {
	const isValidId = instanceIdSchema.safeParse(id);
	if (!isValidId.success) {
		return null;
	}

	const instance = settings.instances.find((instance) => instance.id === id);
	if (!instance) {
		return null;
	}

	const localInstance = localInstances[id];
	const isLocal = !!localInstance;
	const { tag, isInstanceTelemetryEnabled } = localInstance || {};

	return {
		...instance,
		...(isLocal && {
			localInstance: {
				tag,
				isInstanceTelemetryEnabled,
			},
		}),
	};
});

ipcMain.handle(INSTANCE_EVENTS.CREATE, async (_event, instance) => {
	const id = crypto.randomUUID();

	if (!instance) {
		registerInstance({
			...DEFAULT_INSTANCE,
			id,
		});

		return id;
	}

	let validInstance;
	let ports = {};

	try {
		validInstance = instanceFormSchema.parse(instance);
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

	const { label, localInstance } = validInstance;
	const containerNameId = `${CONTAINER_ID_PREFIX}-${generateId().toLowerCase()}`;

	try {
		if (localInstance) {
			const { tag, enableElevatedAccess, enableInstanceTelemetry } =
				localInstance;

			await compose("up", containerNameId, tag, ports, {
				isSudoEnabled: enableElevatedAccess,
				isInstanceTelemetryEnabled: enableInstanceTelemetry,
			});

			localInstances[id] = {
				...localInstances[id],
				dockerId: containerNameId,
				tag,
				ports,
				isInstanceTelemetryEnabled: enableInstanceTelemetry,
			};
		}

		registerInstance({
			...DEFAULT_INSTANCE,
			id,
			label,
			origin: `http://localhost:${ports.frontend}`,
		});

		return id;
	} catch (error) {
		const message = isAppError(error)
			? error.message
			: "Something went wrong during the local instance setup.";

		throw new Error(message);
	}
});

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
		validInstance = instanceFormSchema.parse(instance);
	} catch (error) {
		let message;

		if (error instanceof ZodError) {
			message = "Invalid input.";
		}

		console.error(`[ERROR] [instance:update]: ${message}`);

		throw new Error(message);
	}

	const { localInstance, ...instanceCore } = validInstance;

	const existingSettings =
		settings.instances.find(({ id: existingId }) => id === existingId) ||
		DEFAULT_INSTANCE;
	registerInstance({ ...existingSettings, ...instanceCore, id });

	const { isDefault } = existingSettings;
	if (isDefault) {
		const { origin, color } = instanceCore;
		getMainWindow().webContents.send("tab:set-default", { id, origin, color });
	}

	if (localInstance && localInstances[id]) {
		const {
			tag: newTag,
			enableInstanceTelemetry,
			enableElevatedAccess,
			runContainerUpdate,
		} = localInstance;

		if (!runContainerUpdate) {
			return;
		}

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
