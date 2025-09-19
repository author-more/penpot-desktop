import {
	SlButton,
	SlInput,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { typedQuerySelector } from "../scripts/dom.js";

/**
 * @typedef {string} DockerTag
 *
 * @typedef {Object} InstanceCreationDetails
 * @property {string} [label]
 * @property {string} [tag]
 * @property {string} [enableInstanceTelemetry]
 * @property {string} [enableElevatedAccess]
 */

export const INSTANCE_CREATOR_EVENTS = Object.freeze({
	CREATE: "instance-creator:create",
	CLOSE: "instance-creator:close",
});

export class InstanceCreator extends HTMLElement {
	constructor() {
		super();

		/** @type {DockerTag[] | null} */
		this._dockerTags = null;
		/** @type {HTMLFormElement | null} */
		this._form = null;
		/** @type {SlInput | null} */
		this._tagInput = null;
		/** @type {SlButton | null} */
		this._submitButton = null;
		/** @type {SlButton | null} */
		this._closeButton = null;

		this.attachShadow({ mode: "open" });

		this._template = document.createElement("template");
		this._template.innerHTML = `
			<style>
				.columns {
					display: grid;
					column-gap: var(--sl-spacing-x-large);

					&.columns-2 {
						grid-template-columns: 1fr 1fr;
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

					&:not([disabled]):hover,
					&:active {
						&::part(base) {
							color: var(--button-color-hover);
						}

						&[variant="primary"]::part(base) {
							color: var(--button-color-primary-hover);
							background-color: var(--button-background-color-primary-hover);
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

				.footer {
					display: flex;
					justify-content: flex-end;
					gap: var(--sl-spacing-medium);
				}
			</style>
			<div>
				<div class="columns columns-2">
					<div class="info-section">
						<p>
							This is an experimental feature. For production-critical work, please use the existing self-hosting setup guide. Refer to the "Info" section in the Settings panel for more details.
						</p>
						<p>
							The creator will set up a local Penpot instance using the official Docker method for self-hosting Penpot, and your computer as the host.
						</p>
						<p>
							The process may take anywhere from a few seconds to a few minutes, depending on the availability of Docker images, your internet connection (for downloading images), and your computer's performance.
						</p>
					</div>
					<form id="instance-creator-form">
						<sl-input name="label" label="Label" required></sl-input>
						<sl-input name="tag" label="Tag" value="latest" required></sl-input>
						<sl-checkbox name="enableInstanceTelemetry" checked help-text="When enabled, a periodical process will send anonymous data about this instance.">
							Enable instance telemetry
						</sl-checkbox>
						<sl-details summary="Advanced options">
							<sl-checkbox name="enableElevatedAccess" help-text="Docker commands will run as super user, with elevated privileges. You will be prompted by the system to allow the actions.">
								Enable elevated access
							</sl-checkbox>
						</sl-details>
					</form>
				</div>
				<div class="footer">
					<sl-button form="instance-creator-form" type="submit" variant="primary">
						Create
					</sl-button>
					<sl-button id="close" variant="primary">
						Close
					</sl-button>
				</div>
			</div>
		`;

		this.render();
	}

	get dockerTags() {
		return this._dockerTags;
	}

	set dockerTags(tags) {
		this._dockerTags = tags;

		this.prepareTagInput(this._tagInput, this._dockerTags);
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

		this.shadowRoot.innerHTML = "";

		// Wait for controls to be defined. https://shoelace.style/getting-started/form-controls#required-fields
		await Promise.all([
			customElements.whenDefined("sl-input"),
			customElements.whenDefined("sl-checkbox"),
			customElements.whenDefined("sl-button"),
			customElements.whenDefined("sl-details"),
		]);

		const structure = this._template.content.cloneNode(true);
		this.shadowRoot.appendChild(structure);

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

		this._form?.addEventListener("submit", this);
		this._closeButton?.addEventListener("click", this);

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

		if (isSubmitEvent && this._form) {
			this.handleSubmit(event, this._form);
			return;
		}

		if (isCloseEvent) {
			this.handleClose();
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
		const detail = Object.fromEntries(formData.entries());

		this.dispatchEvent(
			new CustomEvent(INSTANCE_CREATOR_EVENTS.CREATE, {
				detail,
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
	}
}

customElements.define("instance-creator", InstanceCreator);
