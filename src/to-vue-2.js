import frag from 'vue-frag';
import {vue3ProxyNode} from './utils';

let Vue2;
try {
	Vue2 = require('vue');
} catch {}

let Vue3;
try {
	Vue3 = require('vue3');
} catch {}

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
		this.vue2App = (new Vue2({
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

		return Vue3.h('div');
	},
};

function interopSlots(ctx) {
	const scopedSlots = {};
	for (const slotName in ctx.$scopedSlots) {
		scopedSlots[slotName] = () => Vue3.h(renderVue2Vnode, {
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

const isVue2 = vm => vm._uid && vm._isVue;

const vue2WrapperBase = {
	inheritAttrs: false,

	beforeCreate() {
		if (!isVue2(this)) {
			throw new Error('toVue2 must be used to mount a component in a Vue 2 app');
		}
	},

	provide() {
		return {};
	},

	// Delay until mounted for SSR
	mounted() {
		const vm = this;
		this.v3app = Vue3.createApp({
			render: () => Vue3.h(
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
	if (!Vue2 && !Vue3) {
		throw new Error('Vue 2 & 3 were not resolved with bare specifiers "vue" & "vue3". Register them with toVue3.register(Vue2, Vue3)');
	}

	if (!Vue2) {
		throw new Error('Vue 2 was not resolved with bare specifier "vue". Register it with toVue3.register(Vue)');
	}

	if (!Vue3) {
		throw new Error('Vue 3 was not resolved with bare specifier "vue3". Register it with toVue3.register(Vue3) or toVue3.register({ createApp, h })');
	}

	const vue2Wrapper = Object.create(vue2WrapperBase);
	vue2Wrapper.component = vue3Component;
	return vue2Wrapper;
};

toVue2.register = function () {
	for (let i = 0; i < arguments.length; i += 1) { // eslint-disable-line unicorn/no-for-loop
		const Vue = arguments[i];
		if (typeof Vue === 'function' && Vue.version && Vue.version.startsWith('2')) {
			Vue2 = Vue;
		} else if (Vue.createApp && Vue.h) {
			Vue3 = Vue;
		}
	}
};

export default toVue2;
