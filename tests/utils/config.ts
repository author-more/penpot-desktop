import { join } from "node:path";
import { getFile, getFileModificationTime, saveFile } from "./fs.js";

export class Config {
	#path: string;

	constructor(dirPath: string, name: string) {
		this.#path = join(dirPath, name);
	}

	get path() {
		return this.#path;
	}

	async read() {
		return await getFile(this.#path);
	}

	/**
	 * Reads the config, tolerating failures of a read e.g. from an in-progress write.
	 * Implemented for use with expect.poll.
	 */
	async readSettled() {
		return await this.read().catch(() => undefined);
	}

	async save(config: Record<string, unknown>) {
		await saveFile(this.#path, config);
	}

	async getModificationTime() {
		return await getFileModificationTime(this.#path);
	}
}
