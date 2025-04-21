import { app, ipcMain, shell } from "electron";
import { join } from "path";
import { settings } from "./settings.js";
import { INSTANCE_EVENTS } from "../shared/instance.js";
import { isDockerAvailable } from "./docker.js";

ipcMain.handle(INSTANCE_EVENTS.SETUP_INFO, async () => ({
	isDockerAvailable: await isDockerAvailable(),
}));

ipcMain.on(INSTANCE_EVENTS.REGISTER, (_event, instance) => {
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
});

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
