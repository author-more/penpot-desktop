import { BrowserWindow, dialog } from "electron";
import { FILE_EVENTS } from "../shared/file.js";
import JSZip from "jszip";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { getMainWindow } from "./window.js";
import { z } from "zod";
import { AppError, ERROR_CODES } from "../tools/error.js";
import { isViewModeUrl } from "../tools/penpot.js";
import { ipcHandle, ipcOn } from "./ipc.js";

const filesSchema = z.array(
	z.object({
		name: z.string(),
		projectName: z.string(),
		data: z.instanceof(ArrayBuffer),
	}),
);

const fileIdSchema = z.string();

/**
 * @type {string | null}
 */
let exportPath;

ipcHandle(FILE_EVENTS.PREPARE_PATH, async () => {
	const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow());

	if (canceled || !filePath) {
		return { status: "fail" };
	}

	exportPath = filePath;

	return { status: "success" };
});

ipcHandle(FILE_EVENTS.EXPORT, async (_event, files) => {
	const archiveExportPath = exportPath;
	exportPath = null;

	const { success: isValidExport, data: filesValid } =
		filesSchema.safeParse(files);

	if (!isValidExport) {
		throw new AppError(
			ERROR_CODES.FAILED_VALIDATION,
			"Files bundle failed validation.",
		);
	}

	try {
		if (!archiveExportPath) {
			throw new Error("Export path is not set.");
		}

		const archive = new JSZip();

		filesValid.forEach(({ name, projectName, data }) => {
			const path = `${projectName}/${name}.penpot`;

			archive.file(path, data);
		});

		await pipeline(
			archive.generateNodeStream({ streamFiles: true }),
			createWriteStream(archiveExportPath),
		);

		return { status: "success" };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to save the projects.";

		throw new AppError(ERROR_CODES.FAILED_EXPORT, message);
	}
});

ipcOn(FILE_EVENTS.CHANGE, (_event, fileId) => {
	const { success: isValidFileId, data: fileIdValid } =
		fileIdSchema.safeParse(fileId);

	if (!isValidFileId) {
		return;
	}

	const windows = BrowserWindow.getAllWindows();
	const viewModeWindow = windows.find((window) => {
		const url = window.webContents.getURL();
		const windowURL = new URL(url);

		return isViewModeUrl(windowURL, fileIdValid);
	});

	viewModeWindow?.reload();
});
