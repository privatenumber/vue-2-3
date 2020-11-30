(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.toVue3 = factory());
}(this, (function () { 'use strict';

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  var noop = function noop() {};

  function vue3ProxyNode(element) {
    return {
      insertBefore: function insertBefore(newNode, referenceNode) {
        return element.parentNode.insertBefore(newNode, referenceNode || element);
      },
      removeAttribute: noop,
      setAttribute: noop
    };
  }

  var Vue2;

  try {
    Vue2 = require('vue');
  } catch (_unused) {}

  var Vue3;

  try {
    Vue3 = require('vue3');
  } catch (_unused2) {}

  var hyphenateRE = /\B([A-Z])/g;

  var hyphenate = function hyphenate(string) {
    return string.replace(hyphenateRE, '-$1').toLowerCase();
  };

  var eventListenerPtrn = /^on[A-Z]/;
  var optionsModifierRE = /(Once|Passive|Capture)$/;
  var eventPrefixes = {
    Once: '~',
    Passive: '&',
    Capture: '!'
  };

  function getAttrsAndListeners($attrs) {
    var data = {
      style: undefined,
      "class": undefined,
      on: {},
      attrs: {},
      props: {}
    };
    var on = data.on,
        attrs = data.attrs;

    for (var attr in $attrs) {
      if (eventListenerPtrn.test(attr)) {
        var listenerName = attr.slice(2);

        if (optionsModifierRE.test(listenerName)) {
          var m = void 0;

          while (m = listenerName.match(optionsModifierRE)) {
            listenerName = eventPrefixes[m[0]] + listenerName.slice(0, -m[0].length);
          }

          listenerName = listenerName.replace('!~', '~!');
        }

        listenerName = hyphenate(listenerName);
        on[listenerName] = $attrs[attr];
      } else if (attr === 'class' || attr === 'style') {
        data[attr] = $attrs[attr];
      } else {
        attrs[attr] = $attrs[attr];
      }
    }

    return data;
  }

  var renderVue3Vnode = {
    props: ['parent', 'vnode'],
    mounted: function mounted() {
      var _this = this;

      this.vue3App = Vue3.createApp({
        render: function render() {
          return _this.vnode();
        }
      });
      this.vue3App._context.provides = this.parent._.provides;
      var $el = this.$el;
      this.vue3App.mount(vue3ProxyNode($el));
      $el.remove();
    },
    destroyed: function destroyed() {
      this.vue3App.unmount();
    },
    render: function render(h) {
      return h('div');
    }
  };

  function transformSlots(h, ctx) {
    var slots = {};

    var _loop = function _loop(slotName) {
      slots[slotName] = function () {
        return h(renderVue3Vnode, {
          attrs: {
            parent: ctx,
            vnode: ctx.$slots[slotName]
          }
        });
      };
    };

    for (var slotName in ctx.$slots) {
      _loop(slotName);
    }

    return slots;
  }

  function setFakeParentWhileUnmounted(node, fakeParent) {
    Object.defineProperty(node, 'parentNode', {
      get: function get() {
        return this.parentElement || fakeParent;
      }
    });
  }

  var isConfigurableProperty = {
    configurable: true
  };

  var isVue3 = function isVue3(vm) {
    return vm._ && vm._.uid;
  };

  var vue3WrapperBase = {
    created: function created() {
      if (!isVue3(this)) {
        throw new Error('toVue3 must be used to mount a component in a Vue 3 app');
      }

      this.v2 = undefined;
    },
    mounted: function mounted() {
      var _this2 = this;

      var vm = this;
      var mountElement = this.$el;
      this.v2 = new Vue2({
        provide: function provide() {
          return new Proxy(vm._.provides, {
            getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, key) {
              if (key in target) {
                return isConfigurableProperty;
              }
            }
          });
        },
        render: function render(h) {
          return h(vm.$options.component, _extends({}, getAttrsAndListeners(vm.$attrs), {
            scopedSlots: transformSlots(h, vm)
          }));
        },
        mounted: function mounted() {
          // Rewrite Vue3 vnodes to reference Vue 2 element
          // Add to toVue2?
          var source = vm._;
          var originalNode = source.vnode.el;

          while (source.vnode.el === originalNode) {
            source.vnode.el = this.$el;

            if (source.parent) {
              source = source.parent;
            }
          } // Trick Vue 3 into thinking its element is still in the DOM


          setFakeParentWhileUnmounted(mountElement, this.$el.parentNode);
        },
        destroyed: function destroyed() {
          this.$el.replaceWith(mountElement);
        },
        methods: {
          exposeProvided: function exposeProvided(provided) {
            return Object.assign(_this2._.provides, provided);
          }
        },
        el: mountElement
      });
    },
    beforeUnmount: function beforeUnmount() {
      this.v2.$destroy();
    },
    render: function render() {
      if (this.v2) {
        this.v2.$forceUpdate();
      }

      return Vue3.h('div');
    }
  };
  var getProvidedMixin = {
    created: function created() {
      this.$root.exposeProvided(this._provided);
    }
  };

  var toVue3 = function toVue3(vue2Component) {
    if (!Vue2 && !Vue3) {
      throw new Error('Vue 2 & 3 were not resolved with bare specifiers "vue" & "vue3". Register them with toVue3.register(Vue2, Vue3)');
    }

    if (!Vue2) {
      throw new Error('Vue 2 was not resolved with bare specifier "vue". Register it with toVue3.register(Vue)');
    }

    if (!Vue3) {
      throw new Error('Vue 3 was not resolved with bare specifier "vue3". Register it with toVue3.register(Vue3) or toVue3.register({ createApp, h })');
    }

    var component = Object.create(vue2Component);
    component.mixins = [getProvidedMixin].concat(vue2Component.mixins || []);
    var vue3Wrapper = Object.create(vue3WrapperBase);
    vue3Wrapper.component = component;
    return vue3Wrapper;
  };

  toVue3.register = function () {
    for (var i = 0; i < arguments.length; i += 1) {
      // eslint-disable-line unicorn/no-for-loop
      var Vue = arguments[i];

      if (typeof Vue === 'function' && Vue.version && Vue.version.startsWith('2')) {
        Vue2 = Vue;
      } else if (Vue.createApp && Vue.h) {
        Vue3 = Vue;
      }
    }
  };

  return toVue3;

})));
