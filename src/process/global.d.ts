type Electron = import("electron");

declare var api: {
  send: (channel: string, data: unknown) => void;
  setTheme: (themeId: Electron.NativeTheme["themeSource"]) => void;
  onOpenTab: (callback: (href: string) => void) => void;
  onTabMenuAction: (
    callback: ({ command: string, tabId: number }) => void
  ) => void;
};

declare var mainWindow: Electron.BrowserWindow;

declare var transparent: boolean;
declare var AppIcon: string;
