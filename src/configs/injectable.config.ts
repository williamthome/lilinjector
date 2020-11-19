import { Container } from '../container'
import { Identifier, Newable } from '../protocols'

export class InjectableConfig<TIdentifier extends Record<string, any>, TTarget extends Newable<any>> {

  constructor (
    private readonly target: TTarget,
    private readonly container: Container,
    private readonly identifier?: Identifier<TIdentifier>
  ) {}

  asNewable = (): TTarget => {
    if (this.container.has(this._identifier)) {
      this.container.define<TIdentifier, TTarget>(this._identifier).asNewable(this.target).done()
    } else {
      this.container.bind(this._identifier).asNewable(this.target).done()
    }
    return this.target
  }

  asNewableArray = (): TTarget => {
    if (this.container.has(this._identifier)) {
      this.container.define<TIdentifier, TTarget>(this._identifier).asNewableArray(this.target).done()
    } else {
      this.container.bind(this._identifier).asNewableArray(this.target).done()
    }
    return this.target
  }

  private get _identifier(): Identifier<TIdentifier> | TTarget {
    return this.identifier || this.target
  }
}