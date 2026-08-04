/**
 * An in-memory Origin Private File System for tests.
 *
 * jsdom implements no storage API at all, so without this every photo would
 * take the bytes-in-the-record fallback and the OPFS path — the whole point of
 * `data/photoStore` — would never run under test. Same role `fake-indexeddb`
 * plays for Dexie: a truthful enough stand-in to exercise the real code.
 *
 * Only what the store uses is implemented: nested directories one level deep,
 * `getFileHandle`, `removeEntry`, `keys()`, `getFile()` and `createWritable()`.
 */

type Entry = Map<string, Blob | MemoryDirectory>

class MemoryDirectory {
  readonly kind = 'directory'
  constructor(
    readonly name: string,
    readonly entries: Entry = new Map(),
  ) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const found = this.entries.get(name)
    if (found instanceof MemoryDirectory) return found
    if (found) throw new DOMException(`${name} is a file`, 'TypeMismatchError')
    if (!options?.create) throw new DOMException(`${name} not found`, 'NotFoundError')
    const dir = new MemoryDirectory(name)
    this.entries.set(name, dir)
    return dir
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    const found = this.entries.get(name)
    if (found instanceof MemoryDirectory) {
      throw new DOMException(`${name} is a directory`, 'TypeMismatchError')
    }
    if (!found && !options?.create) throw new DOMException(`${name} not found`, 'NotFoundError')
    if (!found) this.entries.set(name, new Blob([]))
    return new MemoryFileHandle(this, name)
  }

  async removeEntry(name: string, _options?: { recursive?: boolean }) {
    if (!this.entries.delete(name)) throw new DOMException(`${name} not found`, 'NotFoundError')
  }

  async *keys() {
    for (const name of [...this.entries.keys()]) yield name
  }
}

class MemoryFileHandle {
  readonly kind = 'file'
  constructor(
    private readonly dir: MemoryDirectory,
    readonly name: string,
  ) {}

  async getFile(): Promise<File> {
    const blob = this.dir.entries.get(this.name)
    if (!blob || blob instanceof MemoryDirectory) {
      throw new DOMException(`${this.name} not found`, 'NotFoundError')
    }
    // A real OPFS file reports no mime type — the caller re-labels it.
    return new File([blob], this.name)
  }

  async createWritable() {
    const chunks: BlobPart[] = []
    return {
      write: async (data: BlobPart) => {
        chunks.push(data)
      },
      close: async () => {
        this.dir.entries.set(this.name, new Blob(chunks))
      },
      abort: async () => {
        this.dir.entries.delete(this.name)
      },
    }
  }
}

let opfsRoot = new MemoryDirectory('')

/** Install the shim (idempotent) and start from an empty file system. */
export function installMemoryOpfs() {
  opfsRoot = new MemoryDirectory('')
  const storage = { getDirectory: async () => opfsRoot as unknown as FileSystemDirectoryHandle }
  Object.defineProperty(navigator, 'storage', {
    value: { ...navigator.storage, ...storage },
    configurable: true,
    writable: true,
  })
}

/** Run `fn` on a browser with no OPFS at all, then restore the shim. */
export async function withoutOpfs<T>(fn: () => Promise<T>): Promise<T> {
  const saved = navigator.storage
  Object.defineProperty(navigator, 'storage', {
    value: { ...saved, getDirectory: undefined },
    configurable: true,
    writable: true,
  })
  try {
    return await fn()
  } finally {
    Object.defineProperty(navigator, 'storage', { value: saved, configurable: true, writable: true })
  }
}

/** Names of the files currently stored under `photos/`. */
export async function storedPhotoFiles(): Promise<string[]> {
  const dir = opfsRoot.entries.get('photos')
  if (!(dir instanceof MemoryDirectory)) return []
  return [...dir.entries.keys()]
}
