import { dialog, ipcMain } from "electron";
import { FILE_EVENTS } from "../shared/file.js";
import JSZip from "jszip";
import { createWriteStream } from "node:fs";
import { getMainWindow } from "./window.js";
import { z } from "zod";
import { AppError, ERROR_CODES } from "../tools/error.js";

const filesSchema = z.array(
	z.object({
		name: z.string(),
		projectName: z.string(),
		data: z.instanceof(ArrayBuffer),
	}),
);

ipcMain.handle(FILE_EVENTS.SAVE, async (_event, files) => {
	const { success: isValidBackup, data: filesValid } =
		filesSchema.safeParse(files);

	if (!isValidBackup) {
		throw new AppError(
			ERROR_CODES.FAILED_VALIDATION,
			"Files bundle failed validation.",
		);
	}

	const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow());
	if (canceled || !filePath) {
		return { status: canceled };
	}

	try {
		const archive = new JSZip();

		filesValid.forEach(({ name, projectName, data }) => {
			const path = `${projectName}/${name}.penpot`;

			archive.file(path, data);
		});

		return new Promise((resolve) => {
			archive
				.generateNodeStream({ streamFiles: true })
				.pipe(createWriteStream(filePath))
				.on("finish", () => resolve({ status: "success" }));
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to save the projects.";

		throw new AppError(ERROR_CODES.FAILED_PROJECTS_SAVE, message);
	}
});
