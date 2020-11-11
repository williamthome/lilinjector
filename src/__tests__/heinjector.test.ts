import { Container } from '@/container'

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