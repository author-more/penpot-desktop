import {
	SlIcon,
	SlAlert,
} from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { getIncludedElement, typedQuerySelector } from "./dom.js";

/**
 * @typedef {Object} Content
 * @property {string} heading
 * @property {string} message
 *
 * @typedef {Object} Options
 * @property {number} duration
 * @property {boolean} closable
 *
 * @param {'primary' | 'success' | 'neutral' | 'warning' | 'danger'} variant
 * @param {Content} param1
 * @param {Partial<Options>} param2
 */
export async function showAlert(
	variant = "primary",
	{ heading, message },
	{ duration = Infinity, closable = false } = {},
) {
	const { alertTemplate } = await getAlertElements();

	if (!alertTemplate) {
		return;
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

	const alertEl = typedQuerySelector("sl-alert", SlAlert, alert);
	if (alertEl) {
		alertEl.setAttribute("variant", variant);
		alertEl.setAttribute("duration", duration.toString());
		alertEl.setAttribute("closable", closable.toString());

		document.body.append(alert);
		alertEl.toast();
	}
}

async function getAlertElements() {
	const alertTemplate = await getIncludedElement(
		"#template-alert",
		"#include-alert",
		HTMLTemplateElement,
	);

	return { alertTemplate };
}
