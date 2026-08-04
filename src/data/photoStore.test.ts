import { afterEach, describe, expect, it } from 'vitest'
import { installMemoryOpfs, storedPhotoFiles, withoutOpfs } from '../test/memoryOpfs'
import { PhotoImageError, clearImages, readImage, removeImage, sweepOrphans, writeImage } from './photoStore'

const image = (body = 'jpeg-bytes', type = 'image/jpeg') => new Blob([body], { type })

/** Replace the shim with an OPFS whose every file operation fails a given way. */
function opfsWhere(handle: Record<string, unknown>) {
  const dir = {
    getDirectoryHandle: async () => dir,
    getFileHandle: async () => handle,
    removeEntry: async () => {},
    keys: async function* () {},
  }
  Object.defineProperty(navigator, 'storage', {
    value: { getDirectory: async () => dir },
    configurable: true,
    writable: true,
  })
}

afterEach(() => installMemoryOpfs())

describe('writeImage', () => {
  it('writes a file and reports its name and size', async () => {
    const stored = await writeImage(image('abc'))

    expect(stored.file).toMatch(/\.jpg$/)
    expect(stored.bytes).toBeUndefined()
    expect(stored.size).toBe(3)
    expect(await storedPhotoFiles()).toEqual([stored.file])
  })

  it('gives every image its own file', async () => {
    const a = await writeImage(image('a'))
    const b = await writeImage(image('b'))

    expect(a.file).not.toBe(b.file)
    expect(await storedPhotoFiles()).toHaveLength(2)
  })

  it('falls back to bytes when the browser has no OPFS', async () => {
    const stored = await withoutOpfs(() => writeImage(image('abc')))

    expect(stored.file).toBeUndefined()
    expect(stored.size).toBe(3)
    expect(new TextDecoder().decode(new Uint8Array(stored.bytes!))).toBe('abc')
  })

  it('falls back to bytes when a handle cannot be written from here (Safari < 17)', async () => {
    // The handle exists but offers no createWritable — writing it would need a
    // worker, which this app deliberately does not ship.
    opfsWhere({ getFile: async () => new File([], 'x') })

    const stored = await writeImage(image('abc'))

    expect(stored.file).toBeUndefined()
    expect(stored.bytes).toBeDefined()
  })

  it('propagates a full disk instead of hiding it in the fallback', async () => {
    const quota = new DOMException('no space', 'QuotaExceededError')
    opfsWhere({
      createWritable: async () => ({
        write: async () => {
          throw quota
        },
        close: async () => {},
        abort: async () => {},
      }),
    })

    await expect(writeImage(image())).rejects.toBe(quota)
  })
})

describe('readImage', () => {
  it('reads a file back labelled with the mime type from the record', async () => {
    const stored = await writeImage(image('abc'))

    const blob = await readImage({ ...stored, type: 'image/jpeg' })

    expect(await blob.text()).toBe('abc')
    expect(blob.type).toBe('image/jpeg')
  })

  it('reads a record that carries its own bytes', async () => {
    const stored = await withoutOpfs(() => writeImage(image('abc')))

    expect(await (await readImage({ ...stored, type: 'image/jpeg' })).text()).toBe('abc')
  })

  it('fails clearly when the file is gone', async () => {
    const stored = await writeImage(image('abc'))
    await removeImage(stored)

    await expect(readImage({ ...stored, type: 'image/jpeg' })).rejects.toBeInstanceOf(PhotoImageError)
  })

  it('fails clearly when there is no image at all', async () => {
    await expect(readImage({ type: 'image/jpeg' })).rejects.toBeInstanceOf(PhotoImageError)
  })
})

describe('sweepOrphans', () => {
  it('deletes the files nothing references and keeps the rest', async () => {
    const kept = await writeImage(image('keep'))
    const orphan = await writeImage(image('drop'))

    expect(await sweepOrphans(new Set([kept.file!]))).toBe(1)

    expect(await storedPhotoFiles()).toEqual([kept.file])
    expect(await readImage({ ...kept, type: 'image/jpeg' }).then((b) => b.text())).toBe('keep')
    await expect(readImage({ ...orphan, type: 'image/jpeg' })).rejects.toBeInstanceOf(PhotoImageError)
  })

  it('does nothing on a browser without OPFS', async () => {
    expect(await withoutOpfs(() => sweepOrphans(new Set()))).toBe(0)
  })
})

describe('clearImages', () => {
  it('drops every stored image', async () => {
    await writeImage(image('a'))
    await writeImage(image('b'))

    await clearImages()

    expect(await storedPhotoFiles()).toEqual([])
  })

  it('is a no-op when nothing was ever stored', async () => {
    await expect(clearImages()).resolves.toBeUndefined()
  })
})
