import { describe, expect, it } from 'vitest'
import { base64ToBytes, bytesToBase64 } from './base64'

const u8 = (b: ArrayBuffer) => new Uint8Array(b)

describe('base64 codec', () => {
  it('encodes known bytes to the known base64 string', () => {
    // "Man" → "TWFu" is the canonical RFC 4648 example.
    const bytes = new Uint8Array([0x4d, 0x61, 0x6e]).buffer
    expect(bytesToBase64(bytes)).toBe('TWFu')
  })

  it('round-trips an empty buffer', () => {
    expect(bytesToBase64(new ArrayBuffer(0))).toBe('')
    expect(u8(base64ToBytes('')).length).toBe(0)
  })

  it('survives every length modulo 3 (padding)', () => {
    for (const len of [1, 2, 3, 4, 5]) {
      const src = new Uint8Array(len)
      for (let i = 0; i < len; i++) src[i] = (i * 37 + 11) & 0xff
      const back = u8(base64ToBytes(bytesToBase64(src.buffer)))
      expect([...back]).toEqual([...src])
    }
  })

  it('preserves all 256 byte values', () => {
    const src = new Uint8Array(256)
    for (let i = 0; i < 256; i++) src[i] = i
    const back = u8(base64ToBytes(bytesToBase64(src.buffer)))
    expect([...back]).toEqual([...src])
  })

  it('round-trips a buffer large enough to overflow the naïve path, byte-for-byte', () => {
    // 1 MB — well past the ~64 K argument-spread limit that a single
    // String.fromCharCode(...bytes) would hit. A deterministic PRNG so failures
    // are reproducible without Math.random.
    const n = 1024 * 1024
    const src = new Uint8Array(n)
    let seed = 0x1234_5678
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      src[i] = seed & 0xff
    }
    const base64 = bytesToBase64(src.buffer)
    const back = u8(base64ToBytes(base64))
    expect(back.length).toBe(n)
    // Full byte-for-byte equality (not a sample).
    let mismatch = -1
    for (let i = 0; i < n; i++) {
      if (back[i] !== src[i]) {
        mismatch = i
        break
      }
    }
    expect(mismatch).toBe(-1)
  })
})
