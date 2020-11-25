import Vue from 'vue';
import frag from 'vue-frag';
import {createApp, h} from 'vue3';
import {vue3ProxyNode} from './utils';

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
	$vnode,
}) {
	const {data} = $vnode;
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
		this.vue2App = undefined;
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
				[this.vnode()],
			),
			el: this.$el,
		}));
	},

	beforeUnmount() {
		this.vue2App.$destroy();
	},

	render() {
		if (this.vue2App) {
			this.vue2App.$forceUpdate();
		}

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

	provide() {
		return {};
	},

	// Delay until mounted for SSR
	mounted() {
		const vm = this;
		this.v3app = createApp({
			render: () => h(
				this.$options.component,
				mergeAttrsListeners(this),
				interopSlots(this),
			),
			mounted() {
				vm.v3forceUpdate = () => this.$forceUpdate();

				// Expose child component API
				vm.v3 = this._.subTree.component.proxy;
			},
		});

		// Proxy provide-inject
		this.v3app._context.provides = new Proxy({}, {
			has: (_, key) => resolveInjection(this, key),
			get: (_, key) => resolveInjection(this, key),
			set: (_, key, value) => {
				this._provided[key] = value;
				return true;
			},
		});

		const {$el} = this;
		const root = this.v3app.mount(vue3ProxyNode($el));
		this.$el = root.$el;
		$el.remove();
	},

	beforeDestroy() {
		this.v3app.unmount();
	},

	render(h) {
		if (this.v3forceUpdate) {
			this.v3forceUpdate();
		}

		return h('div');
	},
};

const toVue2 = vue3Component => {
	const vue2Wrapper = Object.create(vue2WrapperBase);
	vue2Wrapper.component = vue3Component;
	return vue2Wrapper;
};

export default toVue2;
