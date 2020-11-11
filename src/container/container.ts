/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { BindConfig } from '../configs'
import { Injectable, Inject } from '../decorators'
import { Factory, Identifier, Payload, PayloadReturnType, RegistryMap } from '../protocols'

export class Container {
  private _registry: RegistryMap = new Map()
  private _snapshots: RegistryMap[] = []

  bind = <I, P> (identifier: Identifier<I>): BindConfig<I, P> => {
    if (this._registry.has(identifier))
      throw new Error(`[HeinJector] Identifier ${identifier.toString()} already registered`)

    const payload: Payload<P> = { noCache: false, singleton: true }
    this._registry.set(identifier, payload)

    return this._makeBindConfig<I, P>(identifier, payload)
  }

  unbind = <I, P> (identifier: Identifier<I>): Container => {
    this._getPayloadOrThrow<I, P>(identifier)
    this._registry.delete(identifier)
    return this
  }

  rebind = <I, P> (identifier: Identifier<I>): BindConfig<I, P> => {
    return this.unbind<I, P>(identifier).bind<I, P>(identifier)
  }

  define = <I, P> (identifier: Identifier<I>): BindConfig<I, P> => {
    const payload = this._getPayloadOrThrow<I, P>(identifier)
    return this._makeBindConfig<I, P>(identifier, payload)
  }

  override = <I, P> (identifier: Identifier<I>, payload: Payload<P>): Container => {
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

  resolve = <I, P> (identifier: Identifier<I>, payloadReturnType?: PayloadReturnType): P | P[] => {
    const registered = this._getPayloadOrThrow<I, P>(identifier)

    const { value, array, newable, factory, cache, noCache, singleton } = registered

    const cacheItem = (creator: Factory<P>): P => {
      if (!singleton) return creator()

      const cache = creator()
      if (!noCache) registered.cache = cache
      return cache
    }

    switch (payloadReturnType) {
      case 'value':
        if (value !== undefined) return value
        break
      case 'array':
        if (array !== undefined) return array
        break
      case 'newable':
        if (newable !== undefined) return cacheItem(() => new newable())
        break
      case 'factory':
        if (factory !== undefined) return cacheItem(() => factory())
        break
      case 'cache':
        if (cache !== undefined) return cache
        break
      default:
        if (singleton && cache !== undefined) return cache
        if (value !== undefined) return value
        if (array !== undefined) return array
        if (newable !== undefined) return cacheItem(() => new newable())
        if (factory !== undefined) return cacheItem(() => factory())
    }

    throw new Error(`Payload for identifier ${identifier.toString()} is null`)
  }

  createInjectDecorator = <T> (identifier?: Identifier<T>) => Inject<T>(this, identifier)

  createInjectableDecorator = <T> (identifier?: Identifier<T>) => Injectable<T>(this, identifier)

  private _getPayloadOrThrow = <I, P> (identifier: Identifier<I>): Payload<P> => {
    const registered = this._registry.get(identifier)
    if (!registered) throw new Error(`[HeinJector] Identifier ${identifier.toString()} not in registry`)
    return registered
  }

  private _makeBindConfig = <I, P> (identifier: Identifier<I>, payload: Payload<P>): BindConfig<I, P> =>
    new BindConfig<I, P>({
      container: this,
      identifier,
      payload
    })
}