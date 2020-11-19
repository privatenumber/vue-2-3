const noop = () => {};

export function vue3ProxyNode(el) {
	return {
		insertBefore(newNode, referenceNode) {
			return el.parentNode.insertBefore(newNode, referenceNode || el);
		},
		removeAttribute: noop,
		setAttribute: noop,
	};
}

export const privateState = Symbol('vue-2-3');


