import { reaction, observable, runInAction, action, computed } from 'mobx'

export class Counter {
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

export const data = {
  foo: 1,
  bar: 2,
  get foobar() {
    return this.foo + this.bar
  }
}