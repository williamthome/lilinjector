/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { BindConfig } from '../configs'
import { Injectable, Inject, InjectableArray } from '../decorators'
import { Factory, Identifier, Newable, Payload, PayloadReturnType, RegistryMap } from '../protocols'

export class Container {
  private _registry: RegistryMap = new Map()
  private _snapshots: RegistryMap[] = []

  bind = <I, P = I> (identifier: Identifier<I>): BindConfig<I, P> => {
    if (this._registry.has(identifier))
      throw new Error(`[LiliNjector] Identifier ${identifier.toString()} already registered`)

    const payload: Payload<P> = { noCache: false, singleton: true }
    this._registry.set(identifier, payload)

    return this._makeBindConfig<I, P>(identifier, payload)
  }

  unbind = <I, P = I> (identifier: Identifier<I>): Container => {
    this._getPayloadOrThrow<I, P>(identifier)
    this._registry.delete(identifier)
    return this
  }

  rebind = <I, P = I> (identifier: Identifier<I>): BindConfig<I, P> => {
    return this.unbind<I, P>(identifier).bind<I, P>(identifier)
  }

  has = <I> (identifier: Identifier<I>): boolean =>
    this._registry.has(identifier)

  get = <I, P = I> (identifier: Identifier<I>): Payload<P> | undefined =>
    this._registry.get(identifier)

  define = <I, P = I> (identifier: Identifier<I>): BindConfig<I, P> => {
    const payload = this._getPayloadOrThrow<I, P>(identifier)
    return this._makeBindConfig<I, P>(identifier, payload)
  }

  override = <I, P = I> (identifier: Identifier<I>, payload: Payload<P>): Container => {
    this._getPayloadOrThrow<I, P>(identifier)
    this._registry.set(identifier, payload)
    return this
  }

  snapshot (): Container {
    this._snapshots.push(new Map(this._registry))
    return this
  }

  restore (): Container {
    this._registry = this._snapshots.pop() || this._registry
    return this
  }

  clear = (): Container => {
    this._registry.clear()
    return this
  }

  resolve = <I, P = I> (identifier: Identifier<I>, payloadReturnType?: PayloadReturnType): P => {
    const resolved = this.resolveAny<I, P>(identifier, payloadReturnType)
    if (Array.isArray(resolved))
      throw new Error(`[LiliNjector] Payload for idenifier ${identifier.toString()} is instance of array`)
    return resolved
  }

  resolveArray = <I, P = I> (identifier: Identifier<I>, payloadReturnType?: PayloadReturnType): P[] => {
    const resolved = this.resolveAny<I, P>(identifier, payloadReturnType)
    if (!Array.isArray(resolved))
      throw new Error(`[LiliNjector] Payload for idenifier ${identifier.toString()} isn't instance of array`)
    return resolved
  }

  resolveAny = <I, P = I> (identifier: Identifier<I>, payloadReturnType?: PayloadReturnType): P | P[] => {
    const registered = this._getPayloadOrThrow<I, P>(identifier)

    const { value, array, newable, newableArray, factory, factoryArray, cache, noCache, singleton } = registered

    const cacheOrCreate = (creator: Factory<P>): P => {
      if (!singleton) return creator()

      const cache = creator()
      if (!noCache) registered.cache = cache
      return cache
    }

    const makeNewableArray = (array: Newable<P>[]): P[] => {
      const nArray: P[] = []
      for (const n of array) {
        nArray.push(cacheOrCreate(() => new n()))
      }
      return nArray
    }

    const makeFactoryArray = (array: Factory<P>[]): P[] => {
      const fArray: P[] = []
      for (const f of array) {
        fArray.push(cacheOrCreate(() => f()))
      }
      return fArray
    }

    switch (payloadReturnType) {
      case 'value':
        if (value !== undefined) return value
        break
      case 'array':
        if (array !== undefined) return array
        break
      case 'newable':
        if (newable !== undefined) return cacheOrCreate(() => new newable())
        break
      case 'newableArray':
        if (newableArray !== undefined) return makeNewableArray(newableArray)
        break
      case 'factory':
        if (factory !== undefined) return cacheOrCreate(() => factory())
        break
      case 'factoryArray':
        if (factoryArray !== undefined) return makeFactoryArray(factoryArray)
        break
      case 'cache':
        if (cache !== undefined) return cache
        break
      default:
        if (singleton && cache !== undefined) return cache
        if (value !== undefined) return value
        if (array !== undefined) return array
        if (newable !== undefined) return cacheOrCreate(() => new newable())
        if (newableArray !== undefined) return makeNewableArray(newableArray)
        if (factory !== undefined) return cacheOrCreate(() => factory())
        if (factoryArray !== undefined) return makeFactoryArray(factoryArray)
    }

    throw new Error(`[LiliNjector] Payload for identifier ${identifier.toString()} is null`)
  }

  createInjectDecorator = <T> (identifier?: Identifier<T>) => Inject<T>(this, identifier)

  createInjectableDecorator = <T> (identifier?: Identifier<T>) => Injectable<T>(this, identifier)

  createInjectableArrayDecorator = <T> (identifier?: Identifier<T>) => InjectableArray<T>(this, identifier)

  private _getPayloadOrThrow = <I, P = I> (identifier: Identifier<I>): Payload<P> => {
    const registered = this._registry.get(identifier)
    if (!registered) throw new Error(`[LiliNjector] Identifier ${identifier.toString()} not in registry`)
    return registered
  }

  private _makeBindConfig = <I, P = I> (identifier: Identifier<I>, payload: Payload<P>): BindConfig<I, P> =>
    new BindConfig<I, P>({
      container: this,
      identifier,
      payload
    })
}