const noop = () => {};

export function vue3ProxyNode(element) {
	return {
		insertBefore(newNode, referenceNode) {
			return element.parentNode.insertBefore(newNode, referenceNode || element);
		},
		removeAttribute: noop,
		setAttribute: noop,
	};
}
