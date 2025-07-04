import type { NativeTheme } from "electron";
import { Settings } from "../process/settings.js";
import { getContainerSolution } from "../process/platform.js";
import { File } from "../shared/file.js";
import {
	getGPUDiagnostics,
	getSystemDiagnostics,
} from "../process/diagnostics.js";

export type Api = {
	send: (channel: string, data?: unknown) => void;
	instance: {
		getSetupInfo: () => Promise<{
			isDockerAvailable: boolean;
			containerSolution: ReturnType<typeof getContainerSolution>;
		}>;
		create: (instance: Record<string, unknown>) => Promise<string>;
		register: (instance: Partial<Settings["instances"][number]>) => void;
		remove: (id: string) => void;
		setDefault: (id: string) => void;
	};
	file: {
		// Unexposed method used between the webview preload and the main process
		// preparePath: (
		// 	projectName: string,
		// ) => Promise<{ status: "success" | "fail" }>;
		export: (files: File[]) => Promise<{ status: "success" | "fail" }>;
	};
	diagnostics: {
		onToggle: (
			callback: (diagnosticsData: {
				system: ReturnType<typeof getSystemDiagnostics>;
				gpu: ReturnType<typeof getGPUDiagnostics>;
			}) => void,
		) => void;
	};
	setTheme: (themeId: NativeTheme["themeSource"]) => void;
	getSetting: <S extends keyof Settings>(setting: S) => Promise<Settings[S]>;
	setSetting: <S extends keyof Settings>(
		setting: S,
		value: Settings[S],
	) => void;
	onSetFlag: (callback: (flag: string, value: string) => void) => void;
	onOpenTab: (callback: (href: string) => void) => void;
	onTabMenuAction: (
		callback: ({ command, tabId }: TabContextMenuAction) => void,
	) => void;
};

type TabContextMenuAction = { command: string; tabId: number };
