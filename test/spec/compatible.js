import Vue from 'vue'
import Movx, { mapState, mapAction } from '../../src'
import { Counter } from '../util/helper'

const nextTick = Vue.nextTick

Vue.use(Movx)

describe("compatible vuex api", () => {
  test("compatible vuex mapState & mapAction api", done => {
    const store = new Counter()
    const vm = new Vue({
      store,
      computed: {
        ...mapState(['num', 'numPlus']),
      },
      methods: {
        ...mapAction(['setNum', 'plus', 'reset'])
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
          done()
        })
      })
    })
  })
})
