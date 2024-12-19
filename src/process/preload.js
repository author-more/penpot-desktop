const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
  "api",
  /** @type typeof api */ ({
    send: (channel, data) => {
      let validChannels = [
        "updateApp",
        "ReloadApp",
        "MaximizeWindow",
        "UnmaximizeWindow",
        "MinimizeWindow",
        "OpenHelp",
        "OpenOffline",
        "registerInstance",
        "removeInstance",
        "openTabMenu",
      ];

      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    setTheme: (themeId) => {
      ipcRenderer.send("set-theme", themeId);
    },
    onOpenTab: (callback) =>
      ipcRenderer.on("open-tab", (_event, value) => callback(value)),
    onTabMenuAction: (callback) =>
      ipcRenderer.on("tab-menu-action", (_event, value) => callback(value)),
  })
);
