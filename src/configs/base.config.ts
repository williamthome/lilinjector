import { Container } from '../container'
import { Identifier, Payload } from '../protocols'

export class BaseConfig<I, P> {
  constructor (protected readonly config: {
    readonly container: Container,
    readonly identifier: Identifier<I>,
    readonly payload: Payload<P>,
    oldValue?: P | P[],
    newValue?: P | P[] | null,
    args?: any
  }) { }
}