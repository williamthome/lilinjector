import { Container } from '../container'

const container = new Container()
const Inject = container.createInjectDecorator
const Injectable = container.createInjectableDecorator
const InjectableArray = container.createInjectableArrayDecorator

beforeEach(() => {
  container.clear()
})

describe('LiliNjector', () => {
  describe('bind()', () => {
    it('should bind identifiers', () => {
      container.bind(0).as(0).done()
      const zero = container.resolve(0)
      expect(zero).toBe(0)

      container.bind('array').asArray(0, 1, 2).done()
      const array = container.resolveArray('array')
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
      zero = container.resolveArray(0)
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
      let foo = container.resolveArray('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').done()
      foo = container.resolveArray('foo')
      expect(foo).toEqual(['foo', 'bar'])
    })

    it('should override array', () => {
      container.bind('foo').asArray('foo').noCache().done()
      let foo = container.resolveArray('foo')
      expect(foo).toEqual(['foo'])

      container.define('foo').asArray('bar').override().done()
      foo = container.resolveArray('foo')
      expect(foo).toEqual(['bar'])
    })
  })

  describe('resolve()', () => {
    it('should resolve', () => {
      container.bind('Foo').asNewable(class { public foo = 'foo' })
      expect(container.resolve<any>('Foo').foo).toBe('foo')
    })
  })

  describe('@Injectable()', () => {
    it('should inject class and resolve', () => {
      @Injectable<Foo>()
      class Foo { }

      expect(container.resolve(Foo)).toBeTruthy()
    })
  })

  describe('@InjectableArray()', () => {
    it('should inject class array and resolve', () => {
      @InjectableArray('routes')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class FooRoute { }

      @InjectableArray('routes')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class BarRoute { }

      const routes = container.resolveArray('routes')

      expect(routes.length).toBe(2)
    })
  })

  describe('@Inject()', () => {
    it('should inject', () => {
      @Injectable<Foo>()
      class Foo {
        constructor (
          @Inject() public bar: string
        ) { }

        @Inject()
        public foo!: string
      }

      const foo = container.resolve(Foo)

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