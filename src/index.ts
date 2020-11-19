import { Container } from './container'

const container = new Container()
const Inject = container.createInjectDecorator
const Injectable = container.createInjectableDecorator
const InjectableArray = container.createInjectableArrayDecorator

export default container
export { Inject, Injectable, InjectableArray }