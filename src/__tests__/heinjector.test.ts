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

type PayloadReturnType = 'newable' | 'factory' | 'value' | 'array' | 'cache'

class SaveConfig<I, P> {
  constructor (
    private readonly container: Container,
    private readonly identifier: Identifier<I>,
    private readonly payload: Payload<P>,
    private readonly overrideRegistry: boolean,
    private readonly newCache?: P | P[]
  ) { }

  save = (): void => {
    if (this.overrideRegistry) {
      if (this.newCache) this.payload.cache = this.newCache
      this.container.override(this.identifier, this.payload)
    }
  }
}

class SingletonConfig<I, P> {
  constructor (
    private readonly container: Container,
    private readonly identifier: Identifier<I>,
    private readonly payload: Payload<P>,
    private readonly overrideRegistry: boolean
  ) { }

  notInSingletonScope = (): void => {
    this.payload.singleton = false
    new SaveConfig(this.container, this.identifier, this.payload, this.overrideRegistry).save()
  }
}

class ArrayConfig<I, P> {
  constructor (
    private readonly container: Container,
    private readonly identifier: Identifier<I>,
    private readonly payload: Payload<P>,
    private readonly newValues: P[],
    private readonly overrideRegistry: boolean
  ) { }

  override = (): void => {
    this.payload.array = this.newValues
    new SaveConfig(this.container, this.identifier, this.payload, this.overrideRegistry, this.newValues).save()
  }
}

class Bind<I, P> {
  constructor (
    private readonly container: Container,
    private readonly identifier: Identifier<I>,
    private payload: Payload<P>,
    private readonly overrideRegistry = false
  ) { }

  asNewable = (newable: Newable<P>): SingletonConfig<I, P> => {
    this.payload.newable = newable
    this.save()
    return new SingletonConfig<I, P>(this.container, this.identifier, this.payload, this.overrideRegistry)
  }

  asFactory = (factory: Factory<P>): SingletonConfig<I, P> => {
    this.payload.factory = factory
    this.save()
    return new SingletonConfig<I, P>(this.container, this.identifier, this.payload, this.overrideRegistry)
  }

  as = (value: P): void => {
    this.payload.value = value
    this.save(value)
  }

  asArray = (...array: P[]): ArrayConfig<I, P> => {
    const newArray = [...this.payload.array || [], ...array]
    this.payload.array = [...this.payload.array || [], ...array]
    this.save(newArray)
    return new ArrayConfig<I, P>(this.container, this.identifier, this.payload, array, this.overrideRegistry)
  }

  private save = (newCache?: P | P[]): void => {
    new SaveConfig(this.container, this.identifier, this.payload, this.overrideRegistry, newCache).save()
  }
}

type Registry<I, P> = Map<Identifier<I>, Payload<P>>

class Container {
  private readonly _registry: Registry<any, any> = new Map()

  bind = <I, P> (identifier: Identifier<I>): Bind<I, P> => {
    return new Bind<I, P>(this, identifier, this._add<I, P>(identifier))
  }

  unbind = <P> (identifier: Identifier<P>): Container => {
    if (!this._registry.has(identifier))
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    this._registry.delete(identifier)

    return this
  }

  rebind = <I, P> (identifier: Identifier<I>): Bind<I, P> => {
    return this.unbind<I>(identifier).bind<I, P>(identifier)
  }

  define = <I, P> (identifier: Identifier<I>): Bind<I, P> => {
    const registered = this._registry.get(identifier)

    if (!registered)
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    return new Bind<I, P>(this, identifier, registered, true)
  }

  override = <I, P> (identifier: Identifier<I>, payload: Payload<P>): void => {
    if (!this._registry.has(identifier))
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    this._registry.set(identifier, payload)
  }

  get = <P> (identifier: Identifier<P>, payloadReturnType?: PayloadReturnType): P | P[] => {
    const registered = this._registry.get(identifier)

    if (!registered)
      throw new Error(`Identifier ${identifier.toString()} not in registry`)

    const { newable, factory, value, array, cache, singleton } = registered

    const cacheItem = (creator: Factory<P>): P => {
      if (!singleton) return creator()
      registered.cache = creator()
      return registered.cache
    }

    switch (payloadReturnType) {
      case 'cache':
        if (cache !== undefined) return cache
        break
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
        if (singleton && cache !== undefined) return cache
        if (value !== undefined) return value
        if (array !== undefined) return array
        if (newable !== undefined) return cacheItem(() => new newable())
        if (factory !== undefined) cacheItem(() => factory())
    }

    throw new Error(`Payload for identifier ${identifier.toString()} is null`)
  }

  private _add = <I, P> (identifier: Identifier<I>): Payload<P> => {
    if (this._registry.has(identifier))
      throw new Error(`Identifier ${identifier.toString()} already registered`)

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

    it('should push to array', () => {
      const container = new Container()

      container.bind('foo').asArray('foo')
      let foo = container.get('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar')
      foo = container.get('foo')
      expect(foo).toEqual(['foo', 'bar'])
    })

    it('should override array', () => {
      const container = new Container()

      container.bind('foo').asArray('foo')
      let foo = container.get('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').override()
      foo = container.get('foo')
      expect(foo).toEqual(['bar'])
    })
  })
})