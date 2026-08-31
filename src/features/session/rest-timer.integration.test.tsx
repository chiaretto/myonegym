import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  startCardioSession,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/**
 * The rest-between-sets stopwatch, over the exercise media.
 *
 * Time only has to pass in one test here, so fake timers stay confined to it:
 * the app loads through Dexie, and faking the clock for a whole test tends to
 * stall that rather than test it.
 */

afterEach(async () => {
  vi.useRealTimers()
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory, db.sessions, db.sessionEntries].map(
      (t) => t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seedSession() {
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  const a = await createExercise({ name: 'Supino Reto', mediaUrl: 'https://x.test/s.png' }, db)
  const b = await createExercise({ name: 'Crucifixo' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [a, b] }, db)
  const sessionId = await startSession(gym, day, db)
  return { gym, sessionId, entries: await listSessionEntries(sessionId, db) }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const timer = () => screen.getByRole('button', { name: /^Cronômetro/ })
const findTimer = () => screen.findByRole('button', { name: /^Cronômetro/ })
const glyph = () => document.querySelector('.rest-timer .rt-icon')

describe('Rest timer on the session exercise screen', () => {
  it('sits over the media, showing a clock glyph above 00s', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const btn = await findTimer()
    expect(btn).toHaveAccessibleName('Cronômetro, 00s')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    // The glyph is the invitation: it says what the circle does before it has
    // done anything.
    expect(glyph()).not.toBeNull()
    // Over the media, not under it — it must cost the screen no height.
    expect(btn.closest('.hero')).not.toBeNull()
  })

  it('starts on a tap and drops the glyph', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await findTimer())

    expect(timer()).toHaveAttribute('aria-pressed', 'true')
    expect(glyph()).toBeNull()
  })

  it('changes nothing but the glyph when it starts', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const before = (await findTimer()).className
    await user.click(timer())

    // Same class list, so the same colour and the same size: on a circle this
    // small a second changing signal is one more thing to decode, and a
    // changing size would make it jump under the finger that just tapped it.
    expect(timer().className).toBe(before)
    expect(glyph()).toBeNull()
  })

  it('counts the seconds up one by one, without a minutes field', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    const btn = await findTimer()

    vi.useFakeTimers()
    act(() => {
      fireEvent.click(btn)
    })
    for (const expected of ['01s', '02s', '03s']) {
      act(() => {
        vi.advanceTimersByTime(1_000)
      })
      expect(timer()).toHaveTextContent(expected)
    }
  })

  it('reads a minute as 01:00, not as 00:60', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    const btn = await findTimer()

    // Faked only from here: the screen has already loaded through Dexie.
    vi.useFakeTimers()
    act(() => {
      fireEvent.click(btn)
    })
    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    // Still under a minute, so still seconds alone — the minutes field must not
    // turn up a moment early.
    expect(timer()).toHaveTextContent('59s')
    expect(timer().textContent).not.toContain(':')

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(timer()).toHaveTextContent('01:00')
    expect(timer()).toHaveAccessibleName('Cronômetro, 01:00')
  })

  it('stops and zeroes on a second tap — there is no pause that keeps the value', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    const btn = await findTimer()

    vi.useFakeTimers()
    act(() => {
      fireEvent.click(btn)
    })
    act(() => {
      vi.advanceTimersByTime(72_000)
    })
    expect(timer()).toHaveTextContent('01:12')

    act(() => {
      fireEvent.click(timer())
    })
    expect(timer()).toHaveTextContent('00s')
    expect(timer()).toHaveAttribute('aria-pressed', 'false')
    expect(glyph()).not.toBeNull()
  })

  it('survives a trip to another tab — a note mid-rest must not kill the count', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await findTimer())
    expect(timer()).toHaveAttribute('aria-pressed', 'true')

    // Away: there is no media outside "Execução", so no button either.
    await user.click(screen.getByRole('tab', { name: 'Notas' }))
    expect(screen.queryByRole('button', { name: /^Cronômetro/ })).toBeNull()

    // Back: still running.
    await user.click(screen.getByRole('tab', { name: 'Execução' }))
    expect(await findTimer()).toHaveAttribute('aria-pressed', 'true')
  })

  it('is absent from the other tabs', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    await findTimer()

    for (const name of ['Notas', 'Vídeos', 'Foto']) {
      await user.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }))
      expect(screen.queryByRole('button', { name: /^Cronômetro/ })).toBeNull()
    }
  })

  it('resets when the user steps to the next exercise', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await findTimer())
    expect(timer()).toHaveAttribute('aria-pressed', 'true')

    // The route keeps the same component and swaps a param, so React reconciles
    // rather than remounts: without an explicit reset the count would follow the
    // user into a set it never timed.
    await user.click(screen.getByRole('button', { name: 'Próximo exercício' }))
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()

    const next = await findTimer()
    expect(next).toHaveAttribute('aria-pressed', 'false')
    expect(next).toHaveTextContent('00s')
    expect(glyph()).not.toBeNull()
  })

  it('works on an exercise with no media at all', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    // The second exercise was seeded without a mediaUrl.
    renderAt(`/session/${sessionId}/entry/${entries[1].id}`)

    await user.click(await findTimer())
    expect(timer()).toHaveAttribute('aria-pressed', 'true')
  })

  it('coexists with the cardio session clock, which measures something else', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const ex = await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
    const { sessionId, entryId } = await startCardioSession(gym, ex, db)
    renderAt(`/session/${sessionId}/entry/${entryId}`)

    // The session's duration is labelled and sits above the tabs; the stopwatch
    // is an unlabelled circle over the media. Different readings, different
    // places.
    expect(await screen.findByText(/Duração:/)).toBeInTheDocument()
    expect(await findTimer()).toBeInTheDocument()
  })
})
