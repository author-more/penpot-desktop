/**
 * @typedef {Parameters<typeof window.api.setTheme>[0]} ThemeId
 * @typedef {ThemeId | "tab"} ThemeSetting
 * @typedef {import("electron").IpcMessageEvent} IpcMessageEvent
 */

const THEME_STORE_KEY = "theme";
const THEME_TAB_EVENTS = Object.freeze({
  REQUEST_UPDATE: "theme-request-update",
  UPDATE: "theme-update",
});

/** @type {ThemeSetting | null} */
let currentThemeSetting = null;

window.addEventListener("DOMContentLoaded", () => {
  currentThemeSetting = /** @type {ThemeSetting | null} */ (
    localStorage.getItem(THEME_STORE_KEY)
  );

  if (currentThemeSetting) {
    setTheme(currentThemeSetting);
  }

  prepareForm(currentThemeSetting);
});

/**
 * @param {ThemeSetting | null} themeSetting
 */
async function prepareForm(themeSetting) {
  const { themeSelect } = await getThemeSettingsForm();

  if (themeSelect && themeSetting) {
    themeSelect.value = themeSetting;
  }

  themeSelect?.addEventListener("change", (event) => {
    const { target } = event;
    const value = target instanceof HTMLSelectElement && target.value;

    if (isThemeSetting(value)) {
      currentThemeSetting = value;

      localStorage.setItem(THEME_STORE_KEY, value);
      setTheme(value);
    } else {
      currentThemeSetting = null;
      localStorage.removeItem(THEME_STORE_KEY);
    }
  });
}

/**
 * @param {string} themeId
 */
function setTheme(themeId) {
  if (isThemeId(themeId)) {
    window.api.setTheme(themeId);
  }
}

async function getThemeSettingsForm() {
  const themeSelect = await getIncludedElement(
    "#theme-select",
    "#include-settings",
    HTMLSelectElement
  );

  return { themeSelect };
}

/**
 * @param {string} inTabTheme
 */
function handleInTabThemeUpdate(inTabTheme) {
  const shouldUseInTabTheme = currentThemeSetting === "tab";

  if (shouldUseInTabTheme) {
    setTheme(inTabTheme);
  }
}

/**
 *
 * @param {unknown} value
 * @returns {value is ThemeId}
 */
function isThemeId(value) {
  return (
    typeof value === "string" && ["light", "dark", "system"].includes(value)
  );
}

/**
 *
 * @param {unknown} value
 * @returns {value is ThemeSetting}
 */
function isThemeSetting(value) {
  return (
    typeof value === "string" &&
    ["light", "dark", "system", "tab"].includes(value)
  );
}
