import { Container } from '../container'
import { Identifier, Newable } from '../protocols'

export const Injectable = <T extends Record<string, any>> (container: Container, identifier?: Identifier<T>) => {
  return <T extends Newable<any>> (
    target: T
  ): T => {
    container.bind(identifier || target).asNewable(target)
    return target
  }
}