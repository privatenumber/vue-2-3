import Vue from 'vue';
import {createApp, shallowReactive, h, render} from 'vue3';

const hyphenateRE = /\B([A-Z])/g;
const hyphenate = (str) => str.replace(hyphenateRE, '-$1').toLowerCase();

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
	props: ['vnode'],

	created() {
		this.state = shallowReactive({
			vnode: null,
		});
	},

	mounted() {
		const rootElement = this.$el;

		this.vue3App = createApp({
			render: () => this.state.vnode(),
		});

		this.vue3App.mount(rootElement);

		// unwrap div
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


function transformSlots($slots, h) {
	const slots = {};

	for (const slotName in $slots) {
		slots[slotName] = () => h(renderVue3Vnode, {
			attrs: {
				vnode: $slots[slotName]
			},
		});
	}

	return slots;
}

function setFakeParentWhileUnmounted(node, fakeParent) {
	Object.defineProperty(node, 'parentNode', {
		get() {
			return node.parentElement || fakeParent;
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

	mounted() {
		const mountTarget = this.$el;
		this.vue2App = new Vue({
			render: h => h(
				this.$options.component,
				{
					attrs: this.state.attrs,
					on: this.state.listeners,
					scopedSlots: transformSlots(this.state.slots, h),
				},
			),
			mounted() {
				setFakeParentWhileUnmounted(mountTarget, this.$el.parentNode);
			},
			destroyed() {
				this.$el.replaceWith(mountTarget);
			},
		}).$mount(mountTarget);
	},

	beforeUnmount() {
		this.vue2App.$destroy();
	},

	render() {
		const { attrs, listeners } = getAttrsAndListeners(this.$attrs);
		this.state.attrs = attrs;
		this.state.listeners = listeners;
		this.state.slots = this.$slots;
		return h('div');
	},
};

const toVue3 = vue2Component => Object.assign(
	Object.create(vue3BaseComponent),
	{component: vue2Component},
);

export default toVue3;
