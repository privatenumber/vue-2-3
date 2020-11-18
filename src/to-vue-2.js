import Vue from 'vue';
import frag from 'vue-frag';
import {createApp, shallowReactive, h} from 'vue3';
import { vue3ProxyNode } from './utils';

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

function mergeAttrsListeners({
	$attrs,
	$listeners,
	$vnode
}) {
	const { data } = $vnode;
	const attrs = Object.assign({}, $attrs);

	if (data.class || data.staticClass) {
		attrs.class = [data.class, data.staticClass];
	}
	if (data.style || data.staticStyle) {
		attrs.style = [data.style, data.staticStyle];
	}

	for (const listener in $listeners) {
		attrs[normalizeEventName(listener)] = $listeners[listener];
	}

	return attrs;
}

const renderVue2Vnode = /* Vue 3 component */ {
	props: ['parent', 'vnode'],

	created() {
		this.state = Vue.observable({
			vnode: null,
		});
	},

	mounted() {
		const vm = this;
		this.vue2App = (new Vue({
			beforeCreate() {
				this.$parent = vm.parent;
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

function interopSlots(ctx) {
	const scopedSlots = {};
	for (const slotName in ctx.$scopedSlots) {
		scopedSlots[slotName] = () => h(renderVue2Vnode, {
			parent: ctx,
			vnode: ctx.$scopedSlots[slotName],
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

const vue2WrapperBase = {
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

	// Delay until mounted for SSR
	mounted() {
		this.vue3App = createApp({
			render: () => h(this.$options.component, this.state.attrs, this.state.slots),
		});

		// Proxy provide-inject
		this.vue3App._context.provides = new Proxy({}, {
			has: (_, key) => resolveInjection(this, key),
			get: (_, key) => resolveInjection(this, key),
			set: (_, key, value) => {
				this._provided[key] = value;
				return true;
			},
		});

		const { $el } = this;
		this.vue3App.mount(vue3ProxyNode($el));
		$el.remove();
	},

	beforeDestroy() {
		this.vue3App.unmount();
	},

	render(h) {
		this.state.attrs = mergeAttrsListeners(this);
		this.state.slots = interopSlots(this);
		return h('div');
	},
};

const toVue2 = vue3Component => {
	const vue2Wrapper = Object.create(vue2WrapperBase);
	vue2Wrapper.component = vue3Component;
	return vue2Wrapper;
};

export default toVue2;
