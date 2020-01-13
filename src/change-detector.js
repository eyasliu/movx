import * as mobx from 'mobx'

export default class ChangeDetector {
  constructor(Vue) {
      this.defineReactive = Vue.util.defineReactive;
      this.mobxMethods = mobx;
      this.changeDetector = new Vue();
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
  defineReactionList(vm, fromMobxEntries) {
      const reactivePropertyListKey = this._getReactionListKey(vm);
      const reactivePropertyList = fromMobxEntries.map(({ key, get }) => {
          const updateReactiveProperty = value => { this.updateReactiveProperty(vm, key, value); };
          return this.mobxMethods.reaction(() => get.call(vm), updateReactiveProperty, {
              fireImmediately: true
          });
      });
      this.changeDetector[reactivePropertyListKey] = reactivePropertyList;
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