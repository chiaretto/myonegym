import { afterEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { db } from '../db/db'
import { createDay } from '../db/repos'
import { useDays } from './hooks'

afterEach(async () => {
  await db.days.clear()
})

/**
 * The two halves of the "no empty-state flash" contract, at the hook level:
 * `undefined` while the query is in flight, and the previous answer painted
 * immediately on the next mount. Screen-level coverage lives in
 * features/home/loading-flash.integration.test.tsx.
 */
describe('useDays', () => {
  it('reports undefined until IndexedDB answers, then the days', async () => {
    await createDay({ name: 'Dia 1' }, db)

    const { result } = renderHook(() => useDays())

    // First render — nothing has been asked of the database yet. NOT `[]`: that
    // would be the answer "there are no training days".
    expect(result.current).toBeUndefined()

    await waitFor(() => expect(result.current?.map((d) => d.name)).toEqual(['Dia 1']))
  })

  it('resolves to an empty array when there really are no days', async () => {
    const { result } = renderHook(() => useDays())

    await waitFor(() => expect(result.current).toEqual([]))
  })

  it('paints the previous answer on the first render of a later mount', async () => {
    await createDay({ name: 'Dia 1' }, db)

    const first = renderHook(() => useDays())
    await waitFor(() => expect(first.result.current).toHaveLength(1))
    // Leaving the screen unmounts it — this is what every navigation does.
    first.unmount()

    const second = renderHook(() => useDays())

    // No await: coming back paints the days in the frame the screen appears,
    // instead of a blank one.
    expect(second.result.current?.map((d) => d.name)).toEqual(['Dia 1'])
  })
})
