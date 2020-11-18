import Vue from 'vue';
import {createApp, shallowReactive, h} from 'vue3';

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
	const listeners = {};
	const attrs = {};

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

			listeners[listenerName] = $attrs[attr];
		} else {
			attrs[attr] = $attrs[attr];
		}
	}

	return {
		listeners,
		attrs,
	};
}

const renderVue3Vnode = {
	props: ['ctx', 'vnode'],

	created() {
		this.state = shallowReactive({
			vnode: null,
		});
	},

	mounted() {
		const vm = this;
		this.vue3App = createApp({
			beforeCreate() {
				this._.parent = vm.ctx._; // not sure if this is necessary
			},
			render: () => this.state.vnode(),
		});

		this.vue3App._context.provides = this.ctx._.provides;

		const rootElement = this.$el;

		this.vue3App.mount(rootElement);

		// Unwrap root div
		const fragment = document.createDocumentFragment();
		fragment.append(...rootElement.childNodes);
		rootElement.replaceWith(fragment);
	},

	destroyed() {
		this.vue3App.unmount();
	},

	render(h) {
		this.state.vnode = this.vnode;
		return h('div');
	},
};

function transformSlots(ctx, $slots, h) {
	const slots = {};

	for (const slotName in $slots) {
		slots[slotName] = () => h(renderVue3Vnode, {
			attrs: {
				ctx,
				vnode: $slots[slotName],
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

const vue3BaseComponent = {
	inheritAttrs: false,

	created() {
		this.state = Vue.observable({
			attrs: null,
			listeners: null,
			slots: null,
		});
	},

	// change to beforemount
	mounted() {
		const mountEl = this.$el;

		this.vue2App = new Vue({
			provide: () => new Proxy({}, {
				getOwnPropertyDescriptor: (target, key) => (key in this._.parent.provides) ? {configurable: true} : undefined,
				get: (target, key) => this._.parent.provides[key],
			}),

			render: h => h(
				this.$options.component,
				{
					attrs: this.state.attrs,
					on: this.state.listeners,
					scopedSlots: transformSlots(this, this.state.slots, h),
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
		const {attrs, listeners} = getAttrsAndListeners(this.$attrs);
		this.state.attrs = attrs;
		this.state.listeners = listeners;
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

	return Object.assign(
		Object.create(vue3BaseComponent),
		{component},
	);
};

export default toVue3;
