import { readFile, writeFile } from "node:fs/promises";

export async function getFile(path: string) {
	const data = await readFile(path, "utf8");
	return data && JSON.parse(data);
}

export function saveFile(path: string, data: Record<string, unknown>) {
	const dataJSON = JSON.stringify(data, null, "\t");
	writeFile(path, dataJSON, "utf8");
}
