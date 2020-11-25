import Vue from 'vue';
import {createApp, h} from 'vue3';
import {vue3ProxyNode} from './utils';

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
		on: {},
		attrs: {},
		props: {},
	};
	const {on, attrs} = data;

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
		} else if (attr === 'class' || attr === 'style') {
			data[attr] = $attrs[attr];
		} else {
			attrs[attr] = $attrs[attr];
		}
	}

	return data;
}

const renderVue3Vnode = {
	props: ['parent', 'vnode'],

	mounted() {
		this.vue3App = createApp({
			render: () => this.vnode(),
		});

		this.vue3App._context.provides = this.parent._.provides;

		const {$el} = this;
		this.vue3App.mount(vue3ProxyNode($el));
		$el.remove();
	},

	destroyed() {
		this.vue3App.unmount();
	},

	render: h => h('div'),
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

const isVue3 = vm => (vm._ && vm._.uid);

const vue3WrapperBase = {
	created() {
		if (!isVue3(this)) {
			throw new Error('toVue3 must be used to mount a component in a Vue 3 app');
		}

		this.v2 = undefined;
	},

	mounted() {
		const vm = this;
		const mountElement = this.$el;

		this.v2 = new Vue({
			provide() {
				return new Proxy(vm._.provides, {
					getOwnPropertyDescriptor(target, key) {
						if (key in target) {
							return isConfigurableProperty;
						}
					},
				});
			},

			render(h) {
				return h(
					vm.$options.component,
					{
						...getAttrsAndListeners(vm.$attrs),
						scopedSlots: transformSlots(h, vm),
					},
				);
			},

			mounted() {
				// Rewrite Vue3 vnodes to reference Vue 2 element
				// Add to toVue2?
				let source = vm._;
				const originalNode = source.vnode.el;
				while (source.vnode.el === originalNode) {
					source.vnode.el = this.$el;
					if (source.parent) {
						source = source.parent;
					}
				}

				// Trick Vue 3 into thinking it's element is still in the DOM
				setFakeParentWhileUnmounted(mountElement, this.$el.parentNode);
			},

			destroyed() {
				this.$el.replaceWith(mountElement);
			},

			methods: {
				exposeProvided: provided => Object.assign(this._.provides, provided),
			},

			el: mountElement,
		});
	},

	beforeUnmount() {
		this.v2.$destroy();
	},

	render() {
		if (this.v2) {
			this.v2.$forceUpdate();
		}

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
