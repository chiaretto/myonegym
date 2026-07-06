import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'
import {
  createExercise,
  createGym,
  deleteHistoryEntry,
  getWeight,
  listHistory,
  saveWeight,
} from './repos'

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
  const g = await createGym('A', undefined, d)
  const ex = await createExercise({ name: 'Rosca Direta' }, d)
  return { g, ex }
}

// history rows get monotonically increasing changedAt within a test; when two
// land on the same ms the id tiebreak keeps ordering stable.

describe('weight history', () => {
  it('first save is a "first" entry, later saves are "value"', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', d)
    await saveWeight(g, ex, 22.5, 'KG', d)
    const h = await listHistory(g, ex, d)
    expect(h).toHaveLength(2)
    expect(h[0].value).toBe(22.5) // newest first
    expect(h[0].kind).toBe('value')
    expect(h[1].kind).toBe('first')
  })

  it('unit change is recorded as a "unit" entry', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', d)
    await saveWeight(g, ex, 45, 'LB', d)
    const h = await listHistory(g, ex, d)
    expect(h[0].kind).toBe('unit')
    expect(h[0].unit).toBe('LB')
  })

  it('history and weight are independent per gym', async () => {
    const { g, ex } = await fixture()
    const b = await createGym('B', undefined, d)
    await saveWeight(g, ex, 20, 'KG', d)
    await saveWeight(g, ex, 25, 'KG', d)
    await saveWeight(b, ex, 15, 'LB', d)
    expect(await listHistory(g, ex, d)).toHaveLength(2)
    expect(await listHistory(b, ex, d)).toHaveLength(1)
    expect((await getWeight(g, ex, d))?.value).toBe(25)
    expect((await getWeight(b, ex, d))?.unit).toBe('LB')
  })

  it('deleting a past entry keeps the current weight', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', d)
    await saveWeight(g, ex, 22.5, 'KG', d)
    await saveWeight(g, ex, 25, 'KG', d)
    const h = await listHistory(g, ex, d)
    const middle = h[1] // 22.5
    await deleteHistoryEntry(middle.id!, d)
    expect((await getWeight(g, ex, d))?.value).toBe(25)
    expect(await listHistory(g, ex, d)).toHaveLength(2)
  })

  it('deleting the current entry reverts to the previous', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', d)
    await saveWeight(g, ex, 25, 'KG', d)
    const h = await listHistory(g, ex, d)
    await deleteHistoryEntry(h[0].id!, d) // delete current (25)
    expect((await getWeight(g, ex, d))?.value).toBe(20)
    expect(await listHistory(g, ex, d)).toHaveLength(1)
  })

  it('deleting the only entry clears the weight', async () => {
    const { g, ex } = await fixture()
    await saveWeight(g, ex, 20, 'KG', d)
    const h = await listHistory(g, ex, d)
    await deleteHistoryEntry(h[0].id!, d)
    expect(await getWeight(g, ex, d)).toBeUndefined()
    expect(await listHistory(g, ex, d)).toHaveLength(0)
  })
})
