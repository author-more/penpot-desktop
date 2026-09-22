import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEMP_DIR_PREFIX = "penpot-desktop-test-";

export async function getFile(path: string) {
	const data = await readFile(path, "utf8");
	return data && JSON.parse(data);
}

export async function saveFile(path: string, data: Record<string, unknown>) {
	const dataJSON = JSON.stringify(data, null, "\t");
	await writeFile(path, dataJSON, "utf8");
}

export async function getFileModificationTime(path: string) {
	return (await stat(path)).mtimeMs;
}

export function createTempDirSync(prefix: string = TEMP_DIR_PREFIX) {
	return mkdtempSync(join(tmpdir(), prefix));
}

export async function removeDir(path: string) {
	await rm(path, { recursive: true });
}
