type Any = Record<PropertyKey, any>
type Factory<P> = () => P
type Newable<P> = new (...args: any[]) => P
type Identifier<I> = PropertyKey | Newable<I>
type Value<P> = P | P[] | undefined

interface Property<P> {
  name: PropertyKey
  value: Value<P>
}

interface Payload<P> {
  newable?: Newable<P>
  factory?: Factory<P>
  value?: P
  array?: P[]
  cache?: P | P[]
  singleton: boolean
}

type PayloadReturnType = 'newable' | 'factory' | 'value' | 'array'

class SingletonConfig<P> {
  constructor (
    private readonly payload: Payload<P>
  ) { }

  notInSingletonScope = (): void => {
    this.payload.singleton = false
  }
}

class ArrayConfig<P> {
  constructor (
    private readonly payload: Payload<P>,
    private readonly newValues: P[]
  ) { }

  override = (): void => {
    this.payload.array = this.newValues
  }
}

class Bind<P> {
  constructor (private payload: Payload<P>) { }

  asNewable = (newable: Newable<P>): SingletonConfig<P> => {
    this.payload.newable = newable
    return new SingletonConfig<P>(this.payload)
  }

  asFactory = (factory: Factory<P>): SingletonConfig<P> => {
    this.payload.factory = factory
    return new SingletonConfig<P>(this.payload)
  }

  as = (value: P): void => {
    this.payload.value = value
  }

  asArray = (...array: P[]): ArrayConfig<P> => {
    this.payload.array = [...array, ...this.payload.array || []]
    return new ArrayConfig<P>(this.payload, array)
  }
}

type Registry<I, P> = Map<Identifier<I>, Payload<P>>

class Container {
  private readonly _registry: Registry<any, any> = new Map()

  bind = <I, P> (identifier: Identifier<I>): Bind<P> => {
    return new Bind(this._add<I, P>(identifier))
  }

  unbind = <P> (identifier: Identifier<P>): Container => {
    if (!this._registry.has(identifier))
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    this._registry.delete(identifier)

    return this
  }

  rebind = <I, P> (identifier: Identifier<I>): Bind<P> => {
    return this.unbind<I>(identifier).bind<I, P>(identifier)
  }

  define = <I, P> (identifier: Identifier<I>): Bind<P> => {
    const registered = this._registry.get(identifier)

    if (!registered)
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    return new Bind(registered)
  }

  get = <P> (identifier: Identifier<P>, payloadReturnType?: PayloadReturnType): P | P[] => {
    const registered = this._registry.get(identifier)

    if (!registered)
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    const { newable, factory, value, array, cache, singleton } = registered

    const cacheItem = (creator: Factory<P>): P => {
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
  })

  describe('unbind()', () => {
    it('should unbind identifier', () => {
      const container = new Container()

      container.bind(0).as(0)
      container.unbind(0)

      expect(() => container.get(0)).toThrow()
    })
  })

  describe('rebind()', () => {
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

  describe('define()', () => {
    it('should define values', () => {
      const container = new Container()

      container.bind('foo').as('foo')
      let foo = container.get('foo')
      expect(foo).toBe('foo')

      container.define('foo').as('bar')
      foo = container.get('foo')
      expect(foo).toBe('bar')
    })
  })
})