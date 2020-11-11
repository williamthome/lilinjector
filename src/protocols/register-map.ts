import { Identifier } from './identifier'
import { Payload } from './payload'

export type RegistryMap<I = unknown, P = any> = Map<Identifier<I>, Payload<P>>