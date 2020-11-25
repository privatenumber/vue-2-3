(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('vue'), require('vue3')) :
  typeof define === 'function' && define.amd ? define(['vue', 'vue3'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.toVue3 = factory(global.Vue, global.Vue3));
}(this, (function (Vue, vue3) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var Vue__default = /*#__PURE__*/_interopDefaultLegacy(Vue);

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

      this.vue3App = vue3.createApp({
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
      this.v2 = new Vue__default['default']({
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

      return vue3.h('div');
    }
  };
  var getProvidedMixin = {
    created: function created() {
      this.$root.exposeProvided(this._provided);
    }
  };

  var toVue3 = function toVue3(vue2Component) {
    var component = Object.create(vue2Component);
    component.mixins = [getProvidedMixin].concat(vue2Component.mixins || []);
    var vue3Wrapper = Object.create(vue3WrapperBase);
    vue3Wrapper.component = component;
    return vue3Wrapper;
  };

  return toVue3;

})));
