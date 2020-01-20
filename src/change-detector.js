import * as mobx from 'mobx'
import { getComputedEntries } from './helper'

export default class ChangeDetector {
  constructor(Vue) {
    this.defineReactive = Vue.util.defineReactive;
    this.mobxMethods = mobx;
    this._vm = new Vue({
      data: { $$store: {}}
    });
    this.changeDetector = this._vm.$data.$$store
  }
  // get changeDetector() {
  //   return this._vm.$$state
  // }
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
    //   const computeds = getComputedEntries(vm)
    //   console.log(computeds)
    const reactivePropertyList = computeds.map(({ key, get }) => {
      const updateReactiveProperty = value => { 
        this.updateReactiveProperty(vm, key, value); 
        // vm.$forceUpdate()
      };
      return this.mobxMethods.reaction(() => get.call(vm), updateReactiveProperty, {
        fireImmediately: true,
        // onError(e) {
        //   // console.log(e)
        // }
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
      vm.$forceUpdate()
    }, {
      fireImmediately: true
    })
    const reactivePropertyListKey = this._getReactionListKey(vm);
    this.changeDetector[reactivePropertyListKey].push(renderReactive)
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