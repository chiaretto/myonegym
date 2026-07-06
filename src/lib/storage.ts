/** Request persistent storage so the browser is less likely to evict IndexedDB. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    /* not supported — ignore */
  }
  return false
}
