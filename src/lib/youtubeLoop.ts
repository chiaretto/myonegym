/**
 * Looping a YouTube **segment**, over the player's postMessage API.
 *
 * `loop=1&playlist=<id>` cannot do it: it repeats the *video*, restarting at
 * zero and dropping the `start`/`end` the user trimmed — the range applies to
 * the first pass only. So the loop is driven from here instead: the player is
 * asked to report its state, and every time it reports "ended" it is sent back
 * to the start of the segment and told to play.
 *
 * Deliberately no `iframe_api` script: the app loads nothing from a third-party
 * host at runtime, and `enablejsapi=1` plus these three messages is the whole
 * protocol we need. The functions are pure so the parsing can be tested without
 * a real player.
 */

/** Ask the player to start reporting its state. Sent once the frame loads. */
export function listenCommand(): string {
  return JSON.stringify({ event: 'listening' })
}

export function seekCommand(seconds: number): string {
  // `true` = allow seeking ahead of the buffered range.
  return JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] })
}

export function playCommand(): string {
  return JSON.stringify({ event: 'command', func: 'playVideo', args: [] })
}

/** YouTube's player state for "the video reached its end". */
const ENDED = 0

/**
 * True when a `message` payload from the player says the video ended.
 *
 * Two shapes are accepted because the player has emitted both: the documented
 * `onStateChange` and the `infoDelivery` envelope it actually sends most of the
 * time. Anything else — another origin, another app's postMessage, a malformed
 * string — is simply not an ended event.
 */
export function isEndedMessage(data: unknown): boolean {
  let parsed: unknown = data
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data)
    } catch {
      return false
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return false
  const msg = parsed as { event?: unknown; info?: unknown }
  if (msg.event === 'onStateChange') return msg.info === ENDED
  if (msg.event === 'infoDelivery') {
    const info = msg.info as { playerState?: unknown } | undefined
    return info?.playerState === ENDED
  }
  return false
}
