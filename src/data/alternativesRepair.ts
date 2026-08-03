/**
 * Repair a set of declared "alternative" links into the shape the app can
 * actually maintain.
 *
 * The relation is **symmetric** and free of dangling references — that is the
 * invariant `Exercise.alternativeIds` documents and that nothing re-checks at
 * read time. Two callers need to establish it from data they did not produce: a
 * backup file (possibly hand-edited, possibly older than the field) and a
 * proposal from the assistant. Neither is worth rejecting outright over a
 * one-sided link, so both repair and move on — and they must repair the *same*
 * way, which is why the rule lives here instead of in each of them.
 *
 * The repairs, and nothing more:
 * - a peer that is not a known key is **dropped** (dangling);
 * - a self-reference is **ignored**;
 * - a link declared on one side only is **mirrored** onto the other.
 *
 * Deliberately NOT transitively closed. Closing A-B and A-C into a trio would
 * invent a kind of variation the user never declared — the bench press swaps
 * for the machine (same movement) and for the fly (same muscle), and those two
 * are not interchangeable with each other.
 */
export function mirrorSymmetric<K>(
  entries: { key: K; peers: K[] }[],
  compare?: (a: K, b: K) => number,
): Map<K, K[]> {
  const known = new Set(entries.map((e) => e.key))

  const sets = new Map<K, Set<K>>()
  for (const { key, peers } of entries) {
    sets.set(key, new Set(peers.filter((p) => p !== key && known.has(p))))
  }
  // Second pass: a link named on one side is a link on both.
  for (const [key, peers] of sets) {
    for (const peer of peers) sets.get(peer)?.add(key)
  }

  const out = new Map<K, K[]>()
  for (const [key, peers] of sets) {
    const list = [...peers]
    if (compare) list.sort(compare)
    out.set(key, list)
  }
  return out
}
