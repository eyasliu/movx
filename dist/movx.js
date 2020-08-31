(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('mobx')) :
  typeof define === 'function' && define.amd ? define(['exports', 'mobx'], factory) :
  (global = global || self, factory(global.movx = {}, global.mobx));
}(this, (function (exports, mobx) { 'use strict';

  const MAP_STATE_FIELD = "__$mobxMapState__";
  const MAP_ACTION_FIELD = "__$mobxMapAction__";

  // /**
  //  * Return a function expect two param contains namespace and map. it will normalize the namespace and then the param's function will handle the new namespace and the map.
  //  * @param {Function} fn
  //  * @return {Function}
  //  */
  // export function normalizeNamespace (fn) {
  //   return (namespace, map) => {
  //     if (typeof namespace !== 'string') {
  //       map = namespace
  //       namespace = ''
  //     } else {
  //       namespace = namespace.replace(/\//g, '.')
  //       if (namespace.charAt(namespace.length - 1) !== '.') {
  //         namespace += '.'
  //       }
  //     }
  //     return fn(namespace, map)
  //   }
  // }
  function isObject(obj) {
    return obj !== null && typeof obj === 'object'
  }

  /**
   * Validate whether given map is valid or not
   * @param {*} map
   * @return {Boolean}
   */
  function isValidMap(map) {
    return Array.isArray(map) || isObject(map)
  }

  /**
   * Normalize the map
   * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
   * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
   * @param {Array|Object} map
   * @return {Object}
   */
  function normalizeMap(map) {
    if (!isValidMap(map)) {
      return []
    }
    return Array.isArray(map)
      ? map.map(key => ({ key, val: key }))
      : Object.keys(map).map(key => ({ key, val: map[key] }))

  }

  /**
  * 获取一个对象指定路径的值
  * 
  * @param {object} obj 需要获取的对象
  * @param {string} key 对象的路径
  * @param {any} def 如果指定路径没有值，返回的默认值
  * 
  * @example 
  * ```
  * get(window, 'location.host', 'default value')
  * ```
  */
  const get = (obj, key, def, p) => {
    if (typeof key === 'undefined') return def
    p = 0;
    key = key.split ? key.split('.') : key;
    while (obj && p < key.length) obj = obj[key[p++]];
    return (obj === undefined || p < key.length) ? def : obj;
  };

  const getParent = (store, field) => {
    let caller = store;
    switch (field.split('.').length) {
      case 0:
      case 1:
        caller = store;
        break;
      default:
        const parentField = field.substr(0, field.lastIndexOf('.'));
        const parent = get(store, parentField);
        caller = parent;
        break;
    }
    return caller
  };

  const createComputedProp = (changeDetector, store, vm, key, setter, originGetter) => {
    const getter = () => changeDetector.getReactiveProperty(vm, key);

    if (typeof setter === 'function') {
      return {
        get: getter,
        set: (value) => setter.call(vm, value, store)
      }
    }

    return getter
  };

  const cacheComputed = {};
  const getMapComputed = (vm) => {
    let cacheKey = vm._uid;
    const cacheVal = cacheComputed[cacheKey];
    if (cacheVal) {
      return cacheVal
    }

    let opt = [];

    if (Array.isArray(vm.$options.mixins)) {
      vm.$options.mixins.forEach(mixin => {
        if (mixin.$mapState) {
          opt = opt.concat(normalizeMap(mixin.$mapState));
        }
      });
    }

    opt = opt
      .concat(normalizeMap(vm.$options.$mapState))
      .concat(normalizeMap(vm.$options.$computed))
      .concat(normalizeMap(vm.$options[MAP_STATE_FIELD]));
      // .concat(normalizeMap(vm.$options.computed))

    const store = vm.$store;

    // computed
    let computedList = normalizeMap(vm.$options.computed).map(({ key, val }) => {
      let fieldKey = key;
      let getter = val;
      let setter = null;
      if (typeof val === 'object' && typeof val.get === 'function') {
        getter = val.get;
      }
      if (typeof val === 'object' && typeof val.set === 'function') {
        setter = val.set;
      }

      // 用到了 $store 才加上监听，这个方法是有些挫，但暂时有用，以后再优化
      if (!~getter.toString().indexOf('$store')) {
        return null
      }

      return {
        key: fieldKey,
        get: getter,
        set: setter,
      }
    }).filter(i => i);

    const stateList = opt.map(({ key, val }) => {
      let fieldKey = key.replace(/\//g, '.').split('.').pop();
      let getter = val;
      let setter = null;

      if (typeof val === 'string') {
        // {field: 'name.x.y'}
        val = val.replace(/\//g, '.');
        getter = () => get(store, val);
      } else if (typeof val === 'function') {
        // {field: store => store.name}
        getter = () => val.call(vm, store);
      } else if (typeof val === 'object') {
        // {field: {get: store => store.name, set: (value, store) => store.setName(val)}}
        if (typeof val.get === 'string') {
          val.get = val.get.replace(/\//g, '.');
          getter = () => get(store, val.get);
        } else if (typeof val.get === 'function') {
          getter = () => val.get.call(vm, store);
        }

        if (typeof val.set === 'string') {
          val.set = val.set.replace(/\//g, '.');
          setter = (v) => get(store, val.set).call(getParent(store, val.set), v, store);
        } else if (typeof val.set === 'function') {
          setter = (v) => val.set.call(vm, v, store);
        }
      }
      return {
        key: fieldKey,
        get: getter,
        set: setter,
      }
    });
    
    const list = [
      ...computedList,
      ...stateList,
    ];

    cacheComputed[cacheKey] = list;

    return list

  };
  const getMapMethod = vm => {
    let opt = [];

    if (Array.isArray(vm.$options.mixins)) {
      vm.$options.mixins.forEach(mixin => {
        if (mixin.$mapAction) {
          opt = opt.concat(normalizeMap(mixin.$mapAction));
        }
      });
    }

    opt = opt
      .concat(normalizeMap(vm.$options.$mapAction))
      .concat(normalizeMap(vm.$options.$methods))
      .concat(normalizeMap(vm.$options[MAP_ACTION_FIELD]));

    if (!opt.length) {
      return []
    }

    const store = vm.$store;
    return opt.map(({ key, val }) => {
      let fieldKey = key.replace(/\//g, '.').split('.').pop();
      let method = val;
      if (typeof method === 'string') {
        // {field: 'name'}
        val = val.replace(/\//g, '.');
        method = get(store, val).bind(getParent(store, val));
      } else if (typeof method === 'function') {
        // {field: store => store.name}
        method = val.call(vm, store);
      }

      return {
        key: fieldKey,
        method,
      }
    })
  };

  class ChangeDetector {
    constructor(Vue) {
      this.defineReactive = Vue.util.defineReactive;
      this.mobxMethods = mobx;
      this._vm = new Vue({
        data: { $$store: {}}
      });
      this.changeDetector = this._vm.$data.$$store;
    }
    defineReactiveProperty(vm, key) {
      const reactivePropertyKey = this._getReactivePropertyKey(vm, key);
      this.defineReactive(this.changeDetector, reactivePropertyKey, null, null, true);
    }
    getReactiveProperty(vm, key) {
      const reactivePropertyKey = this._getReactivePropertyKey(vm, key);
      return this.changeDetector[reactivePropertyKey];
    }
    updateReactiveProperty(vm, key, value) {
      const reactivePropertyKey = this._getReactivePropertyKey(vm, key);
      this.changeDetector[reactivePropertyKey] = value;
    }
    removeReactiveProperty(vm, key) {
      const reactivePropertyKey = this._getReactivePropertyKey(vm, key);
      delete this.changeDetector[reactivePropertyKey];
    }
    defineReactionList(vm, computeds) {
      const reactivePropertyListKey = this._getReactionListKey(vm);
      const reactivePropertyList = computeds.map(({ key, get }) => {
        const updateReactiveProperty = value => { 
          this.updateReactiveProperty(vm, key, value); 
        };
        return this.mobxMethods.reaction(() => get.call(vm), updateReactiveProperty, {
          fireImmediately: true,
        });
      });
      this.changeDetector[reactivePropertyListKey] = reactivePropertyList;
    }
    defineRenderReaction(vm) {
      const renderReactive = this.mobxMethods.reaction(() => {
        if (typeof vm.$options.render === 'function') {
          return vm._render(vm.$createElement)
        }
      }, () => {
        vm.$forceUpdate();
      }, {
        fireImmediately: true
      });
      const reactivePropertyListKey = this._getReactionListKey(vm);
      this.changeDetector[reactivePropertyListKey].push(renderReactive);
    }
    removeReactionList(vm) {
      const reactivePropertyListKey = this._getReactionListKey(vm);
      this.changeDetector[reactivePropertyListKey].forEach(dispose => dispose());
      delete this.changeDetector[reactivePropertyListKey];
    }
    _getReactionListKey(vm) {
      return vm._uid;
    }
    _getReactivePropertyKey(vm, key) {
      return `${vm._uid}.${key}`;
    }
  }

  function install(Vue, store) {
    const changeDetector = new ChangeDetector(Vue);
    function beforeCreate() {
      const vm = this;
      // inject $store
      const options = vm.$options;
      if (options.store) {
        vm.$store = (typeof options.store === 'function'
          ? options.store()
          : options.store
        ) || store;
      } else if (options.parent && options.parent.$store) {
        vm.$store = options.parent.$store;
      } else if (store) {
        vm.$store = store;
      }

      // inject computed
      // hack compatible vuex mapState
      if (vm.$options.computed && vm.$options.computed[MAP_STATE_FIELD]) {
        vm.$options[MAP_STATE_FIELD] = vm.$options.computed[MAP_STATE_FIELD];
        delete vm.$options.computed[MAP_STATE_FIELD];
      }

      vm.$options.computed = getMapComputed(vm).reduce(
        (computed, { key, set, get }) => {
          changeDetector.defineReactiveProperty(vm, key);
          computed[key] = createComputedProp(changeDetector, vm.$store, vm, key, set);
          return computed
        },
        vm.$options.computed || {}
      );

      // inject methods
      if (vm.$options.methods && vm.$options.methods[MAP_ACTION_FIELD]) {
        vm.$options[MAP_ACTION_FIELD] = vm.$options.methods[MAP_ACTION_FIELD];
        delete vm.$options.methods[MAP_ACTION_FIELD];
      }
      vm.$options.methods = getMapMethod(vm).reduce(
        (methods, { key, method }) => {
          methods[key] = method;
          return methods
        },
        vm.$options.methods || {}
      );
    }

    function created() {
      const vm = this;
      changeDetector.defineReactionList(vm, getMapComputed(vm));
      changeDetector.defineRenderReaction(vm);
    }

    function beforeDestroy() {
      const vm = this;
      changeDetector.removeReactionList(vm);
      getMapComputed(vm).forEach(({ key }) => changeDetector.removeReactiveProperty(vm, key));
    }

    Vue.mixin({
      beforeCreate,
      created,
      beforeDestroy
    });

  }

  // import { normalizeNamespace } from './helper'

  const mapState = opt => {
    return {
      [MAP_STATE_FIELD]: opt
    }
  };

  const mapAction = opt => {
    return {
      [MAP_ACTION_FIELD]: opt
    }
  };

  var index = {
    install
  };

  exports.default = index;
  exports.mapAction = mapAction;
  exports.mapState = mapState;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
