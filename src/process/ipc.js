import { ipcMain } from "electron";

/**
 * @template {keyof import("../types/ipc.js").IpcSend} C
 *
 * @param {C} channel
 * @param {(event: Electron.IpcMainEvent, ...args: import("../types/ipc.js").IpcSend[C]) => void} handler
 */
export function ipcOn(channel, handler) {
	ipcMain.on(channel, handler);
}

/**
 * @template {keyof import("../types/ipc.js").IpcSend} C
 *
 * @param {C} channel
 * @param {(event: Electron.IpcMainEvent, ...args: import("../types/ipc.js").IpcSend[C]) => void} handler
 */
export function ipcOnce(channel, handler) {
	ipcMain.once(channel, handler);
}

/**
 * @template {keyof import("../types/ipc.js").IpcInvoke} C
 *
 * @param {C} channel
 * @param {(event: Electron.IpcMainInvokeEvent, ...args: import("../types/ipc.js").IpcInvoke[C]["args"]) => Promise<import("../types/ipc.js").IpcInvoke[C]["return"]>} handler
 */
export function ipcHandle(channel, handler) {
	ipcMain.handle(channel, handler);
}

/**
 * @template {keyof import("../types/ipc.js").IpcOn} C
 *
 * @param {Electron.BrowserWindow} window
 * @param {C} channel
 * @param {import("../types/ipc.js").IpcOn[C]} args
 */
export function ipcSend(window, channel, ...args) {
	window.webContents.send(channel, ...args);
}
