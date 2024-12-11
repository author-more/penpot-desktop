declare var api: {
  send: (channel: string, data: unknown) => void;
  onOpenTab: (callback: (href: string) => void) => void;
  onTabMenuAction: (
    callback: ({ command: string, tabId: number }) => void
  ) => void;
};

declare var mainWindow: import("electron").BrowserWindow;

declare var transparent: boolean;
declare var AppIcon: string;
