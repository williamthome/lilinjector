import { DoneConfig } from './done.config'

export class ObjectConfig<I, P = I> extends DoneConfig<I, P> {
  notInSingletonScope = (): ObjectConfig<I, P> => {
    this.config.payload.singleton = false
    return this
  }

  noCache = (): ObjectConfig<I, P> => {
    this.config.payload.noCache = true
    return this
  }
}