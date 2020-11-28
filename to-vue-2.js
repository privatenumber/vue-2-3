(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.toVue2 = factory());
}(this, (function () { 'use strict';

	var e = Symbol();

	function r(r, t) {
	  r[e] || (r[e] = t, Object.defineProperty(r, "parentNode", {
	    get: function get() {
	      return this[e] || this.parentElement;
	    }
	  }));
	}

	var t = function t(r, _t) {
	  var n = r.splice(0);
	  _t.append.apply(_t, n), n.forEach(function (r) {
	    r[e] = void 0;
	  });
	};

	function n(e, t) {
	  if (this.frag) {
	    var n = this.frag.indexOf(t);
	    n > -1 && this.frag.splice(n, 0, e);
	  }

	  if (this[a]) {
	    var i = this[a].get(t);
	    i && (t = i[0]);
	  }

	  t.before(e), r(e, this);
	}

	function i(r) {
	  if (this.frag) {
	    var n = this.frag.indexOf(r);
	    n > -1 && this.frag.splice(n, 1);
	  }

	  var i = this[a];

	  if (i) {
	    var f = i.get(r);
	    if (f) return t(f, r), i["delete"](r), void (r[e] = void 0);
	  }

	  r.remove();
	}

	var a = Symbol(),
	    f = {
	  insertBefore: n,
	  removeChild: i
	};
	var o = Symbol(),
	    s = {
	  insertBefore: n,
	  before: function before(e) {
	    this.frag[0].before(e);
	  },
	  remove: function remove() {
	    var e = this[o],
	        r = this.frag,
	        t = r.splice(0, r.length, e);
	    t[0].before(this[o]), t.forEach(function (e) {
	      return e.remove();
	    });
	  },
	  removeChild: i,
	  appendChild: function appendChild(e) {
	    var t = this.frag.length;
	    this.frag[t - 1].after(e);
	    var n = this[o];
	    this.frag[0] === n && (this.frag.splice(0, 1), n.remove()), r(e, this), this.frag.push(e);
	  }
	},
	    c = {
	  inserted: function inserted(e) {
	    var t = Array.from(e.childNodes),
	        n = e.parentNode,
	        i = document.createComment("");
	    e[o] = i, 0 === t.length && t.push(i);
	    var c = document.createDocumentFragment();
	    c.append.apply(c, t), e.replaceWith(c), e.frag = t, function (e, r, t) {
	      e[a] || (e[a] = new Map(), Object.assign(e, f)), e[a].set(r, t);
	    }(n, e, t), r(e, n), t.forEach(function (t) {
	      return r(t, e);
	    }), Object.defineProperty(e, "innerHTML", {
	      set: function set(r) {
	        var t = document.createElement("div");
	        t.innerHTML = r;
	        var n = e.frag.length;
	        Array.from(t.childNodes).forEach(function (r) {
	          return e.appendChild(r);
	        }), t.append.apply(t, e.frag.splice(0, n));
	      },
	      get: function get() {
	        return "";
	      }
	    }), Object.assign(e, s);
	  },
	  unbind: function unbind(e) {
	    t(e.frag, e), e[o].remove();
	  }
	};

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

	var camelizeRE = /-(\w)/g;

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

	  return "on" + (eventName[0].toUpperCase() + eventName.slice(1).replace(camelizeRE, function (_, c) {
	    return c ? c.toUpperCase() : '';
	  }));
	}

	function mergeAttrsListeners(_ref) {
	  var $attrs = _ref.$attrs,
	      $listeners = _ref.$listeners,
	      $vnode = _ref.$vnode;
	  var data = $vnode.data;
	  var attrs = Object.assign({}, $attrs);

	  if (data["class"] || data.staticClass) {
	    attrs["class"] = [data["class"], data.staticClass];
	  }

	  if (data.style || data.staticStyle) {
	    attrs.style = [data.style, data.staticStyle];
	  }

	  for (var listener in $listeners) {
	    attrs[normalizeEventName(listener)] = $listeners[listener];
	  }

	  return attrs;
	}

	var renderVue2Vnode =
	/* Vue 3 component */
	{
	  props: ['parent', 'vnode'],
	  created: function created() {
	    this.vue2App = undefined;
	  },
	  mounted: function mounted() {
	    var _this = this;

	    var vm = this;
	    this.vue2App = new Vue2({
	      beforeCreate: function beforeCreate() {
	        this.$parent = vm.parent;
	      },
	      directives: {
	        frag: c
	      },
	      render: function render(h) {
	        return h('div', {
	          directives: [{
	            name: 'frag'
	          }]
	        }, [_this.vnode()]);
	      },
	      el: this.$el
	    });
	  },
	  beforeUnmount: function beforeUnmount() {
	    this.vue2App.$destroy();
	  },
	  render: function render() {
	    if (this.vue2App) {
	      this.vue2App.$forceUpdate();
	    }

	    return Vue3.h('div');
	  }
	};

	function interopSlots(ctx) {
	  var scopedSlots = {};

	  var _loop = function _loop(slotName) {
	    scopedSlots[slotName] = function () {
	      return Vue3.h(renderVue2Vnode, {
	        parent: ctx,
	        vnode: ctx.$scopedSlots[slotName]
	      });
	    };
	  };

	  for (var slotName in ctx.$scopedSlots) {
	    _loop(slotName);
	  }

	  return scopedSlots;
	}

	function resolveInjection(vm, key) {
	  var source = vm;

	  while (source) {
	    if (source._provided && source._provided[key]) {
	      return source._provided[key];
	    }

	    source = source.$parent;
	  }
	}

	var isVue2 = function isVue2(vm) {
	  return vm._uid && vm._isVue;
	};

	var vue2WrapperBase = {
	  inheritAttrs: false,
	  beforeCreate: function beforeCreate() {
	    if (!isVue2(this)) {
	      throw new Error('toVue2 must be used to mount a component in a Vue 2 app');
	    }
	  },
	  provide: function provide() {
	    return {};
	  },
	  // Delay until mounted for SSR
	  mounted: function mounted() {
	    var _this2 = this;

	    var vm = this;
	    this.v3app = Vue3.createApp({
	      render: function render() {
	        return Vue3.h(_this2.$options.component, mergeAttrsListeners(_this2), interopSlots(_this2));
	      },
	      mounted: function mounted() {
	        var _this3 = this;

	        vm.v3forceUpdate = function () {
	          return _this3.$forceUpdate();
	        }; // Expose child component API


	        vm.v3 = this._.subTree.component.proxy;
	      }
	    }); // Proxy provide-inject

	    this.v3app._context.provides = new Proxy({}, {
	      has: function has(_, key) {
	        return resolveInjection(_this2, key);
	      },
	      get: function get(_, key) {
	        return resolveInjection(_this2, key);
	      },
	      set: function set(_, key, value) {
	        _this2._provided[key] = value;
	        return true;
	      }
	    });
	    var $el = this.$el;
	    var root = this.v3app.mount(vue3ProxyNode($el));
	    this.$el = root.$el;
	    $el.remove();
	  },
	  beforeDestroy: function beforeDestroy() {
	    this.v3app.unmount();
	  },
	  render: function render(h) {
	    if (this.v3forceUpdate) {
	      this.v3forceUpdate();
	    }

	    return h('div');
	  }
	};

	var toVue2 = function toVue2(vue3Component) {
	  if (!Vue2 && !Vue3) {
	    throw new Error('Vue 2 & 3 were not resolved with bare specifiers "vue" & "vue3". Register them with toVue3.register(Vue2, Vue3)');
	  }

	  if (!Vue2) {
	    throw new Error('Vue 2 was not resolved with bare specifier "vue". Register it with toVue3.register(Vue)');
	  }

	  if (!Vue3) {
	    throw new Error('Vue 3 was not resolved with bare specifier "vue3". Register it with toVue3.register(Vue3) or toVue3.register({ createApp, h })');
	  }

	  var vue2Wrapper = Object.create(vue2WrapperBase);
	  vue2Wrapper.component = vue3Component;
	  return vue2Wrapper;
	};

	toVue2.register = function () {
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

	return toVue2;

})));
