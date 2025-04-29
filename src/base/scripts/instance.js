import { getIncludedElement, typedQuerySelector } from "./dom.js";
import { openTab, setDefaultTab } from "./electron-tabs.js";
import {
	SlAlert,
	SlButton,
	SlColorPicker,
	SlDialog,
	SlIconButton,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { isNonNull } from "../../tools/value.js";
import { isParentNode } from "../../tools/element.js";
import { EditableText } from "../components/editableText.js";
import { DEFAULT_INSTANCE } from "../../shared/instance.js";
import { hideContextMenu, showContextMenu } from "./contextMenu.js";
import {
	disableSettingsFocusTrap,
	enableSettingsFocusTrap,
} from "./settings.js";
import { showAlert } from "./alert.js";

/**
 * @typedef {Awaited<ReturnType<typeof window.api.getSetting<"instances">>>} Instances
 */

export async function initInstance() {
	const instances = await window.api.getSetting("instances");

	const { id, origin, color } =
		instances.find(({ isDefault }) => isDefault) || instances[0];

	await setDefaultTab(origin, {
		accentColor: color,
		partition: id,
	});
	openTab(origin, {
		accentColor: color,
		partition: id,
	});

	updateInstanceList();
	prepareInstanceControls();
}

async function prepareInstanceControls() {
	const {
		instanceButtonAdd,
		instanceButtonOpenCreator,
		instanceButtonCloseCreator,
		instanceCreator,
	} = await getInstanceSettingsElements();

	instanceButtonAdd?.addEventListener("click", addInstance);

	if (instanceCreator) {
		instanceButtonOpenCreator?.addEventListener("click", () =>
			openInstanceCreator(instanceCreator),
		);
		instanceButtonCloseCreator?.addEventListener("click", () =>
			instanceCreator.hide(),
		);
	}
}

function addInstance() {
	registerInstance({
		id: crypto.randomUUID(),
	});
	updateInstanceList();
}

/**
 * @param {SlDialog} creator
 */
async function openInstanceCreator(creator) {
	const { warningAlert, form } = getInstanceCreatorElements();
	const { isDockerAvailable } = await window.api.instance.getSetupInfo();

	if (warningAlert && !isDockerAvailable) {
		warningAlert.show();
	}

	// Wait for controls to be defined. https://shoelace.style/getting-started/form-controls#required-fields
	await customElements.whenDefined("sl-input");
	form?.addEventListener("submit", handleInstanceCreation);

	creator.show();
}

/**
 * Handles instance creation from form submission.
 *
 * @param {SubmitEvent} event
 */
async function handleInstanceCreation(event) {
	event.preventDefault();

	const { form, buttonSubmit } = getInstanceCreatorElements();

	if (!form) {
		return;
	}

	buttonSubmit?.setAttribute("loading", "true");

	try {
		const data = new FormData(form);
		const instance = Object.fromEntries(data.entries());
		await window.api.instance.create(instance);

		showAlert(
			"success",
			{
				heading: "Instance created",
				message: "Local instance has been created successfully.",
			},
			{
				duration: 3000,
			},
		);
		updateInstanceList();
	} catch (error) {
		if (error instanceof Error) {
			showAlert("danger", {
				heading: "Failed to create an instance",
				message: error.message,
			});
		}
	}

	form.reset();
	buttonSubmit?.removeAttribute("loading");
}

/**
 * Fill instance list with instance items.
 */
async function updateInstanceList() {
	const { instanceList, instancePanelTemplate } =
		await getInstanceSettingsElements();

	if (!instanceList || !instancePanelTemplate) {
		return;
	}

	const instances = await window.api.getSetting("instances");
	const instancePanels = instances
		.map((instance) => createInstancePanel(instance, instancePanelTemplate))
		.filter(isNonNull);

	instanceList?.replaceChildren(...instancePanels);
}

/**
 * Creates an instance panel element.
 *
 * @param {Instances[number]} instance
 * @param {HTMLTemplateElement} template
 */
function createInstancePanel(instance, template) {
	const { id, origin, label, color, isDefault } = { ...instance };
	const instancePanel = document.importNode(template.content, true);

	if (!instancePanel || !isParentNode(instancePanel)) {
		return;
	}

	const colorPickerEl = typedQuerySelector(
		"sl-color-picker",
		SlColorPicker,
		instancePanel,
	);
	if (colorPickerEl) {
		colorPickerEl.value = color || "";
		colorPickerEl.addEventListener("sl-blur", () => {
			instance.color = colorPickerEl.getFormattedValue("hsla");

			registerInstance(instance);
		});
	}

	const labelEl = typedQuerySelector(".label", EditableText, instancePanel);
	if (labelEl) {
		labelEl.innerText = label || "";
		labelEl.addEventListener(
			"change",
			(/**@type {CustomEventInit} */ { detail: { value } }) => {
				instance.label = value;

				registerInstance(instance);
			},
		);
	}

	const hintEl = typedQuerySelector(".hint", EditableText, instancePanel);
	if (hintEl) {
		hintEl.innerText = origin;
		hintEl.addEventListener(
			"change",
			(/**@type {CustomEventInit} */ { detail: { value } }) => {
				instance.origin = value;

				registerInstance(instance);
			},
		);
	}

	const buttonDeleteEl = typedQuerySelector(
		"sl-icon-button",
		SlIconButton,
		instancePanel,
	);
	if (buttonDeleteEl) {
		buttonDeleteEl.disabled = isDefault;
		buttonDeleteEl.addEventListener("click", () => {
			window.api.instance.remove(id);
			updateInstanceList();
		});
	}

	const panelElement = typedQuerySelector(".panel", HTMLElement, instancePanel);
	if (panelElement) {
		panelElement.addEventListener("contextmenu", async () => {
			const { id, origin, color } = instance;

			await disableSettingsFocusTrap();

			showContextMenu(panelElement, [
				{
					label: "Set as default",
					onClick: () => {
						setDefaultTab(origin, {
							accentColor: color,
							partition: id,
						});
						window.api.instance.setDefault(id);
						hideContextMenu();
						updateInstanceList();
						enableSettingsFocusTrap();
					},
				},
			]);
		});
	}

	return instancePanel;
}

async function getInstanceSettingsElements() {
	const instanceList = await getIncludedElement(
		"#instance-list",
		"#include-settings",
		HTMLDivElement,
	);
	const instancePanelTemplate = await getIncludedElement(
		"#template-instance-panel",
		"#include-settings",
		HTMLTemplateElement,
	);
	const instanceButtonAdd = await getIncludedElement(
		"#instance-add",
		"#include-settings",
		SlButton,
	);
	const instanceButtonOpenCreator = await getIncludedElement(
		"#instance-open-creator",
		"#include-settings",
		SlButton,
	);
	const instanceButtonCloseCreator = await getIncludedElement(
		"#instance-close-creator",
		["#include-settings", "#include-instance-creator"],
		SlButton,
	);
	const instanceCreator = await getIncludedElement(
		"#instance-creator",
		["#include-settings", "#include-instance-creator"],
		SlDialog,
	);

	return {
		instanceList,
		instancePanelTemplate,
		instanceButtonAdd,
		instanceButtonOpenCreator,
		instanceButtonCloseCreator,
		instanceCreator,
	};
}

function getInstanceCreatorElements() {
	const warningAlert = typedQuerySelector(
		"#instance-creator #warning-alert",
		SlAlert,
	);
	const form = typedQuerySelector("#instance-creator-form", HTMLFormElement);
	const buttonSubmit = typedQuerySelector("#instance-submit-creator", SlButton);

	return { warningAlert, form, buttonSubmit };
}

/**
 * @param {Partial<Instances[number]>} instance
 */
function registerInstance(instance) {
	const { id, origin, color, isDefault } = instance;

	window.api.instance.register({
		...DEFAULT_INSTANCE,
		...instance,
	});

	if (isDefault) {
		setDefaultTab(origin, {
			accentColor: color,
			partition: id,
		});
	}
}
