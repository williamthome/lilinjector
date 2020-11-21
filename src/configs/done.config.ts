import { Container } from '../container'
import { BaseConfig } from './base.config'

export class DoneConfig<I, P = I> extends BaseConfig<I, P> {
  done = (): Container => {
    const { newValue, payload, container, identifier } = this.config
    if (newValue && !payload.noCache) payload.cache = newValue
    else if (newValue === null && payload.cache) delete payload.cache
    container.override(identifier, payload)
    return container
  }
}