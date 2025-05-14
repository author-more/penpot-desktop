import {
	SlIcon,
	SlAlert,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { getIncludedElement, typedQuerySelector } from "./dom.js";

/**
 * @typedef {'primary' | 'success' | 'neutral' | 'warning' | 'danger'} Variant
 * @typedef {[label: string, url: string]} Link
 *
 * @typedef {Object} Content
 * @property {string} heading
 * @property {string} message
 * @property {Array<Link> =} links
 *
 * @typedef {Object} Options
 * @property {number} duration
 * @property {boolean} closable
 * @property {boolean} open
 */

/**
 * @param {Variant} variant
 * @param {Content} content
 * @param {Partial<Options>} options
 */
export async function showAlert(variant, content, options = {}) {
	const alert = await createAlert(variant, content, options);

	if (!alert) {
		return;
	}

	document.body.append(alert);
	alert.toast();
}

/**
 * @param {Variant} variant
 * @param {Content} content
 * @param {Partial<Options>} options
 */
export async function createAlert(
	variant = "primary",
	{ heading, message, links = [] },
	{ duration = Infinity, open = false, closable = false } = {},
) {
	const { alertTemplate } = await getAlertElements();

	if (!alertTemplate) {
		return null;
	}

	const alert = document.importNode(alertTemplate.content, true);

	const iconEl = typedQuerySelector("sl-icon", SlIcon, alert);
	if (iconEl) {
		const iconNameVariantMapping = Object.freeze({
			primary: "info",
			success: "circle-check",
			neutral: "settings",
			warning: "triangle-alert",
			danger: "octagon-alert",
		});
		iconEl.name = iconNameVariantMapping[variant];
	}

	const headingEl = alert.querySelector("strong");
	if (headingEl) {
		headingEl.innerText = heading;
	}

	const messageEl = alert.querySelector("p");
	if (messageEl) {
		messageEl.innerText = message;
	}

	const alertLinksEl = alert.querySelector("alert-links");
	const linkItems = links.map(([label, url]) => {
		const anchorEl = document.createElement("a");
		anchorEl.innerText = label;
		anchorEl.href = url;
		anchorEl.target = "_blank";
		anchorEl.rel = "noopener noreferrer";

		return anchorEl;
	});
	alertLinksEl?.replaceChildren(...linkItems);

	const alertEl = typedQuerySelector("sl-alert", SlAlert, alert);
	if (alertEl) {
		alertEl.variant = variant;
		alertEl.duration = duration;
		alertEl.closable = closable;
		alertEl.open = open;
	}

	return alertEl;
}

async function getAlertElements() {
	const alertTemplate = await getIncludedElement(
		"#template-alert",
		"#include-alert",
		HTMLTemplateElement,
	);

	return { alertTemplate };
}
