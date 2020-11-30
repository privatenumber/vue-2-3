# vue-2-3 [![Latest version](https://badgen.net/npm/v/vue-2-3)](https://npm.im/vue-2-3) [![Monthly downloads](https://badgen.net/npm/dm/vue-2-3)](https://npm.im/vue-2-3) [![Install size](https://packagephobia.now.sh/badge?p=vue-2-3)](https://packagephobia.now.sh/result?p=vue-2-3)

Interop Vue 2 components with Vue 3 apps and vice versa!

```html
<template>
    I'm a Vue 3 app... but I can use Vue 2 components!

    <some-vue2-component />
</template>

<script>
import SomeVue2Component from 'some-vue2-component'
import toVue3 from 'vue-2-3/to-vue-3'

export default {
    components: {
        SomeVue2Component: toVue3(SomeVue2Component)
    }
}
</script>
```

## 🙋‍♂️ Why?
- **⛵️ Smooth Vue 3 migration strategy** Incrementally rewrite your components to be Vue 3 compatible!
- **🔥 Expand Vue 2 and 3 ecosystem** Tap into the vast Vue 2 ecosystem from your Vue 3 app and vice-versa!

## 🚀 Install
```sh
npm i vue-2-3
```

## 🚦 Quick Setup
1. Import `vue-2-3/to-vue-2` or `vue-2-3/to-vue-3`.
    - Use `toVue2` to interop **Vue 3** components with a **Vue 2** app

        ```js
        import toVue2 from 'vue-2-3/to-vue-2';
        ```

    - Use `toVue3` to interop **Vue 2** components with a **Vue 3** app

        ```js
        import toVue3 from 'vue-2-3/to-vue-3';
        ```

2. It will automatically try to resolve Vue 2 & 3 via bare specifiers `vue` and `vue3` but if it can't find them, you can manually register them. You only need to do this once so it's suggested to be done at the top of your app.

    ```js
    import Vue2 from 'vue2';
    import * as Vue3 from 'vue@next';

    toVue2.register(Vue2, Vue3);
    ```

    For Vue 3, you can provide the necessary exports `createApp` and `h` to keep dependencies to a minimum:

    ```js
    import { createApp, h } from 'vue@next';

    toVue2.register({ createApp, h });
    ```

3. Pass the component in and start using it!

    ```js
    import SomeVue2Component from './some-vue2-component';

    export default {
        components: {
            SomeVue2Component: toVue3(SomeVue2Component)
        }
    }
    ```
