import type { NativeTheme } from "electron";
import { Settings } from "../process/settings.js";

export type Api = {
	send: (channel: string, data?: unknown) => void;
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
