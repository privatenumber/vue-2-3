const {toVue2} = require('vue-2-3');
const {provide, inject, nextTick} = require('vue3');
const {mount} = require('@vue/test-utils');

describe('Vue 3 component in a Vue 2 app', () => {
	test('render', () => {
		const Vue3Component = {
			setup() {
				return {
					setupWorks: 'Setup Works',
				};
			},
			props: ['propWorks'],
			inheritAttrs: false,
			template: `
				I'm Vue 3

				{{ setupWorks }}

				{{ propWorks }}

				<div v-bind="$attrs" />

				<slot />
				<slot name="named-slot" />
				<slot name="template-slot" />
				<slot name="element-slot" />
			`,
		};

		const vm = mount({
			template: `
			<div>
				I'm Vue 2

				<vue3-component :prop-works="'Prop works!'" title="attr inherited">
					Default slot

					<div>some element</div>

					<template #named-slot>
						Named slot
					</template>

					<div slot="element-slot">
						Element slot
					</div>

				</vue3-component>
			</div>
			`,
			components: {
				Vue3Component: toVue2(Vue3Component),
			},
		});

		expect(vm.html()).toMatchSnapshot();
	});

	test('reactivity', async () => {
		const Vue3Component = {
			props: ['number'],
			template: `
				<div>
					I'm Vue 3

					Prop: {{ number }}

					<slot />
					<slot name="named-slot" />
					<slot name="template-slot" />
					<slot name="element-slot" />
					<slot name="conditional-slot" />
				</div>
			`,
		};

		const vm = mount({
			template: `
			<div>
				I'm Vue 2
				{{ number }}

				<template v-if="number % 2">
					Conditional
				</template>
				<vue3-component
					v-if="shown"
					:number="number"
					:title="'Attribute ' + number"
				>
					Default slot {{ number * 2 }}

					<template #named-slot>
						Named slot {{ number * 3 }}
					</template>

					<div slot="element-slot">
						Element slot {{ number * 4}}
					</div>

					<template
						v-if="number % 2"
						slot="conditional-slot"
					>
						Conditional slot
					</template>
				</vue3-component>
			</div>
			`,
			components: {
				Vue3Component: toVue2(Vue3Component),
			},
			data() {
				return {
					number: 0,
					shown: true,
				};
			},
		});

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({number: 1});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({number: 2});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({number: 3});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({shown: false});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();
	});

	test('event-listeners', async () => {
		const clickHandler = jest.fn();
		const customEventHandler = jest.fn();

		const Vue3Component = {
			template: '<button @click="$emit(\'custom-event\')">I\'m Vue 3</button>',
		};

		const vm = mount({
			template: `
			<div>
				I'm Vue 2

				<vue3-component
					id="button"
					@click.capture.once="clickHandler"
					@custom-event="customEventHandler"
				>
					Click me
				</vue3-component>
			</div>
			`,
			components: {
				Vue3Component: toVue2(Vue3Component),
			},
			methods: {
				clickHandler,
				customEventHandler,
			},
		});

		vm.find('#button').element.click();
		vm.find('#button').element.click();
		expect(clickHandler).toHaveBeenCalledTimes(1);
		expect(customEventHandler).toHaveBeenCalledTimes(2);
	});

	describe('provide/inject', () => {
		test('object provide', async () => {
			const randomValue = Math.random();
			const Vue3Parent = {
				template: '<slot/>',
				provide: {
					randomValue,
				},
			};

			const Vue3Child = {
				template: '{{ randomValue }}',
				inject: ['randomValue'],
			};

			const vm = mount({
				template: `
				<div>
					<vue3-parent>
						<vue3-child />
					</vue3-parent>
				</div>
				`,
				components: {
					Vue3Parent: toVue2(Vue3Parent),
					Vue3Child: toVue2(Vue3Child),
				},
			});

			expect(vm.html()).toBe(`<div>${randomValue}</div>`);
		});

		test('function provide', async () => {
			const randomValue = Math.random();
			const Vue3Parent = {
				template: '<slot/>',
				provide() {
					return {
						randomValue,
					};
				},
			};

			const Vue3Child = {
				template: '{{ randomValue }}',
				inject: ['randomValue'],
			};

			const vm = mount({
				template: `
				<div>
					<vue3-parent>
						<vue3-child />
					</vue3-parent>
				</div>
				`,
				components: {
					Vue3Parent: toVue2(Vue3Parent),
					Vue3Child: toVue2(Vue3Child),
				},
			});

			expect(vm.html()).toBe(`<div>${randomValue}</div>`);
		});

		// Waiting on https://github.com/vuejs/vue-next/issues/2615
		// test('function provide symbol key', async () => {
		// 	const key = Symbol('zx');

		// 	const randomValue = Math.random();

		// 	const Vue3Parent = {
		// 		template: '<slot/>',
		// 		provide() {
		// 			return {
		// 				a: 1,
		// 				[key]: randomValue,
		// 			};
		// 		},
		// 	};

		// 	const Vue3Child = {
		// 		template: '{{ randomValue }}',
		// 		inject: {
		// 			randomValue: key,
		// 		},
		// 		mounted() {
		// 			console.log(this);
		// 		}
		// 	};

		// 	const vm = mount({
		// 		template: `
		// 		<div>
		// 			<vue3-parent>
		// 				<vue3-child />
		// 			</vue3-parent>
		// 		</div>
		// 		`,
		// 		components: {
		// 			Vue3Parent: toVue2(Vue3Parent),
		// 			Vue3Child: toVue2(Vue3Child)
		// 		},
		// 	});

		// 	expect(vm.html()).toBe(`<div>${randomValue}</div>`);
		// });

		test('setup provide/inject', async () => {
			const randomValue = Math.random();
			const symbolKey = Symbol('provide');
			const Vue3Parent = {
				template: '<slot/>',
				setup() {
					provide('randomValue', randomValue);
					provide(symbolKey, 1);
				},
			};

			const Vue3Child = {
				setup() {
					const randomValue = inject('randomValue');
					const symbolInjection = inject(symbolKey);
					return {
						randomValue,
						symbolInjection,
					};
				},
				template: '{{ randomValue }} {{ symbolInjection }}',
			};

			const vm = mount({
				template: `
				<div>
					<vue3-parent>
						<vue3-child />
					</vue3-parent>
				</div>
				`,
				components: {
					Vue3Parent: toVue2(Vue3Parent),
					Vue3Child: toVue2(Vue3Child),
				},
			});

			expect(vm.html()).toBe(`<div>${randomValue} 1</div>`);
		});
	});

	// Test ref
	// Test providing from Vue2 component to Vue 3
});
