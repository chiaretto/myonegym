import { describe, expect, it } from 'vitest'
import { isEndedMessage, listenCommand, playCommand, seekCommand } from './youtubeLoop'

describe('commands', () => {
  it('asks the player to report its state', () => {
    expect(JSON.parse(listenCommand())).toEqual({ event: 'listening' })
  })

  it('seeks, allowing a jump past the buffer', () => {
    expect(JSON.parse(seekCommand(130))).toEqual({
      event: 'command',
      func: 'seekTo',
      args: [130, true],
    })
  })

  it('plays', () => {
    expect(JSON.parse(playCommand())).toEqual({ event: 'command', func: 'playVideo', args: [] })
  })
})

describe('isEndedMessage', () => {
  it('reads the documented onStateChange shape', () => {
    expect(isEndedMessage(JSON.stringify({ event: 'onStateChange', info: 0 }))).toBe(true)
    expect(isEndedMessage(JSON.stringify({ event: 'onStateChange', info: 1 }))).toBe(false)
  })

  it('reads the infoDelivery envelope the player actually sends', () => {
    expect(isEndedMessage(JSON.stringify({ event: 'infoDelivery', info: { playerState: 0 } }))).toBe(
      true,
    )
    expect(isEndedMessage(JSON.stringify({ event: 'infoDelivery', info: { playerState: 2 } }))).toBe(
      false,
    )
  })

  it('accepts an already-parsed object', () => {
    expect(isEndedMessage({ event: 'onStateChange', info: 0 })).toBe(true)
  })

  it('is false for anything else on the wire', () => {
    // Another app's postMessage, a malformed string, an unrelated event.
    expect(isEndedMessage('not json')).toBe(false)
    expect(isEndedMessage(JSON.stringify({ event: 'infoDelivery', info: {} }))).toBe(false)
    expect(isEndedMessage(null)).toBe(false)
    expect(isEndedMessage(42)).toBe(false)
    expect(isEndedMessage({ hello: 'world' })).toBe(false)
  })
})
