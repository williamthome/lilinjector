import { BaseConfig } from './base.config'

export class DoneConfig<I, P = I> extends BaseConfig<I, P> {
  done = (): void => {
    const { newValue, payload, container, identifier } = this.config
    if (newValue && !payload.noCache) payload.cache = newValue
    else if (newValue === null && payload.cache) delete payload.cache
    container.override(identifier, payload)
  }
}