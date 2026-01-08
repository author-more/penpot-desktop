import { getIncludedElement, typedQuerySelector } from "./dom.js";
import { setDefaultTab } from "./electron-tabs.js";
import {
	SlButton,
	SlDialog,
	SlIconButton,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { isNonNull } from "../../tools/value.js";
import { isParentNode } from "../../tools/element.js";
import { hideContextMenu, showContextMenu } from "./contextMenu.js";
import {
	disableSettingsFocusTrap,
	enableSettingsFocusTrap,
} from "./settings.js";
import { createAlert, showAlert } from "./alert.js";
import { CONTAINER_SOLUTIONS } from "../../shared/platform.js";
import {
	INSTANCE_CREATOR_EVENTS,
	InstanceCreator,
} from "../components/instanceCreator.js";

/**
 * @typedef {Awaited<ReturnType<typeof window.api.getSetting<"instances">>>} Instances
 * @typedef {Awaited<ReturnType<typeof window.api.instance.getAll>>} AllInstances
 * @typedef {CustomEvent<import("../components/instanceCreator.js").InstanceCreationDetails>} InstanceCreationEvent
 * @typedef {CustomEvent<import("../components/instanceCreator.js").InstanceCreationDetails & {id: string}>} InstanceUpdateEvent
 * @typedef {CustomEvent<{id?: string}>} InstanceDeleteEvent
 */

export async function initInstance() {
	updateInstanceList();
	prepareInstanceControls();
	prepareInstanceCreator();
}

export async function getDefaultInstance() {
	const instances = await window.api.instance.getAll();

	return instances.find(({ isDefault }) => isDefault) || instances[0];
}

async function prepareInstanceControls() {
	const { instanceButtonAdd, instanceButtonOpenCreator } =
		await getInstanceSettingsElements();

	instanceButtonAdd?.addEventListener("click", addInstance);
	instanceButtonOpenCreator?.addEventListener("click", openInstanceCreator);
}

async function prepareInstanceCreator() {
	const { instanceCreatorDialog, instanceCreator } =
		await getInstanceCreatorElements();

	if (!instanceCreatorDialog || !instanceCreator) {
		return;
	}

	const { dockerTags } = await window.api.instance.getSetupInfo();

	instanceCreator.dockerTags = dockerTags;

	instanceCreator?.addEventListener(INSTANCE_CREATOR_EVENTS.CREATE, (event) => {
		const customEvent = /** @type  {InstanceCreationEvent} */ (event);
		handleInstanceCreation(customEvent, instanceCreator);
	});
	instanceCreator?.addEventListener(INSTANCE_CREATOR_EVENTS.UPDATE, (event) => {
		const customEvent = /** @type  {InstanceUpdateEvent} */ (event);
		handleInstanceUpdate(customEvent, instanceCreator);
	});
	instanceCreator.addEventListener(INSTANCE_CREATOR_EVENTS.CLOSE, () =>
		instanceCreatorDialog.hide(),
	);
	instanceCreator.addEventListener(INSTANCE_CREATOR_EVENTS.DELETE, (event) => {
		const {
			detail: { id },
		} = /** @type  {InstanceDeleteEvent} */ (event);
		if (id) {
			window.api.instance.remove(id);
			updateInstanceList();
			instanceCreatorDialog.hide();
		}
	});
}

/**
 * @param {Event} event
 */
async function addInstance(event) {
	event.preventDefault();

	try {
		await window.api.instance.create();

		updateInstanceList();
	} catch (error) {
		if (error instanceof Error) {
			showAlert(
				"danger",
				{
					heading: "Failed to add an instance",
					message: error.message,
				},
				{
					closable: true,
				},
			);
		}
	}
}

/**
 * Opens the instance creator dialog.
 *
 * @param {Event | null} [event]
 * @param {string} [id]
 */
async function openInstanceCreator(event, id) {
	event?.preventDefault();

	const { alertsHolder, instanceCreatorDialog, instanceCreator } =
		await getInstanceCreatorElements();

	if (!instanceCreatorDialog || !instanceCreator) {
		return;
	}

	const alert = await getCreatorAlert();
	const instanceConfig = id ? await window.api.instance.getConfig(id) : null;
	const isLocalInstanceCreator =
		!instanceConfig?.id || instanceConfig?.localInstance;

	alertsHolder?.replaceChildren();
	if (alert && isLocalInstanceCreator) {
		alertsHolder?.append(alert);
	}

	instanceCreator.instance = instanceConfig;

	instanceCreatorDialog.label = !instanceConfig?.id
		? "Instance creator"
		: "Instance settings";
	instanceCreatorDialog.style = `--width: ${isLocalInstanceCreator ? "75" : "30"}vw;`;
	instanceCreatorDialog.show();
}

async function getCreatorAlert() {
	/** @type { Record<string, import("./alert.js").AlertConfiguration> }*/
	const alertConfigurations = {
		docker: {
			variant: "warning",
			content: {
				heading: "Docker is required for local instance",
				message:
					"To run a self-hosted, local instance of the app, Docker is required. Please install Docker by following the steps outlined in the official documentation. You can choose between installing Docker Desktop for a user-friendly experience or Docker Engine for a more customizable setup.",
				links: [
					["Get Docker", "https://docs.docker.com/get-started/get-docker/"],
				],
			},
		},
		flatpak: {
			variant: "primary",
			content: {
				heading: "Isolated environment",
				message:
					"Penpot Desktop is running in a Flatpak container which is isolated from other applications and has limited access to the operating system. For that reason, it is unable to create a local instance in Docker.",
			},
		},
	};

	const getAlertConfiguration = async () => {
		const { isDockerAvailable, containerSolution } =
			await window.api.instance.getSetupInfo();
		const isFlatpak = containerSolution === CONTAINER_SOLUTIONS.FLATPAK;

		if (isFlatpak) {
			return alertConfigurations.flatpak;
		}
		if (!isDockerAvailable) {
			return alertConfigurations.docker;
		}
	};
	const alertConfiguration = await getAlertConfiguration();

	if (alertConfiguration) {
		const { variant, content, options } = alertConfiguration;
		return await createAlert(
			variant,
			content,
			options || {
				closable: false,
				open: true,
			},
		);
	}
}

/**
 * Handles instance creation from form submission.
 *
 * @param {InstanceCreationEvent} event
 * @param {InstanceCreator} instanceCreator
 */
async function handleInstanceCreation(event, instanceCreator) {
	event.preventDefault();

	instanceCreator.loading = true;

	try {
		const instance = event.detail;
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
			showAlert(
				"danger",
				{
					heading: "Failed to create an instance",
					message: error.message,
				},
				{
					closable: true,
				},
			);
		}
	}

	instanceCreator.loading = false;
}

/**
 * Handles instance update.
 *
 * @param {InstanceUpdateEvent} event
 * @param {InstanceCreator} instanceCreator
 */
async function handleInstanceUpdate(event, instanceCreator) {
	event.preventDefault();

	instanceCreator.loading = true;

	const { id, ...detail } = event.detail;
	try {
		await window.api.instance.update(id, detail);
		updateInstanceList();

		showAlert(
			"success",
			{
				heading: "Instance updated",
				message: "Instance has been updated successfully.",
			},
			{
				duration: 3000,
			},
		);
	} catch (error) {
		if (error instanceof Error) {
			showAlert(
				"danger",
				{
					heading: "Failed to update an instance",
					message: error.message,
				},
				{
					closable: true,
				},
			);
		}
	}

	instanceCreator.loading = false;
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

	const instances = await window.api.instance.getAll();
	const instancePanels = instances
		.map((instance) => createInstancePanel(instance, instancePanelTemplate))
		.filter(isNonNull);

	instanceList?.replaceChildren(...instancePanels);
}

/**
 * Creates an instance panel element.
 *
 * @param {AllInstances[number]} instance
 * @param {HTMLTemplateElement} template
 */
function createInstancePanel(instance, template) {
	const { id, origin, label, color } = { ...instance };
	const instancePanel = document.importNode(template.content, true);

	if (!instancePanel || !isParentNode(instancePanel)) {
		return;
	}

	const colorEl = typedQuerySelector(".color", HTMLDivElement, instancePanel);
	if (colorEl) {
		colorEl.style.backgroundColor = color;
	}

	const labelEl = typedQuerySelector(".label", HTMLSpanElement, instancePanel);
	if (labelEl) {
		labelEl.innerText = label || "";
	}

	const hintEl = typedQuerySelector(".hint", HTMLSpanElement, instancePanel);
	if (hintEl) {
		hintEl.innerText = origin;
	}

	const buttonSettingsEl = typedQuerySelector(
		"sl-icon-button",
		SlIconButton,
		instancePanel,
	);
	if (buttonSettingsEl) {
		buttonSettingsEl.addEventListener("click", () => {
			openInstanceCreator(null, id);
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

	return {
		instanceList,
		instancePanelTemplate,
		instanceButtonAdd,
		instanceButtonOpenCreator,
	};
}

async function getInstanceCreatorElements() {
	const alertsHolder = typedQuerySelector(
		"#instance-creator-dialog alerts-holder",
		HTMLElement,
	);
	const instanceCreatorDialog = await getIncludedElement(
		"#instance-creator-dialog",
		["#include-settings"],
		SlDialog,
	);
	const instanceCreator = await getIncludedElement(
		"instance-creator",
		["#include-settings"],
		InstanceCreator,
	);

	return { alertsHolder, instanceCreatorDialog, instanceCreator };
}
