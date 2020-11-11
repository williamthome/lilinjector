import { Factory, Newable } from '../protocols'
import { ArrayConfig } from './array.config'
import { BaseConfig } from './base.config'
import { ObjectConfig } from './object.config'

export class BindConfig<I, P> extends BaseConfig<I, P> {
  as = (value: P): ObjectConfig<I, P> => {
    this.config.oldValue = this.config.payload.value
    this.config.payload.value = value
    this.config.newValue = value
    return new ObjectConfig<I, P>(this.config)
  }

  asArray = (...array: P[]): ArrayConfig<I, P> => {
    this.config.oldValue = this.config.payload.value
    const newArray = [...this.config.payload.array || [], ...array]
    this.config.payload.array = newArray
    this.config.newValue = newArray
    this.config.args = array
    return new ArrayConfig<I, P>(this.config)
  }

  asNewable = (newable: Newable<P>): ObjectConfig<I, P> => {
    this.config.oldValue = this.config.payload.value
    this.config.payload.newable = newable
    this.config.newValue = null
    return new ObjectConfig<I, P>(this.config)
  }

  asFactory = (factory: Factory<P>): ObjectConfig<I, P> => {
    this.config.oldValue = this.config.payload.value
    this.config.payload.factory = factory
    this.config.newValue = null
    return new ObjectConfig<I, P>(this.config)
  }
}