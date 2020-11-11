type Any = Record<PropertyKey, any>
type Factory<P> = () => P
type Newable<P> = new (...args: any[]) => P
type Identifier<I> = PropertyKey | Newable<I>
type Value<P> = P | P[] | undefined
type Registry<I = unknown, P = any> = Map<Identifier<I>, Payload<P>>
type PayloadReturnType =
  | 'value'
  | 'array'
  | 'newable'
  | 'factory'
  | 'cache'

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
  noCache: boolean
  singleton: boolean
}

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

class Container {
  private _registry: Registry = new Map()
  private _snapshots: Registry[] = []

  bind = <I, P> (identifier: Identifier<I>): Bind<I, P> => {
    if (this._registry.has(identifier))
      throw new Error(`[HeinJector] Identifier ${identifier.toString()} already registered`)

    const payload: Payload<P> = { noCache: false, singleton: true }
    this._registry.set(identifier, payload)

    return new Bind<I, P>({
      container: this,
      identifier,
      payload
    })
  }

  unbind = <I, P> (identifier: Identifier<I>): Container => {
    this.get<I, P>(identifier)
    this._registry.delete(identifier)
    return this
  }

  rebind = <I, P> (identifier: Identifier<I>): Bind<I, P> => {
    return this.unbind<I, P>(identifier).bind<I, P>(identifier)
  }

  define = <I, P> (identifier: Identifier<I>): Bind<I, P> => {
    return new Bind<I, P>({
      container: this,
      identifier,
      payload: this.getPayloadOrThrow<I, P>(identifier)
    })
  }

  override = <I, P> (identifier: Identifier<I>, payload: Payload<P>): Container => {
    this.get<I, P>(identifier)
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

  private getPayloadOrThrow = <I, P> (identifier: Identifier<I>): Payload<P> => {
    const registered = this._registry.get(identifier)
    if (!registered) throw new Error(`[HeinJector] Identifier ${identifier.toString()} not in registry`)
    return registered
  }

  get = <I, P> (identifier: Identifier<I>, payloadReturnType?: PayloadReturnType): P | P[] => {
    const registered = this.getPayloadOrThrow<I, P>(identifier)

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
}

const createResolve = (container: Container) => {
  return <I, P> (identifier: Identifier<I>) => {
    let value: P | P[]
    return (): P | P[] => {
      if (value === undefined)
        value = container.get<I, P>(identifier)

      return value
    }
  }
}

const container = new Container()
const resolve = createResolve(container)

beforeEach(() => {
  container.clear()
})

describe('Heinjector', () => {
  describe('bind()', () => {
    it('should bind identifiers', () => {
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
      container.bind(0).as(0).done()
      container.unbind(0)

      expect(() => container.get(0)).toThrow()
    })
  })

  describe('rebind()', () => {
    it('should rebind identifier', () => {
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
      container.bind('foo').as('foo').done()
      let foo = container.get('foo')
      expect(foo).toBe('foo')

      container.define('foo').as('bar').done()
      foo = container.get('foo')
      expect(foo).toBe('bar')
    })

    it('should push to array', () => {
      container.bind('foo').asArray('foo').done()
      let foo = container.get('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').done()
      foo = container.get('foo')
      expect(foo).toEqual(['foo', 'bar'])
    })

    it('should override array', () => {
      container.bind('foo').asArray('foo').noCache().done()
      let foo = container.get('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').override().done()
      foo = container.get('foo')
      expect(foo).toEqual(['bar'])
    })
  })

  describe('resolve()', () => {
    it('should resolve', () => {
      container.bind('Foo').asNewable(class { public foo = 'foo' })
      expect(resolve<string, any>('Foo')().foo).toBe('foo')
    })
  })
})