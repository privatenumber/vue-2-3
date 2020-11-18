import Vue from 'vue';
import frag from 'vue-frag';
import {createApp, shallowReactive, h} from 'vue3';

const camelizeRE = /-(\w)/g;

function normalizeEventName(eventName) {
	if (eventName[0] === '&') {
		eventName = eventName.slice(1) + 'Passive';
	}

	if (eventName[0] === '~') {
		eventName = eventName.slice(1) + 'Once';
	}

	if (eventName[0] === '!') {
		eventName = eventName.slice(1) + 'Capture';
	}

	return `on${eventName[0].toUpperCase() + eventName.slice(1).replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))}`;
}

function mergeAttrsListeners(attrs, $listeners) {
	attrs = Object.assign({}, attrs);

	for (const listener in $listeners) {
		attrs[normalizeEventName(listener)] = $listeners[listener];
	}

	return attrs;
}

const renderVue2Vnode = /* Vue 3 component */ {
	props: ['ctx', 'vnode'],
	created() {
		this.state = Vue.observable({
			vnode: null,
		});
	},
	mounted() {
		// Is this property automatically reactive in Vue3?
		const vm = this;
		this.vue2App = (new Vue({
			beforeCreate() {
				this.$root = vm.ctx.$root;
				this.$parent = vm.ctx;
			},
			directives: {
				frag,
			},
			render: h => h(
				'div',
				{
					directives: [
						{name: 'frag'},
					],
				},
				[this.state.vnode()],
			),
		}));

		this.vue2App.$mount(this.$el);
	},

	beforeUnmount() {
		this.vue2App.$destroy();
	},

	render() {
		this.state.vnode = this.vnode;
		return h('div');
	},
};

function transformSlots(ctx, $scopedSlots) {
	const scopedSlots = {};
	for (const slotName in $scopedSlots) {
		scopedSlots[slotName] = () => h(renderVue2Vnode, {
			ctx,
			vnode: $scopedSlots[slotName],
		});
	}

	return scopedSlots;
}

function resolveInjection(vm, key) {
	let source = vm;
	while (source) {
		if (source._provided && source._provided[key]) {
			return source._provided[key];
		}

		source = source.$parent;
	}
}

const vue2BaseComponent = {
	inheritAttrs: false,

	created() {
		this.state = shallowReactive({
			attrs: null,
			slots: null,
		});
	},

	provide() {
		return {};
	},

	mounted() {
		// Delay until mounted because not needed in SSR
		this.vue3App = createApp({
			render: () => h(this.$options.component, this.state.attrs, this.state.slots),
		});

		// Setup provide-inject
		this.vue3App._context.provides = new Proxy(this.vue3App._context.provides, {
			has: (target, key) => resolveInjection(this, key),
			get: (target, key) => resolveInjection(this, key),
			set: (target, key, value) => {
				this._provided[key] = value;
				return true;
			},
		});

		const rootElement = this.$el;
		this.vue3App.mount(rootElement);

		// Unwrap root div
		const fragment = document.createDocumentFragment();
		fragment.append(...rootElement.childNodes);
		rootElement.replaceWith(fragment);
	},

	beforeDestroy() {
		this.vue3App.unmount();
	},

	render(h) {
		this.state.attrs = mergeAttrsListeners(this.$attrs, this.$listeners);
		this.state.slots = transformSlots(this, this.$scopedSlots);
		return h('div');
	},
};

const toVue2 = vue3Component => Object.assign(
	Object.create(vue2BaseComponent),
	{component: vue3Component},
);

export default toVue2;
