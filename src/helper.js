export const MAP_STATE_FIELD = "__$mobxMapState__"
export const MAP_ACTION_FIELD = "__$mobxMapAction__"

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
export function normalizeMap(map) {
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
export const get = (obj, key, def, p) => {
  if (typeof key === 'undefined') return def
  p = 0;
  key = key.split ? key.split('.') : key;
  while (obj && p < key.length) obj = obj[key[p++]];
  return (obj === undefined || p < key.length) ? def : obj;
}

export const getParent = (store, field) => {
  let caller = store
  switch (field.split('.').length) {
    case 0:
    case 1:
      caller = store
      break;
    default:
      const parentField = field.substr(0, field.lastIndexOf('.'))
      const parent = get(store, parentField)
      caller = parent
      break;
  }
  return caller
}

export const getComputedEntries = vm => {
  if (!vm.$options.computed || typeof vm.$options.computed !== 'object') {
    return []
  }
  return Object.keys(vm.$options.computed).reduce((m, key) => {
    let getter = vm.$options.computed[key]

    let setter = null
    if (typeof getter === 'object' && typeof getter.set === 'function') {
      setter = getter.set
    }

    if (typeof getter === 'object' && typeof getter.get === 'function') {
      getter = getter.get
    }
    m.push({
      key,
      get: getter && getter.bind(vm),
      set: setter && setter.bind(vm),
    })
    return m
  }, [])
}

export const createComputedProp = (changeDetector, store, vm, key, setter, originGetter) => {
  const getter = () => changeDetector.getReactiveProperty(vm, key)

  if (typeof setter === 'function') {
    return {
      get: getter,
      set: (value) => setter.call(vm, value, store)
    }
  }

  return getter
}

const cacheComputed = {}
export const getMapComputed = (vm) => {
  let cacheKey = vm._uid
  const cacheVal = cacheComputed[cacheKey]
  if (cacheVal) {
    return cacheVal
  }

  let opt = []

  if (Array.isArray(vm.$options.mixins)) {
    vm.$options.mixins.forEach(mixin => {
      if (mixin.$mapState) {
        opt = opt.concat(normalizeMap(mixin.$mapState))
      }
    })
  }

  opt = opt
    .concat(normalizeMap(vm.$options.$mapState))
    .concat(normalizeMap(vm.$options.$computed))
    .concat(normalizeMap(vm.$options[MAP_STATE_FIELD]))
    // .concat(normalizeMap(vm.$options.computed))

  const store = vm.$store

  // computed
  let computedList = normalizeMap(vm.$options.computed).map(({ key, val }) => {
    let fieldKey = key
    let getter = val
    let setter = null
    if (typeof val === 'object' && typeof val.get === 'function') {
      getter = val.get
    }
    if (typeof val === 'object' && typeof val.set === 'function') {
      setter = val.set
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
  }).filter(i => i)

  const stateList = opt.map(({ key, val }) => {
    let fieldKey = key.replace(/\//g, '.').split('.').pop()
    let getter = val
    let setter = null

    if (typeof val === 'string') {
      // {field: 'name.x.y'}
      val = val.replace(/\//g, '.')
      getter = () => get(store, val)
    } else if (typeof val === 'function') {
      // {field: store => store.name}
      getter = () => val.call(vm, store)
    } else if (typeof val === 'object') {
      // {field: {get: store => store.name, set: (value, store) => store.setName(val)}}
      if (typeof val.get === 'string') {
        val.get = val.get.replace(/\//g, '.')
        getter = () => get(store, val.get)
      } else if (typeof val.get === 'function') {
        getter = () => val.get.call(vm, store)
      }

      if (typeof val.set === 'string') {
        val.set = val.set.replace(/\//g, '.')
        setter = (v) => get(store, val.set).call(getParent(store, val.set), v, store)
      } else if (typeof val.set === 'function') {
        setter = (v) => val.set.call(vm, v, store)
      }
    }
    return {
      key: fieldKey,
      get: getter,
      set: setter,
    }
  })
  
  const list = [
    ...computedList,
    ...stateList,
  ]

  cacheComputed[cacheKey] = list

  return list

}
export const getMapMethod = vm => {
  let opt = []

  if (Array.isArray(vm.$options.mixins)) {
    vm.$options.mixins.forEach(mixin => {
      if (mixin.$mapAction) {
        opt = opt.concat(normalizeMap(mixin.$mapAction))
      }
    })
  }

  opt = opt
    .concat(normalizeMap(vm.$options.$mapAction))
    .concat(normalizeMap(vm.$options.$methods))
    .concat(normalizeMap(vm.$options[MAP_ACTION_FIELD]))

  if (!opt.length) {
    return []
  }

  const store = vm.$store
  return opt.map(({ key, val }) => {
    let fieldKey = key.replace(/\//g, '.').split('.').pop()
    let method = val
    if (typeof method === 'string') {
      // {field: 'name'}
      val = val.replace(/\//g, '.')
      method = get(store, val).bind(getParent(store, val))
    } else if (typeof method === 'function') {
      // {field: store => store.name}
      method = val.call(vm, store)
    }

    return {
      key: fieldKey,
      method,
    }
  })
}
