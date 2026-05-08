import type { NativeTheme } from "electron";
import { Settings } from "../process/settings.js";
import { getContainerSolution } from "../process/platform.js";
import { File } from "../shared/file.js";
import {
	getGPUDiagnostics,
	getSystemDiagnostics,
} from "../process/diagnostics.js";
import { Tag } from "../process/docker.js";
import { AllInstances, LocalInstance } from "../process/instance.js";
import { Instances } from "../base/scripts/instance.js";

type TabContextMenuAction = { command: string; tabId: number };

export type IpcSend = {
	"app:ready-for-close": [];
	"app:open-in-browser": [resource: "help" | "selfhost" | "credits"];
	"app:set-theme": [themeId: NativeTheme["themeSource"]];
	"instance:remove": [id: string];
	"instance:setDefault": [id: string];
	"file:change": [fieldId: string];
	"tab:open-context-menu": [tabId: number];
};

export type IpcInvoke = {
	"instance:setup-info": {
		args: [];
		return: {
			isDockerAvailable: boolean;
			dockerTags: Tag["name"][];
			containerSolution: ReturnType<typeof getContainerSolution>;
		};
	};
	"instance:get-all": { args: []; return: AllInstances };
	"instance:get-config": {
		args: [id: string];
		return:
			| (Settings["instances"][number] & {
					localInstance?: Pick<
						LocalInstance,
						"tag" | "isInstanceTelemetryEnabled"
					>;
			  })
			| null;
	};
	"instance:create": {
		args: [instance?: Record<string, unknown>];
		return: string;
	};
	"instance:update": {
		args: [id: string, instance: Record<string, unknown>];
		return: void;
	};
	// Unexposed method used between the webview preload and the main process
	"file:prepare-path": {
		args: [];
		return: { status: "success" | "fail" };
	};
	"file:export": {
		args: [files: File[]];
		return: { status: "success" | "fail" };
	};
};

export type IpcOn = {
	"app:will-close": [];
	"env:set-flag": [flag: [string, string]];
	"app:theme-changed": [themeId: string];
	"app:download-progress": [percent: number];
	"diagnostics:toggle": [
		diagnosticsData: {
			system: ReturnType<typeof getSystemDiagnostics>;
			gpu: ReturnType<typeof getGPUDiagnostics>;
		},
	];
	"tab:set-default": [
		instance: Pick<Instances[number], "id" | "origin" | "color">,
	];
	"tab:open": [href: string];
	"tab:menu-action": [tabAction: TabContextMenuAction];
};

type Send<C extends keyof IpcSend> = (...args: IpcSend[C]) => void;
type Invoke<C extends keyof IpcInvoke> = (
	...args: IpcInvoke[C]["args"]
) => Promise<IpcInvoke[C]["return"]>;
type On<C extends keyof IpcOn> = (
	callback: (...args: IpcOn[C]) => void,
) => void;

export type Api = {
	app: {
		onWillClose: On<"app:will-close">;
		readyForClose: Send<"app:ready-for-close">;
		openInBrowser: Send<"app:open-in-browser">;
		setTheme: Send<"app:set-theme">;
	};
	env: {
		onSetFlag: On<"env:set-flag">;
	};
	instance: {
		getSetupInfo: Invoke<"instance:setup-info">;
		getAll: Invoke<"instance:get-all">;
		getConfig: Invoke<"instance:get-config">;
		create: Invoke<"instance:create">;
		update: Invoke<"instance:update">;
		remove: Send<"instance:remove">;
		setDefault: Send<"instance:setDefault">;
	};
	file: {
		export: Invoke<"file:export">;
		change: Send<"file:change">;
	};
	diagnostics: {
		onToggle: On<"diagnostics:toggle">;
	};
	tab: {
		onSetDefault: On<"tab:set-default">;
		onOpen: On<"tab:open">;
		onMenuAction: On<"tab:menu-action">;
		openContextMenu: Send<"tab:open-context-menu">;
	};
	setting: {
		get: <S extends keyof Settings>(setting: S) => Promise<Settings[S]>;
		set: <S extends keyof Settings>(setting: S, value: Settings[S]) => void;
	};
};
