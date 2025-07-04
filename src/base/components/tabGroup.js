/**
 * @typedef {Object} TabItem
 * @property {string} id - Unique identifier for the tab.
 * @property {string} label - Display label for the tab.
 *
 * @typedef {CustomEvent} TabAddEvent
 * @typedef {CustomEvent<{ id: string }>} TabFocusEvent
 * @typedef {CustomEvent<{ id: string, toIndex: number }>} TabReorderEvent
 * @typedef {CustomEvent<{ id: string }>} TabCloseEvent
 */

export const TAB_EVENTS = Object.freeze({
	ADD: "tab:add",
	FOCUS: "tab:focus",
	REORDER: "tab:reorder",
	CLOSE: "tab:close",
});

/**
 * Tab navigation component that allows user to select content and manage tabs.
 *
 * @emits {TabAddEvent} tab:add - When a tab is added.
 * @emits {TabFocusEvent} tab:focus - When a tab is focused.
 * @emits {TabReorderEvent} tab:reorder - When a tab is reordered.
 * @emits {TabCloseEvent} tab:close - When a tab is closed.
 */
export class TabGroup extends HTMLElement {
	/** @type {TabItem[]} */
	#tabs = [];
	/** @type {string|null} */
	#activeTabId = null;

	constructor() {
		super();

		this.attachShadow({ mode: "open" });
	}

	set tabs(value) {
		this.#tabs = Array.isArray(value) ? value : [];

		this.render();
	}

	get tabs() {
		return this.#tabs;
	}

	set activeTabId(id) {
		this.#activeTabId = id;

		this.render();
	}

	get activeTabId() {
		return this.#activeTabId;
	}

	connectedCallback() {
		this.render();
	}

	render() {
		if (!this.shadowRoot) {
			return;
		}

		const style = `
		tab-bar {
			display: flex;
			align-items: center;
			height: 100%;
		}

		ul.tab-list {
			display: flex;
			gap: .25rem;
			height: 100%;
			padding: 0;
			margin: 0;

			list-style: none;

			li.tab-item {
				position: relative;
				display: flex;
				gap: .5rem;
				align-items: center;
				padding: 0.5rem .5rem;

				background: rgba(255, 255, 255, 0.1);
				color: rgba(255,255,255, 0.75);
				border: 1px solid transparent;
				border-radius: 4px;

				cursor: pointer;
				user-select: none;

				&.active {
					border-color: rgba(255, 255, 255, .75);
				}

				& button.close {
					margin-left: 0.5rem;

					background: none;
					border: none;

					font-size: 1rem;
					color:hsla(0, 0.00%, 98.00%, 0.75);

					cursor: pointer;

					&:hover {
						color:rgb(255, 255, 255);
					}
				}
			}
		}

		button.add-tab {
			align-self: center;
			height: 90%;
			padding: 0.25rem 0.75rem;

			margin-left: .5rem;
			background: none;
			border-style: none;
			border-radius: 4px;

			font-size: 1.25rem;
			color:hsla(0, 0.00%, 98.00%, 0.95);

			cursor: pointer;

			&:hover {
			background: rgba(255, 255, 255, 0.1);
			}
		}
		`;

		this.shadowRoot.innerHTML = `
		<style>${style}</style>
		<slot name="style"></slot>
		<tab-bar>
			<ul class="tab-list" role="tablist"></ul>
			<button class="add-tab" title="Add tab" type="button">+</button>
		</tab-bar>`;

		const listEl = this.shadowRoot.querySelector("ul.tab-list");
		const addButtonEl = this.shadowRoot.querySelector("button.add-tab");
		if (!listEl || !addButtonEl) {
			return;
		}

		listEl.innerHTML = "";

		/** @type {string|null} */
		let draggedTabId = null;

		addButtonEl.addEventListener("click", () => {
			this.dispatchEvent(new CustomEvent(TAB_EVENTS.ADD));
		});

		this.#tabs.forEach((tab, index) => {
			const { id, label } = tab;
			const isActiveTab = id === this.#activeTabId;

			const tabEl = document.createElement("li");
			tabEl.className = "tab-item";
			tabEl.textContent = label;
			tabEl.setAttribute("draggable", "true");
			tabEl.setAttribute("role", "tab");

			if (isActiveTab) {
				tabEl.classList.add("active");
			}

			const closeButtonEl = document.createElement("button");
			closeButtonEl.className = "close";
			closeButtonEl.innerHTML = "&times;";
			closeButtonEl.addEventListener("click", (event) => {
				event.stopPropagation();

				this.dispatchEvent(
					new CustomEvent(TAB_EVENTS.CLOSE, {
						detail: { id },
					}),
				);
			});
			tabEl.appendChild(closeButtonEl);

			tabEl.addEventListener("click", () => {
				this.dispatchEvent(
					new CustomEvent(TAB_EVENTS.FOCUS, {
						detail: { id },
					}),
				);
			});

			tabEl.addEventListener("dragstart", (event) => {
				if (event.dataTransfer) {
					event.dataTransfer.effectAllowed = "move";
					event.dataTransfer.setData("text/plain", id);
				}

				draggedTabId = id;
			});

			// Prevent dragover event to allow dropping, the drop event to trigger.
			tabEl.addEventListener("dragover", (event) => {
				event.preventDefault();
			});

			tabEl.addEventListener("drop", (event) => {
				event.preventDefault();

				const isDraggedTab = draggedTabId && draggedTabId === id;
				if (!isDraggedTab) {
					this.dispatchEvent(
						new CustomEvent(TAB_EVENTS.REORDER, {
							detail: { id: draggedTabId, toIndex: index },
						}),
					);
				}

				draggedTabId = null;
			});

			listEl.appendChild(tabEl);
		});
	}
}

customElements.define("tab-group", TabGroup);
