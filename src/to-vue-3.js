import Vue from 'vue';
import {createApp, shallowReactive, h} from 'vue3';
import { vue3ProxyNode, privateState } from './utils';

const hyphenateRE = /\B([A-Z])/g;
const hyphenate = string => string.replace(hyphenateRE, '-$1').toLowerCase();

const eventListenerPtrn = /^on[A-Z]/;
const optionsModifierRE = /(Once|Passive|Capture)$/;

const eventPrefixes = {
	Once: '~',
	Passive: '&',
	Capture: '!',
};

function getAttrsAndListeners($attrs) {
	const data = {
		style: undefined,
		class: undefined,
	};
	const on = data.on = {};
	const attrs = data.attrs = {};

	for (const attr in $attrs) {
		if (eventListenerPtrn.test(attr)) {
			let listenerName = attr.slice(2);

			if (optionsModifierRE.test(listenerName)) {
				let m;
				while ((m = listenerName.match(optionsModifierRE))) {
					listenerName = eventPrefixes[m[0]] + listenerName.slice(0, -m[0].length);
				}

				listenerName = listenerName.replace('!~', '~!');
			}

			listenerName = hyphenate(listenerName);

			on[listenerName] = $attrs[attr];
		} else {
			if (attr === 'class' || attr === 'style') {
				data[attr] = $attrs[attr];
			} else {
				attrs[attr] = $attrs[attr];
			}
		}
	}

	return data;
}

const renderVue3Vnode = {
	props: ['parent', 'vnode'],

	created() {
		this.state = shallowReactive({
			vnode: null,
		});
	},

	mounted() {
		const vm = this;
		this.vue3App = createApp({
			render: () => this.state.vnode(),
		});

		this.vue3App._context.provides = this.parent._.provides;

		const { $el } = this;
		this.vue3App.mount(vue3ProxyNode($el));
		$el.remove();
	},

	destroyed() {
		this.vue3App.unmount();
	},

	render(h) {
		this.state.vnode = this.vnode;
		return h('div');
	},
};

function transformSlots(h, ctx) {
	const slots = {};

	for (const slotName in ctx.$slots) {
		slots[slotName] = () => h(renderVue3Vnode, {
			attrs: {
				parent: ctx,
				vnode: ctx.$slots[slotName],
			},
		});
	}

	return slots;
}

function setFakeParentWhileUnmounted(node, fakeParent) {
	Object.defineProperty(node, 'parentNode', {
		get() {
			return this.parentElement || fakeParent;
		},
	});
}

const isConfigurableProperty = {configurable: true};

const vue3WrapperBase = {
	created() {
		this._[privateState] = Vue.observable({
			data: null,
			slots: null,
		});
	},

	mounted() {
		const vm = this;
		const mountEl = this.$el;

		this.v2 = new Vue({
			provide: () => new Proxy(this._.parent.provides, {
				getOwnPropertyDescriptor(target, key) {
					if (key in target) {
						return isConfigurableProperty;
					}
				},
			}),

			render: h => h(
				this.$options.component,
				{
					...this._[privateState].data,
					scopedSlots: transformSlots(h, this),
				},
			),

			mounted() {
				// Rewrite Vue3 vnodes to reference Vue 2 element
				let source = vm._;
				const originalNode = source.vnode.el;
				while (source.vnode.el === originalNode) {
					source.vnode.el = this.$el;
					if (source.parent) {
						source = source.parent;
					}
				}

				// Trick Vue 3 into thinking it's element is still in the DOM
				setFakeParentWhileUnmounted(mountEl, this.$el.parentNode);
			},

			destroyed() {
				this.$el.replaceWith(mountEl);
			},

			methods: {
				exposeProvided: provided => Object.assign(this._.provides, provided),
			},

			el: mountEl,
		});
	},

	beforeUnmount() {
		this.v2.$destroy();
	},

	render() {
		const data = getAttrsAndListeners(this.$attrs);
		this._[privateState].data = data;
		this._[privateState].slots = this.$slots;
		return h('div');
	},
};

const getProvidedMixin = {
	created() {
		this.$root.exposeProvided(this._provided);
	},
};

const toVue3 = vue2Component => {
	const component = Object.create(vue2Component);
	component.mixins = [getProvidedMixin].concat(vue2Component.mixins || []);

	const vue3Wrapper = Object.create(vue3WrapperBase);
	vue3Wrapper.component = component;

	return vue3Wrapper;
};

export default toVue3;
