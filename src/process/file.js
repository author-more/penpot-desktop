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

/**
 * @type {string | null}
 */
let exportPath;

ipcMain.handle(FILE_EVENTS.PREPARE_PATH, async () => {
	const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow());

	if (canceled || !filePath) {
		return { status: "fail" };
	}

	exportPath = filePath;

	return { status: "success" };
});

ipcMain.handle(FILE_EVENTS.EXPORT, async (_event, files) => {
	const { success: isValidExport, data: filesValid } =
		filesSchema.safeParse(files);

	if (!isValidExport) {
		throw new AppError(
			ERROR_CODES.FAILED_VALIDATION,
			"Files bundle failed validation.",
		);
	}

	try {
		const archive = new JSZip();

		filesValid.forEach(({ name, projectName, data }) => {
			const path = `${projectName}/${name}.penpot`;

			archive.file(path, data);
		});

		return new Promise((resolve) => {
			if (!exportPath) {
				throw new Error("Export path is not set.");
			}

			archive
				.generateNodeStream({ streamFiles: true })
				.pipe(createWriteStream(exportPath))
				.on("error", () => {
					exportPath = null;

					throw new Error("Failed to save the archive.");
				})
				.on("finish", () => {
					exportPath = null;

					resolve({ status: "success" });
				});
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to save the projects.";

		throw new AppError(ERROR_CODES.FAILED_EXPORT, message);
	}
});
