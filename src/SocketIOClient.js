import io from 'socket.io-client'
import Observer from './Observer'
import toLower from 'ramda/src/toLower'
import compose from 'ramda/src/compose'
import forEach from 'ramda/src/forEach'
import keys from 'ramda/src/keys'

import Debug from 'debug'
const debug = Debug('react-socket.io:SocketIOClient') // eslint-disable-line no-unused-vars

// socket.io-client manager events
export const SOCKET_STATUS = {
  CONNECT: Symbol('CONNECT'),
  ERROR: Symbol('ERROR'),
  CONNECT_ERROR: Symbol('CONNECT_ERROR'),
  CONNECTION_TIMEOUT: Symbol('CONNECTION_TIMEOUT'),
  RECONNECT: Symbol('RECONNECT'),
  RECONNECT_ATTEMPT: Symbol('RECONNECT_ATTEMPT'),
  RECONNECTING: Symbol('RECONNECTING'),
  RECONNECT_ERROR: Symbol('RECONNECT_ERROR'),
  RECONNECT_FAILED: Symbol('RECONNECT_FAILED'),
  DISCONNECT: Symbol('DISCONNECT'),
}

const handleEventFactory = (socket, observer, symbols) => event => {
  socket.on(toLower(event), () => {
    debug(`socket ${event} :: `, socket)
    observer.notifyAll({ event: symbols[event] })
  })
}

export default class SocketIOClient {
  observer = new Observer()
  socket = null;

  bindStarHandler = () => {
    const onevent = this.socket.onevent
    this.socket.onevent = function(packet) {
      const args = packet.data || []
      onevent.call(this, packet)      // original call
      packet.data = ['*'].concat(args)
      onevent.call(this, packet)      // additional call to catch-all
    }
  }

  bindHandlers = () => {
    this.bindStarHandler()
    const socket = this.socket
    const observer = this.observer

    socket.on('*', (event, data) => {
      debug('backend event: ', event)
      observer.notifyAll({ event, payload: data })
    })

    const handleEvent = handleEventFactory(this.socket, this.observer, SOCKET_STATUS)
    compose(forEach(handleEvent), keys)(SOCKET_STATUS)
  }

  registerObserver(observer) {
    this.observer.register(observer)
  }

  unregisterObserver(observer) {
    this.observer.unregister(observer)
  }

  isConnected() {
    return this.socket.connected
  }

  connect(wsUrl, opts = {}) {
    this.socket = io(wsUrl, opts)
    debug('connect() :: ', this.socket)
    this.bindHandlers()
  }

  disconnect() {
    debug('disconnect() :: ', this.socket)
    this.socket.disconnect()
  }

  join(rooms, eventName = 'join', responseHandler) {
    debug('join() :: ', rooms, this.socket)
    this.socket.emit(eventName, rooms, responseHandler)
  }

  leave(rooms, eventName = 'leave', responseHandler) {
    debug('leave() :: ', rooms, this.socket)
    this.socket.emit(eventName, rooms, responseHandler)
  }

  emit(...args) {
    this.socket.emit(...args)
  }
}
