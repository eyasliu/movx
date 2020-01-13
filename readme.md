# movx

Vue 的 mobx 绑定库

# Installation

```sh
npm i -S movx
```

or

```sh
yarn add movx
```

# Requirement

 * Vue >= 2.0.0
 * MobX >= 4.0.0, 兼容 MobX 5!

## Why movx

[issue #1](https://github.com/eyasliu/movx/issues/1)


# Usage

使用方法

### 初始化插件

```js
import Vue from 'vue'
import Movx from 'movx'
import store from './store'

// 方式一，通过 Vue 根实例的 store 属性传 store 对象
Vue.use(Movx)

new Vue({
  store
  /* 根实例开始就可以使用 this.$store 访问store对象 */
})

// 方式二，通过插件初始化定义全局 store 状态
Vue.use(Mobx, store)

new Vue({
  /* 根实例开始就可以使用 this.$store 访问store对象 */
})

// 方式三：多 store, 在子组件指定store 属性，使该子组件的后代组件都有单独的store
Vue.use(Movx)
new Vue({
  components: {
    {
      store: storeX
    },
    {
      store: storeY
    },
  }
})

```

### 状态绑定

状态绑定围绕 `$mapState` 和 `$mapAction` 展开

假设有这么一个 store 
```js
// store.js
import { observable, computed, action } from 'mobx
class Counter {
  @observable num = 0
  @computed get numPlus() {
    return this.num + 1
  }
  @action setNum(value) {
    this.num = value
  }
  @action plus() {
    this.setNum(this.num + 1)
  }
  @action reset() {
    this.setNum(0)
  }
}

export default new Counter()
```

#### $mapState

`$mapState` 的api含义和 vuex 的 mapState 大致相同，底层最终会把参数解析好放到 vue 组件的 `computed` 中


使用字符串数组，元素是 store 中变量的路径，路径使用点`.` 或者斜线`/` 分隔，也可以混合，最终的绑定的变量名称是路径的最后部分，这是最方便的一种

```js
export default {
  store: { // 注意有多层嵌套
    a: {
      b: {
        c: store
      }
    }
  },
  $mapState: [
    'a.b.c.num',
    'a/b.c/numPlus',
  ],
  template: `<p>{{num}}|{{numPlus}}</p>`
}
```

使用对象形式更灵活

```js
export default {
  store: store, // 注意这里没有嵌套深层
  data() {
    return { foo: 10 }
  }
  $mapState: {
    num: 'num', // 路径字符串
    anum: 'num', // 相当于起别名, 
    bnum: store => store.num, // 使用 函数，store 参数就是 this.$store 对象
    cnum: {
      get: 'num',
      set: (val, store) => store.setNum(val) // 第一个参数是更改的值，第二个参数是 store
    },
    dnum: {
      get: store => store.num,
      set: 'setNum'
    },
    enum: {
      get: 'num',
      set: 'setNum'
    },
    fnum: {
      get: store => store.num,
      set: (val, store) => store.setNum(val)
    },
    gnum(store) {
      return this.foo + store.num 
    },
    hnum: {
      // 这里get 和 set 的 this 是组件实例
      get(store) {
        return this.foo + store.num
      },
      set(val, store) {
        return store.setNum(val + this.foo)
      }
    }
  },
  mounted() {
    console.log(
      this.num,
      this.anum,
      this.bnum,
      this.cnum,
      this.enum,
      this.fnum,
      this.gnum,
      this.hnum,
    )

    this.cnum = 5
    this.dnum = 6
    this.enum = 7
    this.fnum = 8
    this.gnum = 9
    this.hnum = 10
  }
}
```

#### $mapAction

`$mapAction` 的 api 函数和 vuex 的 `mapAction` 类似，底层最终会把参数解析好，并且把函数的上下文放到vue组件的 `methods` 中

使用字符串数组，元素是 store 中变量的路径，路径使用点. 或者斜线/ 分隔，也可以混合使用，最终的绑定的变量名称是路径的最后部分，并且智能的给函数绑定好了指定层级的 store 对象的上下文

```js
export default {
  store: { // 有深层嵌套
    a: {
      b: {
        c: store,
      }
    }
  },
  $mapState: ['num']
  $mapAction: ['a/b.c.setNum'],
  mounted() {
    this.setNum(5) // 这里的 setNum 函数执行的 this 指向的是 store 中的 counter 对象
  }
}
```

也可以使用对象更灵活的配置

```js
export default {
  store: store,
  $mapAction: {
    setNum: 'setNum',
    xsetNum: 'setNum',
    ysetNum: store => store.setNum,
    zsetNum(store) {
      return store.setNum.bind(this) // 也可以手动绑定this
    }

  },
}
```

### 兼容 vuex 的 mapState 和 mapAction

为了减少学习成本，mapState 和 mapAction 都可以兼容 vuex 的用法

```js
import { mapState, mapAction } from 'movx'

export default {
  store: store,
  computed: {
    ...mapState(['num', 'numPlus']),
    ...mapState({
      xnum: 'num',
      ynum(store) {
        return store.num
      }
    })
  },
  methods: {
    ...mapAction(['setNum']),
    ...mapAction({
      plus: 'plus',
      reset: store => store.reset
    })
  }
}
```

 * mapState 的参数和 $mapState 完全一样
 * mapAction 的参数和 $mapAction 完全一样

因为他们的参数解析都是同一个方法

### Mixin 

支持 mixin，虽然用的人不多，但是也兼容了，mixin 中重复字段不会覆盖，而是会叠加

```js
const mixin1 = {
  $mapState: ['num']
}
const mixin2 = {
  $mapState: ['numPlus']
}

export default {
  mixins: [mixin1, mixin2],
  $mapState: {
    xnum(store) {
      return this.num + this.numPlus
    }
  },
  mounted() {
    console.log(this.num, this.numPlus, this.xnum)
  }
}

```

## 一些例子

#### v-model 配合

```vue
<template>
  <input v-model="num" />
</template>
<script>
export default {
  $mapState: {
    num: {
      get: 'num',
      set: 'setNum'
    }
  }
}
</script>

```


## TODO

 * [] namespace 减少路径重复
 * [] inject 方法支持state 和 action 写到一起，类似 `mobx-react` 的 inject