/**
 * Deep freeze an object.
 *
 * @template T
 *
 * @param {T} obj
 *
 * @returns {T extends object ? Readonly<T> : T}
 */
export function deepFreeze(obj) {
	const isObject = typeof obj === "object";
	const isNull = obj === null;
	const isFrozen = Object.isFrozen(obj);

	if (isObject && !isNull && !isFrozen) {
		for (const key of Object.getOwnPropertyNames(obj)) {
			deepFreeze(obj[/** @type {keyof T}*/ (key)]);
		}
		Object.freeze(obj);
	}

	return /** @type {typeof obj extends object ? Readonly<typeof obj> : typeof obj} */ (
		obj
	);
}

/**
 * Observes top-level properties of an object and runs a callback on a property update.
 *
 * @template {Object} O
 *
 * @param {O} obj
 * @param {(result: O) => void} callback
 *
 * @returns {InstanceType<typeof Proxy<O>>}
 */
export function observe(obj, callback) {
	const handler = {
		/**
		 * @param {O} target
		 * @param {PropertyKey} prop
		 * @param {unknown} value
		 */
		set(target, prop, value) {
			Reflect.set(target, prop, value);
			callback(obj);

			return true;
		},
		/**
		 * @param {O} target
		 * @param {PropertyKey} prop
		 * @param {PropertyDescriptor} descriptor
		 */
		defineProperty(target, prop, descriptor) {
			Reflect.defineProperty(target, prop, descriptor);
			callback(obj);

			return true;
		},
		/**
		 * @param {O} target
		 * @param {PropertyKey} prop
		 */
		deleteProperty(target, prop) {
			Reflect.deleteProperty(target, prop);
			callback(obj);

			return true;
		},
	};

	return new Proxy(obj, handler);
}
