import forEach from 'ramda/src/forEach'
import indexOf from 'ramda/src/indexOf'
import append from 'ramda/src/append'
import remove from 'ramda/src/remove'
import curry from 'ramda/src/curry'
import Debug from 'debug'
const debug = Debug('react-socket.io:Observer') // eslint-disable-line no-unused-vars

export default class Observer {
  observers = [];

  register(observer) {
    const pos = indexOf(observer, this.observers)
    if (!~pos) this.observers = append(observer, this.observers)
  }

  unregister(observer) {
    const pos = indexOf(observer, this.observers)
    if (~pos) this.observers = remove(pos, 1, this.observers)
  }

  notifyOne = curry((data, observer) => {
    const notify = observer.notify
    if (typeof notify !== 'function') {
      debug('notifyOne :: Observer with no notify function found', observer)
      return
    }

    notify.call(observer, data)
  });

  notifyAll(data) {
    forEach(this.notifyOne(data), this.observers)
  }
}
