import { Component, PropTypes } from 'react'
import { SOCKET_STATUS } from './SocketIOClient'
import merge from 'ramda/src/merge'
import difference from 'ramda/src/difference'
import equals from 'ramda/src/equals'
import not from 'ramda/src/not'
import concat from 'ramda/src/concat'

import Debug from 'debug'
const debug = Debug('react-socket.io:JoinRooms') // eslint-disable-line no-unused-vars

const { object } = PropTypes

// default decorator args and opts
const _onMessage = () => debug('Specify an onMessage handler')
const _rooms = () => debug('Specify a rooms retriever function')
const _options = {
  socketReader: (props, context = {}) => context.socket,
  joinPredicate: () => true,
  joinEvent: 'join',
  joinResponseHandler: undefined,
  leaveEvent: 'leave',
  leaveResponseHandler: undefined,
  contextTypes: { socket: object },
}

export default function(rooms = _rooms, onMessage = _onMessage, options = {}) {
  const {
    socketReader,
    joinPredicate,
    joinEvent,
    joinResponseHandler,
    leaveEvent,
    leaveResponseHandler,
    contextTypes,
  } = merge(_options, options)

  return function decorator(Target) {
    class JoinRooms extends Component {
      static contextTypes = contextTypes;

      constructor(props, context) {
        super(props, context)
        const shouldJoin = joinPredicate(props, context)

        debug('constructor :: should join', shouldJoin)

        if (shouldJoin) {
          this.socket = socketReader(props, context)
          this.join(rooms(props, context))
        }
      }

      componentWillReceiveProps(nextProps, nextContext) {
        const isJoined = this._joined
        const shouldJoin = joinPredicate(nextProps, nextContext)
        const _rooms = rooms(nextProps, nextContext)

        // FOUR (4) states to investigate and act based on the result:
        //
        // 1. I should join rooms but socket is not yet set on this
        //  => read socket and set
        if (shouldJoin && !this.socket) {
          this.socket = socketReader(nextProps, nextContext)
        }

        // 2. I should join rooms and I'm currently not joined
        //  => join all rooms
        if (shouldJoin && !isJoined) {
          this.join(_rooms)
        }

        // 3. I should join different rooms than those I'm already joined
        //  => join those I'm not joined
        //     and leave those missing from new rooms
        if (shouldJoin && isJoined && not(equals(_rooms, this.rooms))) {
          const joinRooms = difference(_rooms, this.rooms)
          if (joinRooms && joinRooms.length > 0) this.join(joinRooms)
          const leaveRooms = difference(this.rooms, _rooms)
          if (leaveRooms && leaveRooms.length > 0) this.leave(leaveRooms)
        }

        // 4. I shouldn't join any room but I'm already joined
        //  => leave all rooms
        if (!shouldJoin && isJoined) {
          this.leave()
        }
      }

      componentWillUnmount() {
        this.leave()
      }

      join(rooms = []) {
        if (rooms.length === 0) return

        this._joined = true
        this.rooms = concat(rooms, this.rooms || [])

        this.socket.registerObserver(this)
        this.socket.join(this.rooms, joinEvent, joinResponseHandler)
      }

      leave(rooms) {
        rooms = rooms || this.rooms
        this.rooms = difference(this.rooms, rooms)

        if (this.rooms.length === 0) this.socket.unregisterObserver(this)
        this.socket.leave(rooms, leaveEvent, leaveResponseHandler)
      }

      notify = ({ event, payload }) => {
        if (SOCKET_STATUS[event]) {
          debug('notify :: web socket event', event)
          return
        }

        debug('notify :: backend event ', event)
        onMessage(event, payload, this.props)
      }

      render() {
        return <Target {...this.props} socket={this.socket} />
      }
    }

    return JoinRooms
  }
}
