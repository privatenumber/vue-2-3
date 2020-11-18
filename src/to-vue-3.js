import Vue from 'vue';
import {createApp, shallowReactive, h} from 'vue3';
import { vue3ProxyNode } from './utils';

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
		this.state = Vue.observable({
			data: null,
			slots: null,
		});
	},

	// change to beforemount

	mounted() {
		const mountEl = this.$el;

		this.vue2App = new Vue({
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
					...this.state.data,
					scopedSlots: transformSlots(h, this),
				},
			),

			// TODO: Add this to to-vue-2 ?
			mounted() {
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
		this.vue2App.$destroy();
	},

	render() {
		const data = getAttrsAndListeners(this.$attrs);
		this.state.data = data;
		this.state.slots = this.$slots;
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
