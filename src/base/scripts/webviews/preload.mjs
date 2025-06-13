/* eslint-disable */
// @ts-nocheck The file requires a review, before dedicating time to add quality types.

const { ipcRenderer } = require("electron");

const BUTTON_DOWNLOAD_PROJECTS_ID = "download-projects";

// Set the title of the tab name
/// Instead of the tab name being "PROJECT_NAME - Penpot", this script will remove the " - Penpot" portion.
function SetTitleToDash() {
	document.title = "Dashboard";
}

function SetTitleToProject() {
	document.title = document.querySelector(
		".main_ui_workspace_left_header__file-name",
	).innerText;
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
			const $el = await _waitForElement(
				`.main_ui_workspace_left_header__file-name`,
			);
			SetTitleToProject();
		})();
	} else {
		SetTitleToDash();
	}
}

window.onload = function () {
	var titleEl = document.getElementsByTagName("title")[0];
	var docEl = document.documentElement;

	if (docEl && docEl.addEventListener) {
		docEl.addEventListener(
			"DOMSubtreeModified",
			function (evt) {
				var t = evt.target;
				if (t === titleEl || (t.parentNode && t.parentNode === titleEl)) {
					setTimeout(() => {
						UpdateTitle();
					}, 1200);
				}
			},
			false,
		);
	} else {
		document.onpropertychange = function () {
			if (window.event.propertyName == "title") {
				setTimeout(() => {
					UpdateTitle();
				}, 1200);
			}
		};
	}
};

window.addEventListener("DOMContentLoaded", () => {
	onClassChange(document.body, () => dispatchThemeUpdate());
});

navigation.addEventListener("navigate", (event) => {
	const url = new URL(event.destination.url);
	const isDashboard = url.hash.startsWith("#/dashboard");

	if (isDashboard) {
		prepareUI();
	}
});

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
				type === "attributes" && attributeName === "class",
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

async function prepareUI() {
	const dashboardHeaderElement = await getElement(
		"header.main_ui_dashboard_projects__dashboard-header",
		{
			maxRetries: 5,
		},
	);
	const downloadButton = dashboardHeaderElement?.querySelector(
		`#${BUTTON_DOWNLOAD_PROJECTS_ID}`,
	);

	if (dashboardHeaderElement && !downloadButton) {
		const firstHeaderButton = dashboardHeaderElement.querySelector("button");

		// Push header buttons to the right
		dashboardHeaderElement.style.justifyContent = "flex-start";
		dashboardHeaderElement.style.gap = "0.5rem";
		firstHeaderButton.style.marginLeft = "auto";

		const buttonElement = document.createElement("button");
		buttonElement.id = BUTTON_DOWNLOAD_PROJECTS_ID;
		buttonElement.innerText = "Download ALL projects";
		buttonElement.classList.add(
			"main_ui_dashboard_projects__btn-secondary",
			"main_ui_dashboard_projects__btn-small",
		);
		buttonElement.addEventListener("click", async () => {
			const { status } = await ipcRenderer.invoke("file:prepare-path");
			const isPathPrepared = status === "success";

			if (isPathPrepared) {
				exportProjects();
			}
		});

		dashboardHeaderElement.append(buttonElement);
	}
}

/**
 * Retrieve projects with files and send the bin files to the main process for export.
 */
async function exportProjects() {
	try {
		const projectsWithFiles = await getProjectsWithFiles();
		const hasExports = !!projectsWithFiles?.length;

		if (!hasExports) {
			return;
		}

		const filesToExport = projectsWithFiles.flatMap(
			({ name: projectName, files: projectFiles }) => {
				return projectFiles.map(({ id, name }) => ({
					id,
					name,
					projectName,
				}));
			},
		);
		const exportBatches = splitArrayIntoBatches(filesToExport, 3);

		const files = [];
		for (const batch of exportBatches) {
			const batchFiles = await Promise.all(
				batch.map(async ({ id, name, projectName }) => ({
					name,
					projectName,
					data: await getBinFileById(id),
				})),
			);

			files.push(...batchFiles);
		}

		ipcRenderer.sendToHost("file:save", files);
	} catch (error) {
		ipcRenderer.sendToHost("error", {
			heading: "Failed to download projects",
			message:
				error instanceof Error
					? error.message
					: "Something went wrong while exporting projects",
		});
	}
}

/**
 * Retrieves all projects with their associated files.
 *
 * @returns {Promise<Array<{ name: string, files: Array<{ id: number, name: string }>>> | undefined}
 */
async function getProjectsWithFiles() {
	const allProjectsRes = await fetch("/api/rpc/command/get-all-projects", {
		headers: {
			Accept: "application/json",
		},
	});
	const projects = await allProjectsRes.json();
	const hasProjects = !!projects?.length;

	if (!hasProjects) {
		return;
	}

	const projectsWithFiles = await Promise.all(
		projects.map(async ({ id, name }) => {
			const projectFilesRes = await fetch(
				"/api/rpc/command/get-project-files",
				{
					method: "POST",
					body: JSON.stringify({ projectId: id }),
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				},
			);

			return {
				name,
				files: await projectFilesRes.json(),
			};
		}),
	);

	return projectsWithFiles.filter(({ files }) => !!files?.length);
}

/**
 * Get a bin file by ID.
 *
 * @param {string} id - The ID of the bin file to get.

 * @returns {Promise<ArrayBuffer>} The bin file as an ArrayBuffer.
 */
async function getBinFileById(id) {
	const fileRes = await fetch("/api/rpc/command/export-binfile", {
		method: "POST",
		body: JSON.stringify({
			fileId: id,
			includeLibraries: true,
			embedAssets: false,
		}),
		headers: {
			"Content-Type": "application/json",
			Accept: "application/octet-stream",
		},
	});
	const arrayBuffer = await fileRes.arrayBuffer();

	return arrayBuffer;
}

/**
 *
 * @typedef {Object} Options
 * @property {number} maxRetries
 *
 * @param {string} selector
 * @param {Options} options
 *
 * @returns {HTMLElement | null}
 */
function getElement(selector, { maxRetries = 1 } = {}) {
	let retriesCount = 0;

	return new Promise((resolve) => {
		const queryElement = () => {
			const hasRetries = retriesCount <= maxRetries;

			setTimeout(() => {
				const element = document.querySelector(selector);

				if (!element && hasRetries) {
					retriesCount++;
					return queryElement();
				}

				return resolve(element);
			}, 250);
		};

		queryElement();
	});
}

/**
 * Splits an array into batches of a specified size.
 *
 * @param {Array<unknown>} wholeArray - The array to be split.
 * @param {number} batchSize - The size of each batch.
 *
 * @returns {Array<unknown>[]} An array of arrays where each sub-array contains elements from the original array.
 */
function splitArrayIntoBatches(wholeArray, batchSize) {
	return wholeArray.reduce((batches, item, index) => {
		const batchIndex = Math.floor(index / batchSize);

		if (!batches[batchIndex]) {
			batches[batchIndex] = [];
		}
		batches[batchIndex].push(item);

		return batches;
	}, []);
}
