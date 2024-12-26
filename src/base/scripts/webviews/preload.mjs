// @ts-nocheck The file requires a review, before dedicating time to add quality types.

const { ipcRenderer } = require("electron");

// Set the title of the tab name
/// Instead of the tab name being "PROJECT_NAME - Penpot", this script will remove the " - Penpot" portion.
function SetTitleToDash() {
    document.title = "Dashboard"
}

function SetTitleToProject() {
    document.title = document.querySelector(".main_ui_workspace_left_header__file-name").innerText
}


function _waitForElement(selector, delay = 50, tries = 100) {
    const AQ1 = document.querySelector(selector);

    if (!window[`__${selector}`]) {
        window[`__${selector}`] = 0;
        window[`__${selector}__delay`] = delay;
        window[`__${selector}__tries`] = tries;
    }

    function ElementSearchTitle() {
        return new Promise((resolve) => {
            window[`__${selector}`]++;
            setTimeout(resolve, window[`__${selector}__delay`]);
        });
    }

    if (AQ1 === null) {
        if (AQ1[`__${selector}`] >= window[`__${selector}__tries`]) {
            window[`__${selector}`] = 0;
            return Promise.resolve(null);
        }

        return ElementSearchTitle().then(() => _waitForElement(selector));
    } else {
        return Promise.resolve(AQ1);
    }
}




function UpdateTitle() {
    if (window.location.href.indexOf("#/workspace") != -1) {
        const start = (async () => {
            const $el = await _waitForElement(`.main_ui_workspace_left_header__file-name`);
            SetTitleToProject()
        })();
    }
    else {
        SetTitleToDash()
    }
}


window.onload = function() {
    var titleEl = document.getElementsByTagName("title")[0];
    var docEl = document.documentElement;

    if (docEl && docEl.addEventListener) {
        docEl.addEventListener("DOMSubtreeModified", function(evt) {
            var t = evt.target;
            if (t === titleEl || (t.parentNode && t.parentNode === titleEl)) {
                setTimeout(() => {
                    UpdateTitle()
                }, 1200);
            }
        }, false);
    } else {
        document.onpropertychange = function() {
            if (window.event.propertyName == "title") {
                setTimeout(() => {
                    UpdateTitle()
                }, 1200);
            }
        };
    }
};

// Theme
window.addEventListener("DOMContentLoaded", () =>
  onClassChange(document.body, () => dispatchThemeUpdate())
);

ipcRenderer.on("theme-request-update", () => dispatchThemeUpdate());

/**
 * Observes a node and executes a callback on a class change.
 * 
 * @param {Parameters<MutationObserver["observe"]>[0]} node
 * @param {function} callback
 */
function onClassChange(node, callback) {
  const observer = new MutationObserver((mutations) => {
    const hasClassChanged = mutations.some(
      ({ type, attributeName }) =>
        type === "attributes" && attributeName === "class"
    );

    if (hasClassChanged) {
      callback();
    }
  });

  observer.observe(node, { attributes: true });
}

/**
 * Sends an event, with a currently set theme, to the webview's host.
 */
function dispatchThemeUpdate() {
  const isLightTheme = document.body.classList.contains("light");
  ipcRenderer.sendToHost("theme-update", isLightTheme ? "light" : "dark");
}
