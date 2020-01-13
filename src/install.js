import ChangeDetector from './change-detector'
import { createComputedProp, getMapComputed, getMapMethod } from './helper'
import { MAP_STATE_FIELD, MAP_ACTION_FIELD } from './helper'



export default function install(Vue, store) {
  const changeDetector = new ChangeDetector(Vue)
  function beforeCreate() {
    const vm = this
    // inject $store
    const options = vm.$options
    if (options.store) {
      vm.$store = (typeof options.store === 'function'
        ? options.store()
        : options.store
      ) || store
    } else if (options.parent && options.parent.$store) {
      vm.$store = options.parent.$store
    } else if (store) {
      vm.$store = store
    }
  
    // inject computed
    // hack compatible vuex mapState
    if(vm.$options.computed && vm.$options.computed[MAP_STATE_FIELD]) {
      vm.$options[MAP_STATE_FIELD] = vm.$options.computed[MAP_STATE_FIELD]
      delete vm.$options.computed[MAP_STATE_FIELD]
    }

    vm.$options.computed = getMapComputed(vm).reduce(
      (computed, {key, set}) => {
        changeDetector.defineReactiveProperty(vm, key)
        computed[key] = createComputedProp(changeDetector, vm.$store, vm, key, set)
        return computed
      }, 
      vm.$options.computed || {}
    )
  
    // inject methods
    if (vm.$options.methods && vm.$options.methods[MAP_ACTION_FIELD]) {
      vm.$options[MAP_ACTION_FIELD] = vm.$options.methods[MAP_ACTION_FIELD]
      delete vm.$options.methods[MAP_ACTION_FIELD]
    }
    vm.$options.methods = getMapMethod(vm).reduce(
      (methods, {key, method}) => {
        methods[key] = method
        return methods
      },
      vm.$options.methods || {}
    )
  }

  function created() {
    const vm = this
    changeDetector.defineReactionList(vm, getMapComputed(vm))
  }

  function beforeDestroy() {
    const vm = this
    changeDetector.removeReactionList(vm)
    getMapComputed(vm).forEach(({key}) => changeDetector.removeReactiveProperty(vm, key))
  }

  Vue.mixin({
    beforeCreate,
    created,
    beforeDestroy
  })

}