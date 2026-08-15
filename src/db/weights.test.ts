import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'
import {
  createExercise,
  createGym,
  deleteHistoryEntry,
  getWeight,
  listHistory,
  resolveWeight,
  saveWeight,
  weightsForGym,
} from './repos'
import { GLOBAL_GYM_ID } from './types'

let d: MyOneGymDB
let n = 0
beforeEach(async () => {
  d = new MyOneGymDB(`wtest-${Date.now()}-${n++}`)
  await d.open()
})
afterEach(async () => {
  await d.delete()
})

async function fixture() {
  const g = await createGym('A', d)
  const ex = await createExercise({ name: 'Rosca Direta' }, d)
  return { g, ex }
}

// history rows get monotonically increasing changedAt within a test; when two
// land on the same ms the id tiebreak keeps ordering stable.

describe('global weight', () => {
  it('a saved weight applies to every gym', async () => {
    const { g, ex } = await fixture()
    const b = await createGym('B', d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)

    expect((await getWeight(g, ex, d))?.value).toBe(20)
    expect((await getWeight(b, ex, d))?.value).toBe(20)
    // Stored once, under the sentinel — not once per gym.
    expect(await d.weights.count()).toBe(1)
    expect((await d.weights.toArray())[0].gymId).toBe(GLOBAL_GYM_ID)
  })

  it('the history of a global weight is the same in every gym', async () => {
    const { g, ex } = await fixture()
    const b = await createGym('B', d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(g, ex, 22.5, 'KG', 'global', d)

    expect(await listHistory(b, ex, d)).toHaveLength(2)
    expect((await listHistory(b, ex, d))[0].value).toBe(22.5)
  })

  it('first save is a "first" entry, later saves are "value"', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(g, ex, 22.5, 'KG', 'global', d)
    const h = await listHistory(g, ex, d)
    expect(h).toHaveLength(2)
    expect(h[0].value).toBe(22.5) // newest first
    expect(h[0].kind).toBe('value')
    expect(h[1].kind).toBe('first')
  })

  it('unit change is recorded as a "unit" entry', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(g, ex, 45, 'LB', 'global', d)
    const h = await listHistory(g, ex, d)
    expect(h[0].kind).toBe('unit')
    expect(h[0].unit).toBe('LB')
  })
})

describe('per-gym exception', () => {
  it('overrides the global weight in that gym only', async () => {
    const { g, ex } = await fixture()
    const b = await createGym('B', d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(b, ex, 15, 'LB', 'gym', d)

    expect(await resolveWeight(b, ex, d)).toMatchObject({
      scope: 'gym',
      weight: { value: 15, unit: 'LB' },
    })
    expect(await resolveWeight(g, ex, d)).toMatchObject({
      scope: 'global',
      weight: { value: 20, unit: 'KG' },
    })
  })

  it('gets a history of its own; the global timeline is untouched', async () => {
    const { g, ex } = await fixture()
    const b = await createGym('B', d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(g, ex, 22.5, 'KG', 'global', d)
    await saveWeight(b, ex, 15, 'KG', 'gym', d)

    expect(await listHistory(b, ex, d)).toHaveLength(1)
    expect(await listHistory(g, ex, d)).toHaveLength(2)
  })

  it('saving in gym scope again keeps the global weight put', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 22.5, 'KG', 'global', d)
    await saveWeight(g, ex, 15, 'KG', 'gym', d)
    await saveWeight(g, ex, 17.5, 'KG', 'gym', d)

    expect((await getWeight(g, ex, d))?.value).toBe(17.5)
    const globalRow = await d.weights.where('[gymId+exerciseId]').equals([GLOBAL_GYM_ID, ex]).first()
    expect(globalRow?.value).toBe(22.5)
  })

  it('saving globally drops the exception and keeps its history', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 22.5, 'KG', 'global', d)
    await saveWeight(g, ex, 17.5, 'KG', 'gym', d)

    // Unchecking "Só nessa academia" and saving the shown value.
    await saveWeight(g, ex, 17.5, 'KG', 'global', d)

    const resolved = await resolveWeight(g, ex, d)
    expect(resolved.scope).toBe('global')
    expect(resolved.weight?.value).toBe(17.5)
    expect(await d.weights.where('gymId').equals(g).count()).toBe(0)
    // The gym's own entry survives, out of view…
    expect(await d.weightHistory.where('gymId').equals(g).count()).toBe(1)
    expect(await listHistory(g, ex, d)).toHaveLength(2) // the global timeline

    // …and comes back with the exception.
    await saveWeight(g, ex, 12, 'KG', 'gym', d)
    expect(await listHistory(g, ex, d)).toHaveLength(2)
  })
})

describe('weightsForGym', () => {
  it("lays this gym's exceptions over the global weights", async () => {
    const { g, ex } = await fixture()
    const b = await createGym('B', d)
    const supino = await createExercise({ name: 'Supino' }, d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(g, supino, 40, 'KG', 'global', d)
    await saveWeight(b, supino, 30, 'KG', 'gym', d)

    const inB = await weightsForGym(b, d)
    expect(inB.get(ex)?.value).toBe(20) // global
    expect(inB.get(supino)?.value).toBe(30) // B's exception
    const inA = await weightsForGym(g, d)
    expect(inA.get(supino)?.value).toBe(40) // A never saw B's exception
  })
})

describe('weight history deletion', () => {
  it('deleting a past entry keeps the current weight', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(g, ex, 22.5, 'KG', 'global', d)
    await saveWeight(g, ex, 25, 'KG', 'global', d)
    const h = await listHistory(g, ex, d)
    const middle = h[1] // 22.5
    await deleteHistoryEntry(middle.id!, d)
    expect((await getWeight(g, ex, d))?.value).toBe(25)
    expect(await listHistory(g, ex, d)).toHaveLength(2)
  })

  it('deleting the current entry reverts to the previous', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(g, ex, 25, 'KG', 'global', d)
    const h = await listHistory(g, ex, d)
    await deleteHistoryEntry(h[0].id!, d) // delete current (25)
    expect((await getWeight(g, ex, d))?.value).toBe(20)
    expect(await listHistory(g, ex, d)).toHaveLength(1)
  })

  it('deleting the only global entry clears the weight', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    const h = await listHistory(g, ex, d)
    await deleteHistoryEntry(h[0].id!, d)
    expect(await getWeight(g, ex, d)).toBeUndefined()
    expect(await listHistory(g, ex, d)).toHaveLength(0)
  })

  it("deleting an exception's last entry falls back to the global weight", async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 25, 'KG', 'global', d)
    await saveWeight(g, ex, 15, 'KG', 'gym', d)

    const h = await listHistory(g, ex, d)
    expect(h).toHaveLength(1) // the exception's own timeline
    await deleteHistoryEntry(h[0].id!, d)

    const resolved = await resolveWeight(g, ex, d)
    expect(resolved.scope).toBe('global')
    expect(resolved.weight?.value).toBe(25)
    expect(await listHistory(g, ex, d)).toHaveLength(1) // the global one
  })

  it("deleting a global entry leaves other gyms' exceptions alone", async () => {
    const { g, ex } = await fixture()
    const b = await createGym('B', d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveWeight(b, ex, 15, 'KG', 'gym', d)

    const globalEntry = (await listHistory(g, ex, d))[0]
    await deleteHistoryEntry(globalEntry.id!, d)

    expect(await getWeight(g, ex, d)).toBeUndefined()
    expect((await getWeight(b, ex, d))?.value).toBe(15)
  })
})
