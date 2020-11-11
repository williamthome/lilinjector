type Any = Record<PropertyKey, any>
type Factory<T> = () => T
type Newable<T> = new (...args: any[]) => T
type Identifier<T> = PropertyKey | Newable<T>
type Value<T> = T | T[] | undefined

interface Property<T> {
  name: PropertyKey
  value: Value<T>
}

interface Payload<T> {
  newable?: Newable<T>
  factory?: Factory<T>
  value?: T
  array?: T[]
  cache?: T | T[]
  singleton: boolean
}

type PayloadReturnType = 'newable' | 'factory' | 'value' | 'array'

class SingletonConfig<T> {
  constructor (
    private readonly payload: Payload<T>
  ) { }

  notInSingletonScope = (): void => {
    this.payload.singleton = false
  }
}

class ArrayConfig<T> {
  constructor (
    private readonly payload: Payload<T>,
    private readonly newValues: T[]
  ) { }

  override = (): void => {
    this.payload.array = this.newValues
  }
}

class Bind<T> {
  constructor (private payload: Payload<T>) { }

  asNewable = (newable: Newable<T>): SingletonConfig<T> => {
    this.payload.newable = newable
    return new SingletonConfig<T>(this.payload)
  }

  asFactory = (factory: Factory<T>): SingletonConfig<T> => {
    this.payload.factory = factory
    return new SingletonConfig<T>(this.payload)
  }

  as = (value: T): void => {
    this.payload.value = value
  }

  asArray = (...array: T[]): ArrayConfig<T> => {
    this.payload.array = [...array, ...this.payload.array || []]
    return new ArrayConfig<T>(this.payload, array)
  }
}

type Registry<I, P> = Map<Identifier<I>, Payload<P>>

class Container {
  private readonly _registry: Registry<any, any> = new Map()

  bind = <I, P> (identifier: Identifier<I>): Bind<P> => {
    return new Bind(this._add<I, P>(identifier))
  }

  unbind = <I> (identifier: Identifier<I>): Container => {
    if (!this._registry.has(identifier))
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    this._registry.delete(identifier)

    return this
  }

  rebind = <I, P> (identifier: Identifier<I>): Bind<P> => {
    return this.unbind<I>(identifier).bind<I, P>(identifier)
  }

  get = <T> (identifier: Identifier<T>, payloadReturnType?: PayloadReturnType): T | T[] => {
    const registered = this._registry.get(identifier)

    if (!registered)
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    const { newable, factory, value, array, cache, singleton } = registered

    const cacheItem = (creator: Factory<T>): T => {
      if (singleton && cache) return cache
      if (!singleton) return creator()
      registered.cache = creator()
      return registered.cache
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
        if (factory !== undefined) cacheItem(() => factory())
        break
      default:
        if (value !== undefined) return value
        if (array !== undefined) return array
        if (newable !== undefined) return cacheItem(() => new newable())
        if (factory !== undefined) cacheItem(() => factory())
    }

    throw new Error(`Payload for ${identifier.toString()} is null`)
  }

  private _add = <I, P> (identifier: Identifier<I>): Payload<P> => {
    if (this._registry.has(identifier)) {
      throw new Error(`Identifier ${identifier.toString()} already registered`)
    }

    const payload: Payload<P> = { singleton: true }
    this._registry.set(identifier, payload)

    return payload
  }
}

describe('Heinjector', () => {
  describe('bind()', () => {
    it('should bind identifiers', () => {
      const container = new Container()

      container.bind(0).as(0)
      const zero = container.get(0)
      expect(zero).toBe(0)

      container.bind('array').asArray(0, 1, 2)
      const array = container.get('array')
      expect(array).toEqual([0, 1, 2])
    })

    it('should rebind identifier', () => {
      const container = new Container()

      container.bind(0).as(0)
      let zero = container.get(0)
      expect(zero).toBe(0)

      container.rebind(0).asArray(0, 0, 0)
      zero = container.get(0)
      expect(zero).toEqual([0, 0, 0])
    })
  })
})