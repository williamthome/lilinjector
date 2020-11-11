type Identifier<I> = PropertyKey | Newable<I>
type RegistryMap<I = unknown, P = any> = Map<Identifier<I>, Payload<P>>

type Newable<P> = new (...args: any[]) => P
type Factory<P> = () => P

type PayloadReturnType =
  | 'value'
  | 'array'
  | 'newable'
  | 'factory'
  | 'cache'

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

class ObjectConfig<I, P> extends DoneConfig<I, P> {
  notInSingletonScope = (): ObjectConfig<I, P> => {
    this.config.payload.singleton = false
    return this
  }

  noCache = (): ObjectConfig<I, P> => {
    this.config.payload.noCache = true
    return this
  }
}

class ArrayConfig<I, P> extends ObjectConfig<I, P> {
  override = (): ObjectConfig<I, P> => {
    this.config.payload.array = this.config.args
    return this
  }
}

class BindConfig<I, P> extends BaseConfig<I, P> {
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

class Container {
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

  createInjectDecorator = <T> (identifier?: Identifier<T>) => InjectDecorator(this, identifier)

  createInjectableDecorator = <T> (identifier?: Identifier<T>) => InjectableDecorator(this, identifier)

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

const getArgumentNames = <T> (newable: Newable<T>): string[] => {
  const RegExInsideParentheses = /[(][^)]*[)]/
  const RegExParenthesesAndSpaces = /[()\s]/g
  const regExValue = RegExInsideParentheses.exec(newable.toString())
  if (!regExValue) return []
  else return regExValue[0].replace(RegExParenthesesAndSpaces, '').split(',').map(str => str.trim())
}

const InjectDecorator = <T extends Record<string, any> | Newable<T>> (container: Container, identifier?: Identifier<T>) => {
  return (
    target: T,
    propertyKey: string | symbol,
    parameterIndex?: number
  ): void => {
    const key = parameterIndex !== undefined ? getArgumentNames(target as Newable<T>)[parameterIndex] : propertyKey

    container.bind(identifier || key)

    Object.defineProperty(parameterIndex !== undefined ? (target as Newable<T>).prototype : target, key, {
      get: () => container.resolve(identifier || key),
      set: () => new Error(`[HeinJector] Property ${key.toString()} for ${target} is readonly`)
    })
  }
}

const InjectableDecorator = <T extends Record<string, any>> (container: Container, identifier?: Identifier<T>) => {
  return <T extends Newable<any>> (
    target: T
  ): T => {
    container.bind(identifier || target).asNewable(target)
    return target
  }
}

const container = new Container()
const Inject = container.createInjectDecorator
const Injectable = container.createInjectableDecorator

beforeEach(() => {
  container.clear()
})

describe('Heinjector', () => {
  describe('bind()', () => {
    it('should bind identifiers', () => {
      container.bind(0).as(0).done()
      const zero = container.resolve(0)
      expect(zero).toBe(0)

      container.bind('array').asArray(0, 1, 2).done()
      const array = container.resolve('array')
      expect(array).toEqual([0, 1, 2])
    })
  })

  describe('unbind()', () => {
    it('should unbind identifier', () => {
      container.bind(0).as(0).done()
      container.unbind(0)

      expect(() => container.resolve(0)).toThrow()
    })
  })

  describe('rebind()', () => {
    it('should rebind identifier', () => {
      container.bind(0).as(0).done()
      let zero = container.resolve(0)
      expect(zero).toBe(0)

      container.rebind(0).asArray(0, 0, 0).done()
      zero = container.resolve(0)
      expect(zero).toEqual([0, 0, 0])
    })
  })

  describe('define()', () => {
    it('should define values', () => {
      container.bind('foo').as('foo').done()
      let foo = container.resolve('foo')
      expect(foo).toBe('foo')

      container.define('foo').as('bar').done()
      foo = container.resolve('foo')
      expect(foo).toBe('bar')
    })

    it('should push to array', () => {
      container.bind('foo').asArray('foo').done()
      let foo = container.resolve('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').done()
      foo = container.resolve('foo')
      expect(foo).toEqual(['foo', 'bar'])
    })

    it('should override array', () => {
      container.bind('foo').asArray('foo').noCache().done()
      let foo = container.resolve('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').override().done()
      foo = container.resolve('foo')
      expect(foo).toEqual(['bar'])
    })
  })

  describe('resolve()', () => {
    it('should resolve', () => {
      container.bind('Foo').asNewable(class { public foo = 'foo' })
      expect(container.resolve<string, any>('Foo').foo).toBe('foo')
    })
  })

  describe('@Inject()', () => {
    it('should inject', () => {
      @Injectable()
      class Foo {
        constructor (
          @Inject() public bar: string
        ) { }

        @Inject()
        public foo!: string
      }

      const foo = container.resolve<Foo, Foo>(Foo) as Foo

      container.define('foo').as('MyFooValue').done()
      expect(foo.foo).toBe('MyFooValue')

      container.define('bar').as('MyBarValue').done()
      expect(foo.bar).toBe('MyBarValue')

      container.define('foo').as('MyBarValue').done()
      expect(foo.foo).toBe('MyBarValue')

      container.define('bar').as('MyFooValue').done()
      expect(foo.bar).toBe('MyFooValue')
    })
  })
})