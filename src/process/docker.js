import util from "node:util";
import child_process from "node:child_process";
const exec = util.promisify(child_process.exec);

export async function isDockerAvailable() {
	try {
		await exec("docker --version");
		await exec("docker compose version");

		return true;
	} catch (error) {
		return false;
	}
}
