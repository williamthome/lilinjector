import { Container } from '../container'
import { Identifier, Newable } from '../protocols'

export const Inject = <T extends Record<string, any> | Newable<T>> (container: Container, identifier?: Identifier<T>) => {
  return (
    target: T,
    propertyKey: string | symbol,
    parameterIndex?: number
  ): void => {
    const getArgumentNames = <T> (newable: Newable<T>): string[] => {
      const RegExInsideParentheses = /[(][^)]*[)]/
      const RegExParenthesesAndSpaces = /[()\s]/g
      const regExValue = RegExInsideParentheses.exec(newable.toString())
      if (!regExValue) return []
      else return regExValue[0].replace(RegExParenthesesAndSpaces, '').split(',').map(str => str.trim())
    }

    const key = parameterIndex !== undefined ? getArgumentNames(target as Newable<T>)[parameterIndex] : propertyKey

    if (!container.has(identifier || key))
      container.bind(identifier || key)

    Object.defineProperty(parameterIndex !== undefined ? (target as Newable<T>).prototype : target, key, {
      get: () => container.resolve(identifier || key),
      set: () => new Error(`[LiliNjector] Property ${key.toString()} for ${target} is readonly`)
    })
  }
}