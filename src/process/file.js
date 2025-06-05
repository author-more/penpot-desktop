import { app, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FILE_EVENTS } from "../shared/file.js";

ipcMain.on(FILE_EVENTS.SAVE, (_event, { name, data }) => {
	const buffer = Buffer.from(data);
	const path = app.getPath("userData");
	const filePath = join(path, `${name}.penpot`);

	writeFile(filePath, buffer);
});
