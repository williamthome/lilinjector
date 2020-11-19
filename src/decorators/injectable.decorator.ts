import { InjectableConfig } from '../configs'
import { Container } from '../container'
import { Identifier, Newable } from '../protocols'

export const Injectable = <TIdentifier extends Record<string, any>> (container: Container, identifier?: Identifier<TIdentifier>) => {
  return <TTarget extends Newable<any>> (
    target: TTarget
  ): TTarget => {
    return new InjectableConfig<TIdentifier, TTarget>(target, container, identifier).asNewable()
  }
}