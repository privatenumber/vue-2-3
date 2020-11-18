const {toVue3} = require('vue-2-3');
const {createApp, nextTick} = require('vue3');
const outdent = require('outdent');

let mountTarget;
let app;
beforeEach(() => {
	mountTarget = document.createElement('div');
	document.body.append(mountTarget);
});

afterEach(() => {
	app.unmount();
	mountTarget.remove();
	app = null;
	mountTarget = null;
});

function mount(_app) {
	app = createApp(_app);

	const vm = app.mount(mountTarget);

	return {
		vm,
		html: () => mountTarget.innerHTML,
	};
}

describe('Vue 2 component in a Vue 3 app', () => {
	test('render', () => {
		const Vue2Component = {
			props: ['someProp'],
			template: outdent`
			<div v-bind="$attrs">
				Im Vue 2

				{{ someProp }}

				<slot />

				<slot name="scoped-slot" />
			</div>
			`,
		};

		const app = mount({
			template: outdent`
			<div>
				I'm Vue 3

				<vue-2-component
					:some-prop="'prop works!'"
					some-attr="321"
				>
					Default slot

					<div>some element</div>

					<template #scoped-slot>
						Scoped slot
						<div>some element 2</div>
					</template>
				</vue-2-component>
			</div>
			`,
			components: {
				vue2Component: toVue3(Vue2Component),
			},
		});

		expect(app.html()).toMatchSnapshot();
	});

	test('reactivity', async () => {
		const Vue2Component = {
			props: ['number'],
			template: `
				<article>
					I'm Vue 2

					Prop: {{ number }}

					<slot />
					<slot name="scoped-slot" />
					<slot name="conditional-slot" />
				</article>
			`,
		};

		const app = mount({
			template: `
			<div>
				I'm Vue 3
				{{ number }}

				<vue-2-component
					v-if="shown"
					:number="number"
					:title="'Attribute ' + number"
				>
					Default slot {{ number * 2 }}

					<template #scoped-slot>
						Scoped slot {{ number * 3 }}
					</template>

					<template
						v-if="number % 2"
						slot="conditional-slot"
					>
						Conditional slot
					</template>
				</vue-2-component>
			</div>
			`,
			components: {
				Vue2Component: toVue3(Vue2Component),
			},
			data() {
				return {
					number: 0,
					shown: true,
				};
			},
		});

		expect(app.html()).toMatchSnapshot();

		app.vm.number = 1;

		await nextTick();

		expect(app.html()).toMatchSnapshot();

		app.vm.number = 2;

		await nextTick();

		expect(app.html()).toMatchSnapshot();

		app.vm.number = 3;

		await nextTick();

		expect(app.html()).toMatchSnapshot();

		app.vm.shown = false;

		await nextTick();

		expect(app.html()).toMatchSnapshot();

		app.vm.shown = true;

		await nextTick();

		expect(app.html()).toMatchSnapshot();
	});

	test('event-listeners', async () => {
		const clickHandler = jest.fn();
		const customEventHandler = jest.fn();

		const Vue2Component = {
			template: '<button v-on="$listeners" @click="$emit(\'custom-event\')">I\'m Vue 2</button>',
		};

		const app = mount({
			template: outdent`
			<div>
				<vue-2-component
					id="button"
					@click.capture.once="clickHandler"
					@custom-event="customEventHandler"
				>
					Click me
				</vue-2-component>
			</div>
			`,

			components: {
				vue2Component: toVue3(Vue2Component),
			},

			methods: {
				clickHandler,
				customEventHandler,
			},
		});

		const button = app.vm.$el.querySelector('#button');

		button.click();
		button.click();

		expect(clickHandler).toHaveBeenCalledTimes(1);
		expect(customEventHandler).toHaveBeenCalledTimes(2);
	});

	describe('provide/inject', () => {
		test('object provide', async () => {
			const randomValue = Math.random();

			const Vue2Parent = {
				template: '<div><slot/></div>',
				provide: {
					randomValue,
				},
			};

			const Vue2Child = {
				template: '<div>{{ randomValue }}</div>',
				inject: ['randomValue'],
			};

			const app = mount({
				template: outdent`
				<vue2-parent>
					<vue2-child />
				</vue2-parent>
				`,

				components: {
					Vue2Parent: toVue3(Vue2Parent),
					Vue2Child: toVue3(Vue2Child),
				},
			});

			expect(app.html()).toBe(`<div><div>${randomValue}</div></div>`);
		});

		test('function provide', async () => {
			const randomValue = Math.random();

			const Vue2Parent = {
				template: '<div><slot/></div>',
				provide() {
					return {
						randomValue,
					};
				},
			};

			const Vue2Child = {
				template: '<div>{{ randomValue }}</div>',
				inject: ['randomValue'],
			};

			const app = mount({
				template: outdent`
				<vue2-parent>
					<vue2-child />
				</vue2-parent>
				`,

				components: {
					Vue2Parent: toVue3(Vue2Parent),
					Vue2Child: toVue3(Vue2Child),
				},
			});

			expect(app.html()).toBe(`<div><div>${randomValue}</div></div>`);
		});

		test('provide from Vue 3', async () => {
			const randomValue = Math.random();

			const Vue2Component = {
				template: '<div>{{ randomValue }}</div>',
				inject: ['randomValue'],
			};

			const app = mount({
				template: '<vue-2-component />',

				components: {
					Vue2Component: toVue3(Vue2Component),
				},

				provide() {
					return {
						randomValue,
					};
				},
			});

			expect(app.html()).toBe(`<div>${randomValue}</div>`);
		});

		test('provide from Vue 2', async () => {
			const randomValue = Math.random();

			const Vue2Parent = {
				template: '<div><slot/></div>',
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

			const app = mount({
				template: outdent`
				<vue-2-parent>
					<vue-3-child />
				</vue-2-parent>
				`,

				components: {
					Vue2Parent: toVue3(Vue2Parent),
					Vue3Child,
				},
			});

			expect(app.html()).toBe(`<div>${randomValue}</div>`);
		});
	});

	// TEST REF - it doesnt work

	// test internal API. What does this.$parent do on a vue 2 component in a Vue 3 app?
});
