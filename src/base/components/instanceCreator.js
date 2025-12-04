import {
	SlButton,
	SlCheckbox,
	SlColorPicker,
	SlInput,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { typedQuerySelector } from "../scripts/dom.js";

/**
 * @typedef {string} DockerTag
 *
 * @typedef {Object} InstanceCreationDetails
 * @property {string} [label]
 * @property {string} [origin]
 * @property {string} [color]
 * @property {string} [tag]
 * @property {string} [enableInstanceTelemetry]
 * @property {string} [enableElevatedAccess]
 *
 * @typedef {Object} ExistingInstanceDetails
 * @property {string} id
 * @property {InstanceCreationDetails["label"]} label
 * @property {InstanceCreationDetails["origin"]} origin
 * @property {InstanceCreationDetails["color"]} color
 * @property {boolean} isDefault
 * @property {ExistingLocalInstanceDetails} [localInstance]
 *
 * @typedef {Object} ExistingLocalInstanceDetails
 * @property {InstanceCreationDetails["tag"]} tag
 * @property {boolean} isInstanceTelemetryEnabled
 */

export const INSTANCE_CREATOR_EVENTS = Object.freeze({
	CREATE: "instance-creator:create",
	UPDATE: "instance-creator:update",
	CLOSE: "instance-creator:close",
	DELETE: "instance-creator:delete",
});

export class InstanceCreator extends HTMLElement {
	constructor() {
		super();

		/** @type {DockerTag[] | null} */
		this._dockerTags = null;
		/** @type { ExistingInstanceDetails | null} */
		this._instance = null;
		/** @type {HTMLFormElement | null} */
		this._form = null;
		/** @type {SlInput | null} */
		this._tagInput = null;
		/** @type {SlButton | null} */
		this._submitButton = null;
		/** @type {SlButton | null} */
		this._closeButton = null;
		/** @type {SlButton | null} */
		this._deleteButton = null;

		this.attachShadow({ mode: "open" });

		this.render();
	}

	get dockerTags() {
		return this._dockerTags;
	}

	set dockerTags(tags) {
		this._dockerTags = tags;

		this.prepareTagInput(this._tagInput, this._dockerTags);
	}

	get instance() {
		return this._instance;
	}

	set instance(instance) {
		this._instance = instance;

		this.render();
	}

	get loading() {
		return this._submitButton?.hasAttribute("loading") || false;
	}

	set loading(isLoading) {
		if (isLoading) {
			this._submitButton?.setAttribute("loading", "true");
		} else {
			this._submitButton?.removeAttribute("loading");
		}
	}

	async render() {
		if (!this.shadowRoot) {
			return;
		}

		const isLocalInstanceCreator =
			!this._instance?.id || this._instance?.localInstance;

		// Wait for controls to be defined. https://shoelace.style/getting-started/form-controls#required-fields
		await Promise.all([
			customElements.whenDefined("sl-input"),
			customElements.whenDefined("sl-checkbox"),
			customElements.whenDefined("sl-button"),
			customElements.whenDefined("sl-details"),
		]);

		const infoSection =
			(isLocalInstanceCreator &&
				`<div class="info-section">
						<p>
							This is an experimental feature. For production-critical work, please use the existing self-hosting setup guide. Refer to the "Info" section in the Settings panel for more details.
						</p>
						<p>
							The creator will set up a local Penpot instance using the official Docker method for self-hosting Penpot, and your computer as the host.
						</p>
						<p>
							The process may take anywhere from a few seconds to a few minutes, depending on the availability of Docker images, your internet connection (for downloading images), and your computer's performance.
						</p>
					</div>`) ||
			"";

		this.shadowRoot.innerHTML = `
			<style>
				.columns {
					display: grid;
					column-gap: var(--sl-spacing-x-large);

					&.columns-2 {
						grid-template-columns: 1fr 1fr;
					}

					&.side-right {
						grid-template-columns: auto min-content;
					}
					&.align-bottom {
						align-items: end;
					}
				}
				.info-section {
					display: grid;
					row-gap: var(--sl-spacing-small);
					align-content: flex-start;

					font-size: var(--sl-font-size-small);

					> p {
						margin: 0;
					}
				}
				form {
					display: grid;
					row-gap: var(--sl-spacing-medium);

					align-content: flex-start;
				}

				sl-button,
				sl-icon-button {
					--sl-border-width: 2px;

					&::part(base) {
						color: var(--button-color);
						background-color: var(--button-background-color);

						border-radius: var(--sl-border-radius-large);
					}

					&[variant="primary"]::part(base) {
						color: var(--button-color-primary);
						background-color: var(--button-background-color-primary);
					}

					&[variant="danger"]::part(base) {
						color: var(--button-color-danger);
						background-color: var(--button-background-color-danger);
					}

					&:not([disabled]):hover,
					&:active {
						&::part(base) {
							color: var(--button-color-hover);
						}

						&[variant="primary"]::part(base) {
							color: var(--button-color-primary-hover);
							background-color: var(--button-background-color-primary-hover);
						}

						&[variant="danger"]::part(base) {
							color: var(--button-color-primary-hover);
							background-color: var(--button-background-color-danger-hover);
						}
					}
				}

				sl-button {
					font-size: var(--sl-font-size-small);
				}

				sl-checkbox {
					&::part(form-control-help-text) {
						margin-top: var(--sl-spacing-small);
					}
				}

				sl-select {
					&::part(form-control-help-text) {
						margin-top: var(--sl-spacing-x-small);
					}
				}

				sl-color-picker {
					--sl-input-border-color: var(--color-input-border-color);

					&::part(trigger) {
						border-radius: var(--sl-border-radius-medium);
					}

					&:hover {
						--sl-input-border-color: var(--color-primary);
					}
				}

				.footer {
					display: flex;
					justify-content: space-between;
					gap: var(--sl-spacing-medium);
				}
			</style>
			<div>
				<div class="${isLocalInstanceCreator ? "columns columns-2" : ""}">
					${infoSection}
					<div>
						<form id="instance-creator-form">
							<div class="columns columns-2 side-right align-bottom">
								<sl-input name="label" label="Label" required></sl-input>
								<sl-color-picker name="color" label="Color" format="hsl" opacity="true"></sl-color-picker>
							</div>
							${!isLocalInstanceCreator ? `<sl-input name="origin" label="Origin" required></sl-input>` : ""}
							${
								isLocalInstanceCreator
									? `<sl-input name="tag" label="Tag" value="latest" required></sl-input>
							<sl-checkbox name="enableInstanceTelemetry" checked help-text="When enabled, a periodical process will send anonymous data about this instance.">
								Enable instance telemetry
							</sl-checkbox>
							<sl-details summary="Advanced options">
								<sl-checkbox name="enableElevatedAccess" help-text="Docker commands will run as super user, with elevated privileges. You will be prompted by the system to allow the actions.">
									Enable elevated access
								</sl-checkbox>
							</sl-details>`
									: ""
							}
						</form>
						<div class="footer">
							${
								this._instance?.id
									? `<sl-button id="delete" variant="danger" ${this._instance?.isDefault ? "disabled" : ""}>Delete instance</sl-button>`
									: ""
							}
							<div>
								<sl-button form="instance-creator-form" type="submit" variant="primary">
									Create
								</sl-button>
								<sl-button id="close" variant="primary">
									Close
								</sl-button>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		this._form = typedQuerySelector("form", HTMLFormElement, this.shadowRoot);
		this._tagInput = typedQuerySelector(
			"sl-input[name='tag']",
			SlInput,
			this.shadowRoot,
		);
		this._submitButton = typedQuerySelector(
			"sl-button[type='submit']",
			SlButton,
			this.shadowRoot,
		);
		this._closeButton = typedQuerySelector(
			"sl-button#close",
			SlButton,
			this.shadowRoot,
		);
		this._deleteButton = typedQuerySelector(
			"sl-button#delete",
			SlButton,
			this.shadowRoot,
		);

		if (this._instance) {
			const labelInput = typedQuerySelector(
				"sl-input[name='label']",
				SlInput,
				this.shadowRoot,
			);
			const colorPicker = typedQuerySelector(
				"sl-color-picker",
				SlColorPicker,
				this.shadowRoot,
			);
			const originInput = typedQuerySelector(
				"sl-input[name='origin']",
				SlInput,
				this.shadowRoot,
			);
			const telemetryCheckbox = typedQuerySelector(
				"sl-checkbox[name='enableInstanceTelemetry']",
				SlCheckbox,
				this.shadowRoot,
			);

			if (labelInput && this._instance.label) {
				labelInput.value = this._instance.label;
			}
			if (colorPicker && this._instance.color) {
				colorPicker.value = this._instance.color;
			}
			if (originInput && this._instance.origin) {
				originInput.value = this._instance.origin;
				if (this._instance.localInstance) {
					originInput.disabled = true;
				}
			}
			if (this._tagInput && this._instance.localInstance?.tag) {
				this._tagInput.value = this._instance.localInstance.tag;
			}
			if (
				telemetryCheckbox &&
				this._instance.localInstance &&
				Object.hasOwn(
					this._instance.localInstance,
					"isInstanceTelemetryEnabled",
				)
			) {
				telemetryCheckbox.checked =
					this._instance.localInstance.isInstanceTelemetryEnabled;
			}

			if (this._submitButton) {
				this._submitButton.textContent = "Update";
			}
		}

		this._form?.addEventListener("submit", this);
		this._closeButton?.addEventListener("click", this);
		this._deleteButton?.addEventListener("click", this);

		this.prepareTagInput(this._tagInput, this._dockerTags);
	}

	/**
	 * Prepares the tag input with datalist options.
	 *
	 * @param {SlInput | null} tagInput
	 * @param {DockerTag[] | null} tags
	 */
	async prepareTagInput(tagInput, tags) {
		await tagInput?.updateComplete;

		tagInput?.shadowRoot?.querySelector("datalist")?.remove();

		const tagOptionElements =
			tags?.map((tag) => {
				const option = document.createElement("option");
				option.value = tag;
				option.textContent = tag;

				return option;
			}) || [];
		const dataListElement = document.createElement("datalist");

		dataListElement.id = "tags";
		dataListElement.replaceChildren(...tagOptionElements);

		tagInput?.shadowRoot
			?.querySelector('[part="base"]')
			?.appendChild(dataListElement);
		tagInput?.shadowRoot
			?.querySelector('[part="input"]')
			?.setAttribute("list", "tags");
	}

	/**
	 * @param {Event} event
	 */
	handleEvent(event) {
		const isSubmitEvent = event.type === "submit";
		const isCloseEvent =
			event.type === "click" && event.target === this._closeButton;
		const isDeleteEvent =
			event.type === "click" && event.target === this._deleteButton;

		if (isSubmitEvent && this._form) {
			this.handleSubmit(event, this._form);
			return;
		}

		if (isCloseEvent) {
			this.handleClose();
			return;
		}

		if (isDeleteEvent) {
			this.handleDelete();
			return;
		}
	}

	/**
	 * @param {Event} event
	 * @param {HTMLFormElement} form
	 */
	handleSubmit(event, form) {
		event.preventDefault();

		const formData = new FormData(form);
		/** @type {InstanceCreationDetails} */
		const { tag, enableInstanceTelemetry, enableElevatedAccess, ...instance } =
			Object.fromEntries(formData.entries());
		const { id: instanceId } = this._instance || {};
		const isLocalInstanceCreator = !instanceId || this._instance?.localInstance;
		const eventName = instanceId
			? INSTANCE_CREATOR_EVENTS.UPDATE
			: INSTANCE_CREATOR_EVENTS.CREATE;

		this.dispatchEvent(
			new CustomEvent(eventName, {
				detail: {
					...instance,
					...(isLocalInstanceCreator && {
						localInstance: {
							tag,
							enableInstanceTelemetry,
							enableElevatedAccess,
						},
					}),
					...(instanceId && { id: instanceId }),
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	handleClose() {
		this.dispatchEvent(
			new CustomEvent(INSTANCE_CREATOR_EVENTS.CLOSE, {
				bubbles: true,
				composed: true,
			}),
		);

		this._instance = null;
	}

	handleDelete() {
		this.dispatchEvent(
			new CustomEvent(INSTANCE_CREATOR_EVENTS.DELETE, {
				bubbles: true,
				composed: true,
				detail: { id: this._instance?.id },
			}),
		);

		this._instance = null;
	}
}

customElements.define("instance-creator", InstanceCreator);
