/**
 * @typedef {import("electron-tabs").TabGroup} TabGroup
 * @typedef {import("electron-tabs").Tab} Tab
 * @typedef {import("electron").WebviewTag} WebviewTag
 */

const DEFAULT_INSTANCE = "https://design.penpot.app/";
const PRELOAD_PATH = "./scripts/webviews/preload.js";
const DEFAULT_TAB_OPTIONS = Object.freeze({
  src: DEFAULT_INSTANCE,
  active: true,
  webviewAttributes: {
    preload: PRELOAD_PATH,
    allowpopups: true,
  },
  ready: tabReadyHandler,
});

window.addEventListener("DOMContentLoaded", async () => {
  const tabGroup = await getTabGroup();

  tabGroup?.on("tab-removed", () => {
    ATWC();
  });
  tabGroup?.on("tab-added", () => {
    ATWC();
  });

  prepareTabReloadButton();
});

window.api.onOpenTab(openTab);
window.api.onTabMenuAction(handleTabMenuAction);

async function resetTabs() {
  const tabGroup = await getTabGroup();
  tabGroup?.eachTab((tab) => tab.close(false));
  openTab();
}

/**
 * @param {string =} href
 */
async function setDefaultTab(href) {
  const tabGroup = await getTabGroup();

  tabGroup?.setDefaultTab({
    ...DEFAULT_TAB_OPTIONS,
    ...(href ? { src: href } : {}),
  });
}

/**
 * @param {string =} href
 */
async function openTab(href) {
  const tabGroup = await getTabGroup();

  tabGroup?.addTab(
    href
      ? {
          ...DEFAULT_TAB_OPTIONS,
          src: href,
        }
      : undefined
  );
}

async function prepareTabReloadButton() {
  const reloadButton = await getIncludedElement(
    "#reload-tab",
    "#include-controls"
  );
  const tabGroup = await getTabGroup();

  reloadButton?.addEventListener("click", () => {
    const tab = tabGroup?.getActiveTab();
    /** @type {WebviewTag} */ (tab?.webview).reload();
  });
}

/**
 * @param {Tab} tab
 */
function tabReadyHandler(tab) {
  const webview = /** @type {WebviewTag} */ (tab.webview);

  tab.element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    window.api.send("openTabMenu", tab.id);
  });
  webview.addEventListener("page-title-updated", () => {
    const newTitle = webview.getTitle();
    tab.setTitle(newTitle);
  });
}

async function getTabGroup() {
  return /** @type {TabGroup | null} */ (
    await getIncludedElement("tab-group", "#include-tabs")
  );
}

/**
 * Handles command send via tab menu interaction.
 *
 * @param {{command: string, tabId: number}} action
 */
async function handleTabMenuAction({ command, tabId }) {
  const tabGroup = await getTabGroup();
  const tab = tabGroup?.getTab(tabId);

  if (command === "reload-tab") {
    /** @type {WebviewTag} */ (tab?.webview).reload();
  }
}
