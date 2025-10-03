import { SlInclude } from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";

/**
 * @template T
 * @typedef {new (...args: any[]) => T} Class<T>
 */

/**
 * Retrieves an element from the DOM based on the provided element and include selectors, and type.
 *
 * @overload
 * @param {string} selector
 * @param {string | string[]} includeSelector
 * @returns {Promise<Element | null>}
 */
/**
 * @template E
 * @overload
 * @param {string} selector
 * @param {string | string[]} includeSelector
 * @param {Class<E> =} type
 * @returns {Promise<ReturnType<typeof typedQuerySelector<E>> | null>}
 *
 */
/**
 * @param {string} selector - The CSS selector of the element to retrieve.
 * @param {string | string[]} includeSelector - The CSS selector of the sl-include element or an array in case of nested includes.
 * @param {Class<E> =} type - The expected type of the element.
 */
export async function getIncludedElement(selector, includeSelector, type) {
	/** @type {SlInclude | null} */
	let includeElement;

	const isNestedInclude = Array.isArray(includeSelector);
	if (isNestedInclude) {
		const includeSelectorsReversed = includeSelector.toReversed();
		const hasMultipleIncludes = includeSelectorsReversed.length > 1;
		const topInclude = includeSelectorsReversed[0];
		const followingIncludes = includeSelectorsReversed.slice(1);

		includeElement = hasMultipleIncludes
			? await getIncludedElement(topInclude, followingIncludes, SlInclude)
			: document.querySelector(topInclude);
	} else {
		includeElement = document.querySelector(includeSelector);
	}

	if (!includeElement) {
		return null;
	}

	const getElement = () =>
		type
			? typedQuerySelector(selector, type, includeElement)
			: includeElement.querySelector(selector);

	const element = getElement();
	if (element) {
		return element;
	}

	return new Promise((resolve) => {
		includeElement.addEventListener("sl-load", () => {
			const element = getElement();

			resolve(element);
		});
	});
}

/**
 * Retrieves an element from the DOM based on the provided selector and expected type.
 *
 * @template E
 * @param {string} selector
 * @param {Class<E>} type
 * @param {ParentNode | null | undefined} parent
 * @return {E | null}
 */
export function typedQuerySelector(selector, type, parent = document) {
	const element = parent?.querySelector(selector);
	if (isInstanceOf(element, type)) {
		return element;
	}

	return null;
}

/**
 * Checks if the subject is an instance of the specified type.
 *
 * @template S
 * @template T
 *
 * @param {S} subject - The element to check.
 * @param {Class<T>} type - The constructor function of the type to check against.
 *
 * @returns {subject is T}
 */
export function isInstanceOf(subject, type) {
	return subject instanceof type;
}
