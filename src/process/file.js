import { dialog, ipcMain } from "electron";
import { FILE_EVENTS } from "../shared/file.js";
import JSZip from "jszip";
import { createWriteStream } from "node:fs";
import { getMainWindow } from "./window.js";
import { z } from "zod";

const filesSchema = z.array(
	z.object({
		name: z.string(),
		projectName: z.string(),
		data: z.instanceof(ArrayBuffer),
	}),
);

ipcMain.on(FILE_EVENTS.SAVE, async (_event, files) => {
	const { filePath } = await dialog.showSaveDialog(getMainWindow());
	const { success: isValidBackup, data: filesValid } =
		filesSchema.safeParse(files);

	if (!filePath || !isValidBackup) {
		return;
	}

	const archive = new JSZip();

	filesValid.forEach(({ name, projectName, data }) => {
		const path = `${projectName}/${name}.penpot`;

		archive.file(path, data);
	});

	archive
		.generateNodeStream({ streamFiles: true })
		.pipe(createWriteStream(filePath));
});
