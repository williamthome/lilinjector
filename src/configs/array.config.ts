import { ObjectConfig } from './object.config'

export class ArrayConfig<I, P = I> extends ObjectConfig<I, P> {
  override = (): ObjectConfig<I, P> => {
    this.config.payload.array = this.config.args
    return this
  }
}