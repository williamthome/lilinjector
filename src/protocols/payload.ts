import { BindOptions } from './bind'
import { Factory } from './factory'
import { Newable } from './newable'

export interface Payload<P> {
  value?: P
  array?: P[]
  newable?: Newable<P>
  newableArray?: Newable<P>[]
  factory?: Factory<P>
  factoryArray?: Factory<P>[]
  cache?: P | P[]
  noCache: boolean
  singleton: boolean
  pinned: boolean
}

export type PayloadReturnType =
  | BindOptions
  | 'value'
  | 'cache'