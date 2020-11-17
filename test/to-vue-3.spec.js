const {toVue3} = require('vue-2-3');
const {createApp, provide, inject, nextTick} = require('vue3');
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
				I'm Vue 3

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

	// TEST REF - it doesnt work

});
