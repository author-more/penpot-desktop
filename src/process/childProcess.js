import { exec } from "@vscode/sudo-prompt";

/**
 * @typedef {Parameters<typeof exec>} ExecParameters
 *
 * @typedef {ExecParameters[0]} ExecCommand
 * @typedef {Extract<ExecParameters[1], Partial<{name: string}>>} ExecOptions
 *
 * @typedef {ExecParameters[2]} ExecCallback
 * @typedef {Parameters<Exclude<ExecCallback, undefined>>} CallbackParameters
 *
 * @typedef {Object} CommandResult
 * @property {CallbackParameters[1]} stdout
 * @property {CallbackParameters[2]} stderr
 *
 * @param {ExecCommand} command
 * @param {ExecOptions} options
 *
 * @returns {Promise<Partial<CommandResult>>}
 */
export function sudoExec(command, options) {
	return new Promise((resolve, reject) => {
		exec(command, options, (error, stdout, stderr) => {
			if (error) {
				return reject(error);
			}

			return resolve({ stdout, stderr });
		});
	});
}
