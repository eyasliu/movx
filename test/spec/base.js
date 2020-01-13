import Vue from 'vue'
import { observable, runInAction } from 'mobx'
import Movx from '../../src'
import { Counter, data } from '../util/helper'

const nextTick = Vue.nextTick

// Vue.use(Movx)

// this spec is passed, but effect other test spec
test('install well with store', () => {
  const Vue = require('vue')
  const store = new Counter()
  Vue.use(Movx, store)
  const vm = new Vue({
    render: h => h('div')
  }).$mount()
  expect(vm.$store).toBe(store)
})

test('bind mobx store to render', done => {
  const data = observable({
    foo: 1,
    bar: 2,
    get foobar() {
      return this.foo + this.bar
    }
  })


  const vm = new Vue({
    store: data,
    $mapState: {
      getterFoo: {
        get() {
          return data.foo
        }
      },
      foo() {
        return data.foo
      },
      foobarPlus() {
        return data.foobar + 1
      }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.getterFoo}|${vm.foo}|${vm.foobarPlus}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('1|1|4')

  runInAction(() => {
    data.foo++
  })

  nextTick(() => {
    expect(vm.$el.textContent).toBe('2|2|5')
    done()
  })
})

test(`can use this.data in fromMobx`, done => {
  const data = observable({
    foo: 1,
    get fooPlus() {
      return this.foo + 1
    }
  })


  const vm = new Vue({
    data() {
      return {
        bar: 2
      }
    },
    computed: {
      barPlus() {
        return this.bar + 1
      }
    },
    $mapState: {
      foobar() {
        return data.foo + this.bar
      },
      foobarPlus() {
        return data.fooPlus + this.barPlus
      }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.foobar}|${vm.foobarPlus}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('3|5')

  vm.bar++
  runInAction(() => {
    data.foo++
  })

  nextTick(() => {
    expect(vm.$el.textContent).toBe('5|7')
    done()
  })
})

test(`can set field to store`, done => {
  const data = observable({
    foo: 1,
    get fooPlus() {
      return this.foo + 1
    },
    setFoo(value) {
      this.foo = value
    }
  })


  const vm = new Vue({
    data() {
      return {
        bar: 2
      }
    },
    computed: {
      barPlus() {
        return this.bar + 1
      }
    },
    $mapState: {
      foobar: {
        get() {
          return data.foo + this.bar
        },
        set(value) {
          data.setFoo(value - this.bar)
        }
      },
      foobarPlus() {
        return data.fooPlus + this.barPlus
      }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.foobar}|${vm.foobarPlus}`)
    }
  }).$mount()

  vm.foobar++

  nextTick(() => {
    expect(vm.$el.textContent).toBe('4|6')
    expect(data.foo).toBe(2)
    done()
  })
})


test(`fields in $mapState can be used in watch & computed`, done => {

  const data = observable({
    foo: 1
  })


  const onFooChange = jest.fn()
  const onFoobarChange = jest.fn()

  const vm = new Vue({
    data() {
      return {
        bar: 2
      }
    },
    computed: {
      foobar() {
        return this.foo + this.bar
      }
    },
    $mapState: {
      foo() {
        return data.foo
      }
    },
    watch: {
      foo(value) {
        onFooChange(value)
      },
      foobar(value) {
        onFoobarChange(value)
      }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.foobar}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('3')

  vm.bar++
  runInAction(() => {
    data.foo++
  })

  nextTick(() => {
    expect(vm.$el.textContent).toBe('5')
    expect(onFooChange.mock.calls).toHaveLength(1)
    expect(onFooChange.mock.calls[0][0]).toBe(2)
    expect(onFoobarChange.mock.calls).toHaveLength(1)
    expect(onFoobarChange.mock.calls[0][0]).toBe(5)
    done()
  })
})

test('$mapState with alias', () => {
  const store = new Counter()


  const vm = new Vue({
    store,
    $mapState: {
      myNum: 'num',
      myNumPlustOne: 'numPlus'
    },
    render(h) {
      const vm = this
      return h('div', `${vm.myNum}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')
})

test('helper $mapState can work object notation', () => {
  const store = new Counter()

  const vm = new Vue({
    store,
    $mapState: {
      myNum: { get: 'num', set: 'setNum' },
      myNumPlustOne: { get: 'numPlus' }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.myNum}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')
})

test('helper $mapState can work with setter', done => {
  const store = new Counter()


  const vm = new Vue({
    store,
    $mapState: {
      myNum: { get: 'num', set: 'setNum' },
      myNumPlustOne: { get: 'numPlus', set(value, store) { store.setNum(value - 1) } }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.myNum}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')

  vm.myNum++
  nextTick(() => {
    expect(vm.$el.textContent).toBe('1|2')
    vm.myNumPlustOne = 10
    nextTick(() => {
      expect(vm.$el.textContent).toBe('9|10')
      done()
    })
  })
})

test('helper $mapState can work with this.data in complex getter and setter', done => {
  const store = new Counter()


  const vm = new Vue({
    store,
    data() {
      return {
        a: 2
      }
    },
    $mapState: {
      myNum: { get: 'num' },
      myNumPlusA: {
        get(store) { return store.num + this.a; },
        set(value, store) { store.setNum(value - this.a) }
      },
      myNumPlustOne: {
        get: 'numPlus',
        set(value, store) { store.setNum(value - 1) }
      }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.myNum}|${vm.myNumPlusA}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|2|1')

  vm.myNumPlusA++
  nextTick(() => {
    expect(vm.$el.textContent).toBe('1|3|2')

    vm.myNumPlusA = 10
    nextTick(() => {
      expect(vm.$el.textContent).toBe('8|10|9')
      done()
    })
  })
})

test('helper $mapAction', () => {
  const store = new Counter()

  const vm = new Vue({
    store,
    $mapAction: ['plus', 'reset'],
    render(h) {
      return h('div')
    }
  }).$mount()

  expect(store.num).toBe(0)

  vm.plus()
  expect(store.num).toBe(1)

  vm.plus()
  expect(store.num).toBe(2)

  vm.reset()
  expect(store.num).toBe(0)
})

test('helper $mapAction with alias', () => {
  const store = new Counter()

  const vm = new Vue({
    store,
    $mapAction: {
      myPlus: 'plus',
      myReset: 'reset'
    },
    render(h) {
      return h('div')
    }
  }).$mount()

  expect(store.num).toBe(0)

  vm.myPlus()
  expect(store.num).toBe(1)

  vm.myPlus()
  expect(store.num).toBe(2)

  vm.myReset()
  expect(store.num).toBe(0)
})

test('clean watchers before destroy', () => {
  const data = observable({
    foo: 1
  })


  const vm = new Vue({
    $mapState: {
      foo() {
        return data.foo
      }
    },
    render(h) {
      const vm = this
      return h('div', vm.foo + '')
    }
  }).$mount()

  vm.$destroy()
})

test('normal components destroy well', () => {
  const vm = new Vue({
    data() {
      return { foo: 1 }
    },
    render(h) {
      const vm = this
      return h('div', vm.foo + '')
    }
  }).$mount()

  vm.$destroy()
})

test('$mapState attributes pulled from mixin', done => {
  const store = new Counter()


  const mixin = {
    $mapState: ['num'],
    $mapAction: ['setNum']
  }

  const vm = new Vue({
    store,
    mixins: [mixin],
    $mapState: ['numPlus'],
    $mapAction: ['plus', 'reset'],
    computed: {
      value() {
        return this.num
      }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.num}|${vm.numPlus}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')

  vm.setNum(2)
  nextTick(() => {
    expect(vm.$el.textContent).toBe('2|3')
    vm.plus()
    nextTick(() => {
      expect(vm.$el.textContent).toBe('3|4')
      vm.reset()
      nextTick(() => {
        expect(vm.$el.textContent).toBe('0|1')
        vm.$destroy()
        done()
      })
    })
  })

})

test('$mapState attributes pulled from mixins', done => {

  const store = new Counter()


  const mixin1 = {
    $mapState: ['num'],
    $mapAction: ['setNum']
  }

  const mixin2 = {
    $mapState: ['numPlus'],
    $mapAction: ['plus'],
  }

  const vm = new Vue({
    store,
    mixins: [mixin1, mixin2],
    $mapAction: ['reset'],
    computed: {
      value() {
        return this.foo
      }
    },
    render(h) {
      const vm = this
      return h('div', `${vm.num}|${vm.numPlus}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')

  vm.setNum(2)
  nextTick(() => {
    expect(vm.$el.textContent).toBe('2|3')
    vm.plus()
    nextTick(() => {
      expect(vm.$el.textContent).toBe('3|4')
      vm.reset()
      nextTick(() => {
        expect(vm.$el.textContent).toBe('0|1')
        vm.$destroy()
        done()
      })
    })
  })
})