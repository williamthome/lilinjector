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
  value?: P
  array?: P[]
  newable?: Newable<P>
  factory?: Factory<P>
  cache?: P | P[]
  singleton: boolean
  noCache: boolean
}

type PayloadReturnType =
  | 'value'
  | 'array'
  | 'newable'
  | 'factory'
  | 'cache'

class BaseConfig<I, P> {
  constructor (protected readonly config: {
    readonly container: Container,
    readonly identifier: Identifier<I>,
    readonly payload: Payload<P>,
    oldValue?: P | P[],
    newValue?: P | P[] | null,
    args?: any
  }) { }
}

class DoneConfig<I, P> extends BaseConfig<I, P> {
  done = (): void => {
    const { newValue, payload, container, identifier } = this.config

    if (newValue && !payload.noCache) payload.cache = newValue
    else if (newValue === null && payload.cache) delete payload.cache
    container.override(identifier, payload)
  }
}

class Config<I, P> extends DoneConfig<I, P> {
  notInSingletonScope = (): Config<I, P> => {
    this.config.payload.singleton = false
    return this
  }

  noCache = (): Config<I, P> => {
    this.config.payload.noCache = true
    return this
  }
}

class ArrayConfig<I, P> extends Config<I, P> {
  override = (): Config<I, P> => {
    this.config.payload.array = this.config.args
    return this
  }
}

class Bind<I, P> extends BaseConfig<I, P> {
  as = (value: P): Config<I, P> => {
    this.config.oldValue = this.config.payload.value
    this.config.payload.value = value
    this.config.newValue = value
    return new Config<I, P>(this.config)
  }

  asArray = (...array: P[]): ArrayConfig<I, P> => {
    this.config.oldValue = this.config.payload.value
    const newArray = [...this.config.payload.array || [], ...array]
    this.config.payload.array = newArray
    this.config.newValue = newArray
    this.config.args = array
    return new ArrayConfig<I, P>(this.config)
  }

  asNewable = (newable: Newable<P>): Config<I, P> => {
    this.config.oldValue = this.config.payload.value
    this.config.payload.newable = newable
    this.config.newValue = null
    return new Config<I, P>(this.config)
  }

  asFactory = (factory: Factory<P>): Config<I, P> => {
    this.config.oldValue = this.config.payload.value
    this.config.payload.factory = factory
    this.config.newValue = null
    return new Config<I, P>(this.config)
  }
}

type Registry<I, P> = Map<Identifier<I>, Payload<P>>

class Container {
  private readonly _registry: Registry<any, any> = new Map()

  bind = <I, P> (identifier: Identifier<I>): Bind<I, P> => {
    return new Bind<I, P>({
      container: this,
      identifier,
      payload: this._add<I, P>(identifier)
    })
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

    return new Bind<I, P>({
      container: this,
      identifier,
      payload: registered
    })
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

    const { newable, factory, value, array, cache, singleton, noCache } = registered

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
        if (factory !== undefined) cacheItem(() => factory())
        break
      case 'cache':
        if (cache !== undefined) return cache
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

    const payload: Payload<P> = { singleton: true, noCache: false }
    this._registry.set(identifier, payload)

    return payload
  }
}

describe('Heinjector', () => {
  describe('bind()', () => {
    it('should bind identifiers', () => {
      const container = new Container()

      container.bind(0).as(0).done()
      const zero = container.get(0)
      expect(zero).toBe(0)

      container.bind('array').asArray(0, 1, 2).done()
      const array = container.get('array')
      expect(array).toEqual([0, 1, 2])
    })
  })

  describe('unbind()', () => {
    it('should unbind identifier', () => {
      const container = new Container()

      container.bind(0).as(0).done()
      container.unbind(0)

      expect(() => container.get(0)).toThrow()
    })
  })

  describe('rebind()', () => {
    it('should rebind identifier', () => {
      const container = new Container()

      container.bind(0).as(0).done()
      let zero = container.get(0)
      expect(zero).toBe(0)

      container.rebind(0).asArray(0, 0, 0).done()
      zero = container.get(0)
      expect(zero).toEqual([0, 0, 0])
    })
  })

  describe('define()', () => {
    it('should define values', () => {
      const container = new Container()

      container.bind('foo').as('foo').done()
      let foo = container.get('foo')
      expect(foo).toBe('foo')

      container.define('foo').as('bar').done()
      foo = container.get('foo')
      expect(foo).toBe('bar')
    })

    it('should push to array', () => {
      const container = new Container()

      container.bind('foo').asArray('foo').done()
      let foo = container.get('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').done()
      foo = container.get('foo')
      expect(foo).toEqual(['foo', 'bar'])
    })

    it('should override array', () => {
      const container = new Container()

      container.bind('foo').asArray('foo').noCache().done()
      let foo = container.get('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').override().done()
      foo = container.get('foo')
      expect(foo).toEqual(['bar'])
    })
  })
})