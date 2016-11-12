import { Component, PropTypes } from 'react'
import SocketIOClient, { SOCKET_STATUS } from './SocketIOClient'

import Debug from 'debug'
const debug = Debug('react-socket.io:SocketIO') // eslint-disable-line no-unused-vars

const { string, object } = PropTypes

const SOCKET_CONN_OPTS = {
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
}

const noop = () => {}

export default function(endpoint = '', onMessage = noop, options = {}) {
  return function decorator(Target) {
    class SocketIO extends Component {
      static propTypes = {
        params: object,
        token: string,
      };

      static childContextTypes = {
        socket: object,
      };

      constructor() {
        super()
        this.socket = new SocketIOClient()
        this.connect()
      }

      getChildContext() {
        return {
          socket: this.socket,
        }
      }

      componentDidMount() {
        options.stopWhenHidden && document.addEventListener('visibilitychange', this.onPageVisibilityChange)
      }

      componentWillUnmount() {
        options.stopWhenHidden && document.removeEventListener('visibilitychange', this.onPageVisibilityChange)
        this.disconnect()
      }

      connect() {
        const socketEndpoint = typeof endpoint === 'function' ? endpoint(this.props) : endpoint
        const connOptions = { ...SOCKET_CONN_OPTS, ...options }

        this.socket.registerObserver(this)
        this.socket.connect(socketEndpoint, connOptions)
      }

      disconnect() {
        this.socket.disconnect()
        this.socket.unregisterObserver(this)
      }

      notify = ({ event, payload }) => {
        if (SOCKET_STATUS[event]) {
          debug('notify :: web socket event', event)
          return
        }

        debug('notify :: backend event ', event)
        onMessage(event, payload, this.props)
      }

      onPageVisibilityChange = () => {
        if (document.hidden) {
          debug('Disconnecting from socket...')
          this.disconnect()
          return
        }

        debug('Connecting to socket...')
        this.connect()
      }

      render() {
        return <Target {...this.props} socket={this.socket} />
      }
    }

    return SocketIO
  }
}
