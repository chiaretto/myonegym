import { useSyncExternalStore } from 'react'

/**
 * Whether the browser believes it has a connection. Used only to say so on
 * buttons that cannot work without one — `navigator.onLine` is a hint, not a
 * promise, so a request can still fail with it true, and that path is handled
 * where the request is made.
 */
function subscribe(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function snapshot() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
