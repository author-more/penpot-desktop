import {
	SlButton,
	SlDialog,
	SlInput,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { typedQuerySelector } from "../scripts/dom.js";

/**
 * @typedef {Object} ConfirmOptions
 * @property {string} label - Dialog's label.
 * @property {ConfirmHeader} [header]
 * @property {string[]} [description] - Paragraphs.
 * @property {ConfirmPhrase} [confirmation] - If set, the user has to type the phrase to confirm.
 * @property {ConfirmAction} action
 *
 * @typedef {Object} ConfirmHeader
 * @property {string} [title]
 * @property {string} [subtitle]
 *
 * @typedef {Object} ConfirmPhrase
 * @property {string} phrase
 * @property {string} phraseLabel - Label of the phrase input.
 *
 * @typedef {Object} ConfirmAction
 * @property {string} label - Label of the confirm button.
 * @property {"primary" | "danger"} [variant]
 *
 * @typedef {Object} ConfirmDecision
 * @property {boolean} isConfirmed
 * @property {string} [confirmationPhrase] - Phrase typed by the user.
 */

export class ConfirmDialog extends HTMLElement {
	constructor() {
		super();

		/** @type {ConfirmOptions | null} */
		this._options = null;
		/** @type {((decision: ConfirmDecision) => void) | null} */
		this._resolveDecision = null;
		/** @type {SlDialog | null} */
		this._dialog = null;
		/** @type {HTMLFormElement | null} */
		this._form = null;
		/** @type {SlInput | null} */
		this._confirmationInput = null;
		/** @type {SlButton | null} */
		this._confirmButton = null;
		/** @type {SlButton | null} */
		this._cancelButton = null;

		this.attachShadow({ mode: "open" });
	}

	/**
	 * Shows the dialog and resolves with the user's decision.
	 *
	 * @param {ConfirmOptions} options
	 *
	 * @returns {Promise<ConfirmDecision>}
	 */
	async show(options) {
		this._options = options;

		await this.render();

		const dialog = this._dialog;
		if (!dialog) {
			return { isConfirmed: false };
		}

		return new Promise((resolve) => {
			this._resolveDecision = resolve;

			dialog.show();
		});
	}

	async render() {
		if (!this.shadowRoot) {
			return;
		}

		// Wait for controls to be defined. https://shoelace.style/getting-started/form-controls#required-fields
		await Promise.all([
			customElements.whenDefined("sl-dialog"),
			customElements.whenDefined("sl-input"),
			customElements.whenDefined("sl-button"),
		]);

		const { header, confirmation, action } = this._options || {};
		const { title, subtitle } = header || {};
		const hasHeading = !!title || !!subtitle;
		const hasConfirmationPhrase = !!confirmation?.phrase;
		const actionVariant = action?.variant || "primary";

		this.shadowRoot.innerHTML = `
			<style>
				sl-dialog {
					/* Fades and blurs everything behind the prompt. */
					--sl-overlay-background-color: color-mix(
						in srgb,
						var(--color-background) 60%,
						transparent
					);

					&::part(overlay) {
						backdrop-filter: blur(4px);
					}
				}

				form {
					display: grid;
					row-gap: var(--sl-spacing-x-large);
				}

				.heading {
					display: grid;
					row-gap: var(--sl-spacing-2x-small);

					text-align: center;
				}

				.title {
					font-size: var(--sl-font-size-x-large);
					font-weight: var(--sl-font-weight-semibold);
					color: var(--panel-label-color);

					overflow-wrap: anywhere;
				}

				.subtitle {
					font-size: var(--sl-font-size-small);
					color: var(--panel-hint-color);

					overflow-wrap: anywhere;
				}

				.info-section {
					display: grid;
					row-gap: var(--sl-spacing-small);

					font-size: var(--sl-font-size-small);

					> p {
						margin: 0;
					}
				}

				sl-button {
					--sl-border-width: 2px;

					font-size: var(--sl-font-size-small);

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

				.footer {
					display: flex;
					justify-content: flex-end;
					gap: var(--sl-spacing-medium);
				}
			</style>
			<sl-dialog>
				<form>
					${
						hasHeading
							? `<div class="heading">
									${title ? `<span class="title"></span>` : ""}
									${subtitle ? `<span class="subtitle"></span>` : ""}
								</div>`
							: ""
					}
					<div class="info-section"></div>
					${
						hasConfirmationPhrase
							? `<sl-input name="confirmationPhrase" autocomplete="off" autofocus></sl-input>`
							: ""
					}
					<div class="footer">
						<sl-button id="cancel" variant="primary">Cancel</sl-button>
						<sl-button type="submit" variant="${actionVariant}" ${hasConfirmationPhrase ? "disabled" : ""}></sl-button>
					</div>
				</form>
			</sl-dialog>
		`;

		this._dialog = typedQuerySelector("sl-dialog", SlDialog, this.shadowRoot);
		this._form = typedQuerySelector("form", HTMLFormElement, this.shadowRoot);
		this._confirmationInput = typedQuerySelector(
			"sl-input[name='confirmationPhrase']",
			SlInput,
			this.shadowRoot,
		);
		this._confirmButton = typedQuerySelector(
			"sl-button[type='submit']",
			SlButton,
			this.shadowRoot,
		);
		this._cancelButton = typedQuerySelector(
			"sl-button#cancel",
			SlButton,
			this.shadowRoot,
		);

		this.fillContent();

		this._dialog?.addEventListener("sl-hide", this);
		this._form?.addEventListener("submit", this);
		this._confirmationInput?.addEventListener("sl-input", this);
		this._cancelButton?.addEventListener("click", this);
	}

	fillContent() {
		if (!this.shadowRoot) {
			return;
		}

		const {
			label,
			header,
			description = [],
			confirmation,
			action,
		} = this._options || {};
		const { title, subtitle } = header || {};

		const titleEl = this.shadowRoot.querySelector(".title");
		const subtitleEl = this.shadowRoot.querySelector(".subtitle");
		const infoSectionEl = this.shadowRoot.querySelector(".info-section");

		if (this._dialog) {
			this._dialog.label = label || "";
		}
		if (titleEl) {
			titleEl.textContent = title || "";
		}
		if (subtitleEl) {
			subtitleEl.textContent = subtitle || "";
		}
		infoSectionEl?.replaceChildren(
			...description.map((paragraph) => {
				const paragraphEl = document.createElement("p");
				paragraphEl.textContent = paragraph;

				return paragraphEl;
			}),
		);
		if (this._confirmationInput) {
			this._confirmationInput.label = confirmation?.phraseLabel || "";
		}
		if (this._confirmButton) {
			this._confirmButton.textContent = action?.label || "Confirm";
		}
	}

	/**
	 * @param {Event} event
	 */
	handleEvent(event) {
		const isSubmitEvent = event.type === "submit";
		const isInputEvent = event.type === "sl-input";
		const isCancelEvent =
			event.type === "click" && event.target === this._cancelButton;
		const isHideEvent =
			event.type === "sl-hide" && event.target === this._dialog;

		if (isSubmitEvent) {
			this.handleSubmit(event);
			return;
		}

		if (isInputEvent && this._confirmButton) {
			this._confirmButton.disabled = !this.isConfirmationPhraseMatching();
			return;
		}

		if (isCancelEvent) {
			this._dialog?.hide();
			return;
		}

		if (isHideEvent) {
			this.resolveDecision({ isConfirmed: false });
			return;
		}
	}

	isConfirmationPhraseMatching() {
		const confirmationPhrase = this._options?.confirmation?.phrase.trim();
		if (!confirmationPhrase) {
			return true;
		}

		return this._confirmationInput?.value.trim() === confirmationPhrase;
	}

	/**
	 * @param {Event} event
	 */
	handleSubmit(event) {
		event.preventDefault();

		if (!this.isConfirmationPhraseMatching()) {
			return;
		}

		this.resolveDecision({
			isConfirmed: true,
			confirmationPhrase: this._confirmationInput?.value,
		});
		this._dialog?.hide();
	}

	/**
	 * @param {ConfirmDecision} decision
	 */
	resolveDecision(decision) {
		this._resolveDecision?.(decision);
		this._resolveDecision = null;
	}
}

customElements.define("confirm-dialog", ConfirmDialog);
