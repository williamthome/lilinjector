import { Factory } from './factory'
import { Newable } from './newable'

export interface Payload<P> {
  value?: P
  array?: P[]
  newable?: Newable<P>
  factory?: Factory<P>
  cache?: P | P[]
  noCache: boolean
  singleton: boolean
}