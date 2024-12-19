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

  if (isThemeId(currentThemeSetting)) {
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

    localStorage.setItem(THEME_STORE_KEY, value || "");
    currentThemeSetting = isThemeSetting(value) ? value : null;

    if (isThemeId(value)) {
      setTheme(value);
    }
  });
}

/**
 * @param {ThemeId} themeId
 */
function setTheme(themeId) {
  window.api.setTheme(themeId);
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
function handleInTabThemeChange(inTabTheme) {
  const shouldUseInTabTheme = currentThemeSetting === "tab";

  if (shouldUseInTabTheme && isThemeId(inTabTheme)) {
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
