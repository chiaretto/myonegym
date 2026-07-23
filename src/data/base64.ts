/**
 * ArrayBuffer ↔ base64, for embedding binary (exercise photos) in the backup
 * JSON.
 *
 * Chunked on purpose. The obvious `btoa(String.fromCharCode(...new Uint8Array(
 * buf)))` throws `RangeError: Maximum call stack size exceeded` on a real photo —
 * spreading a few hundred KB of bytes into a function call blows the argument
 * stack. Encoding a chunk at a time keeps every `String.fromCharCode` call small.
 */

// 0x8000 bytes per chunk: comfortably under the argument-count limit, and a
// multiple of 3 so no chunk straddles a base64 group boundary.
const CHUNK = 0x8000

export function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
