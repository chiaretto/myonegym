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
import { MAX_REST_MS, useRestTimer } from '../../state/restTimer'

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
  // The count is the app's now, not the screen's — so it outlives a test too.
  useRestTimer.setState({ startedAt: null })
  localStorage.clear()
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
/** The running timer floats; the stopped one sits in the media. */
const floating = () => document.querySelector('.rest-float')

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

  it('changes colour when it starts, and only colour', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    expect((await findTimer()).className).toBe('rest-timer')
    await user.click(timer())

    // CHANGED: colour used to be identical in both states. It carries the state
    // now, because a running timer floats over the whole app and the question
    // it answers from across the room is "is it counting?", which colour
    // answers faster than a glyph can.
    expect(timer().className).toBe('rest-timer running')
    expect(glyph()).toBeNull()
    // Still one class controlling the paint, so nothing here changes the size:
    // it would jump under the finger that just tapped it.
    expect(timer()).toHaveAttribute('aria-pressed', 'true')
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

  it('keeps counting, and stays visible, on a trip to another tab', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await findTimer())
    expect(timer()).toHaveAttribute('aria-pressed', 'true')
    // Running, it left the media and floats.
    expect(floating()).not.toBeNull()

    // CHANGED: it used to vanish outside "Execução", because it lived on the
    // media. Checking the machine's note mid-rest should not cost the number.
    await user.click(screen.getByRole('tab', { name: /^Notas/ }))
    expect(timer()).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('tab', { name: 'Execução' }))
    expect(timer()).toHaveAttribute('aria-pressed', 'true')
  })

  it('is absent from the other tabs while it is stopped', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    await findTimer()

    // Stopped it is the button on the media, and there is no media out here.
    for (const name of ['Notas', 'Vídeos', 'Foto']) {
      await user.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }))
      expect(screen.queryByRole('button', { name: /^Cronômetro/ })).toBeNull()
    }
  })

  it('keeps counting when the user steps to the next exercise', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await findTimer())
    expect(timer()).toHaveAttribute('aria-pressed', 'true')

    // CHANGED: this used to zero, on the grounds that the rest belonged to that
    // set. But a rest is spent walking to the next machine — which is exactly
    // this navigation, and exactly when the count used to be thrown away.
    await user.click(screen.getByRole('button', { name: 'Próximo exercício' }))
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()

    expect(timer()).toHaveAttribute('aria-pressed', 'true')
    expect(glyph()).toBeNull()
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

/**
 * The phone sits on the bench while the rest counts down, two metres from the
 * user's eyes — exactly what the system reads as idle. A stopwatch you have to
 * wake the phone to read is not a stopwatch.
 */
describe('The rest timer keeps the screen awake', () => {
  const stub = () => {
    const release = vi.fn(async () => {})
    const request = vi.fn(
      async () => ({ release, addEventListener: () => {} }) as unknown as WakeLockSentinel,
    )
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    return { request, release }
  }

  afterEach(() => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true })
  })

  it('holds the screen only while it is running', async () => {
    const { request, release } = stub()
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const btn = await findTimer()
    // Not while stopped: the workout clock runs for the whole session, and
    // holding the screen on for an hour is a battery bill nobody asked for.
    expect(request).not.toHaveBeenCalled()

    await user.click(btn)
    await act(async () => {})
    expect(request).toHaveBeenCalledWith('screen')

    await user.click(timer())
    expect(release).toHaveBeenCalled()
  })

  it('does not break where the browser has no Wake Lock', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true })
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await findTimer())
    await act(async () => {})

    // The timer is what matters, and it counts either way.
    expect(timer()).toHaveAccessibleName(/^Cronômetro/)
  })
})

/**
 * The count belongs to the workout, not to the screen that started it.
 *
 * This is the half of the stopwatch that has no home on any one screen: it has
 * to follow the user, survive the app being closed, and give up on its own.
 */
describe('A running rest timer follows the user through the app', () => {
  it('stays visible and counting when the user leaves the exercise', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    await user.click(await findTimer())

    // A count that survives navigation is worth nothing if it goes invisible
    // the moment you navigate: you would walk back to read the number, which is
    // the trip this exists to save.
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(timer()).toHaveAttribute('aria-pressed', 'true')
    expect(floating()).not.toBeNull()
  })

  it('is there on a screen that has nothing to do with the workout', async () => {
    useRestTimer.setState({ startedAt: Date.now() })
    await seedSession()
    renderAt('/settings')

    expect(await screen.findByRole('button', { name: /^Cronômetro/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(floating()).not.toBeNull()
  })

  it('starts exactly where it was standing, and does not jump', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    // Where the button sits on the media. jsdom measures everything as zero, so
    // the corner has to be stated.
    const docked = await findTimer()
    docked.getBoundingClientRect = () =>
      ({ left: 318, top: 196, right: 376, bottom: 254, width: 58, height: 58 }) as DOMRect

    await user.click(docked)

    // Starting it hands the stopwatch to a floating layer. Landing anywhere but
    // here would be it jumping out from under the finger that just tapped it.
    const float = document.querySelector('.rest-float') as HTMLElement
    expect(float.style.left).toBe('318px')
    expect(float.style.top).toBe('196px')
    // And none of the resting position applies any more. It used to, one
    // property at a time, and the one the inline style forgot — `margin-left` —
    // slid the stopwatch 12px sideways the moment it was started.
    expect(float.classList.contains('home')).toBe(false)
  })

  it('is never repositioned after it appears — it does not jump and snap back', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const docked = await findTimer()
    docked.getBoundingClientRect = () =>
      ({ left: 318, top: 196, right: 376, bottom: 254, width: 58, height: 58 }) as DOMRect

    // Deciding the position in an effect instead of during render costs one
    // painted frame at the CSS home before it moves — which is visible as the
    // stopwatch jumping to the corner and snapping back. What that looks like
    // in the DOM is a `style` written *after* the element is already there.
    const moves: string[] = []
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement
        if (el.classList.contains('rest-float')) moves.push(el.style.left)
      }
    })
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })

    await user.click(docked)
    observer.disconnect()

    // It arrived carrying its position; nothing repositioned it afterwards.
    expect((document.querySelector('.rest-float') as HTMLElement).style.left).toBe('318px')
    expect(moves).toEqual([])
  })

  it('goes back to the app corner when the count is restored after a reload', async () => {
    // The origin died with the page that measured it, so home is the only
    // sensible place left — and it is written in CSS, not inline.
    useRestTimer.setState({ startedAt: Date.now(), origin: null })
    await seedSession()
    renderAt('/settings')
    await screen.findByRole('button', { name: /^Cronômetro/ })

    const float = document.querySelector('.rest-float') as HTMLElement
    expect(float.style.left).toBe('')
    expect(float.style.top).toBe('')
    // Home is a class, and this is the case that wears it.
    expect(float.classList.contains('home')).toBe(true)
  })

  it('shows exactly one stopwatch, never two', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    await user.click(await findTimer())

    // Running, the floating one is the only one — the media's corner is vacant.
    expect(screen.getAllByRole('button', { name: /^Cronômetro/ })).toHaveLength(1)
  })

  it('goes back to the media when stopped on the exercise screen', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await findTimer())
    await user.click(timer())

    expect(floating()).toBeNull()
    expect(timer()).toHaveTextContent('00s')
    expect(document.querySelector('.hero .rest-timer')).not.toBeNull()
  })

  it('simply disappears when stopped anywhere else', async () => {
    useRestTimer.setState({ startedAt: Date.now() })
    await seedSession()
    const user = userEvent.setup()
    renderAt('/settings')

    await user.click(await findTimer())

    // Stopped and off the exercise screen it has nothing to say, and a grey
    // circle floating over Settings would be pure obstruction.
    expect(screen.queryByRole('button', { name: /^Cronômetro/ })).toBeNull()
  })

  it('comes back counting after the app is closed and reopened', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    await user.click(await findTimer())

    // What a restart is: the tree is gone, and only what was written remains.
    const startedAt = useRestTimer.getState().startedAt
    cleanup()
    renderAt('/')

    expect(await screen.findByRole('button', { name: /^Cronômetro/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(useRestTimer.getState().startedAt).toBe(startedAt)
  })

  it('survives the reload an update causes', async () => {
    // `app-foundation` defers the automatic update check during a workout, and
    // the rest timer used to be the first thing a reload cost. It is not any
    // more: applying an update on purpose no longer throws the count away.
    useRestTimer.setState({ startedAt: Date.now() - 30_000 })
    await seedSession()
    renderAt('/settings')
    expect(await screen.findByRole('button', { name: /^Cronômetro/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(timer()).toHaveTextContent('30s')
  })

  it('arrives stopped when it ran past the limit while the app was closed', async () => {
    // Left running last night. It must not be found counting this morning, nor
    // start a fresh 99 minutes from the moment the app is reopened.
    useRestTimer.setState({ startedAt: Date.now() - MAX_REST_MS - 1000 })
    await seedSession()
    renderAt('/')

    await act(async () => {})
    expect(screen.queryByRole('button', { name: /^Cronômetro/ })).toBeNull()
    expect(useRestTimer.getState().startedAt).toBeNull()
  })

  it('stops itself at the limit, exactly as a second tap would', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)
    const btn = await findTimer()

    vi.useFakeTimers()
    act(() => {
      fireEvent.click(btn)
    })
    act(() => {
      vi.advanceTimersByTime(MAX_REST_MS)
    })

    // Not frozen showing 99:00 — that would be an alarm nobody can switch off
    // without touching it.
    expect(useRestTimer.getState().startedAt).toBeNull()
    expect(document.querySelector('.rest-float')).toBeNull()
  })
})

/**
 * Dragging the running timer out of the way.
 *
 * It floats over the whole app, and the app's screen is small: sooner or later
 * it sits exactly on top of what the user wants to read or tap. The hazard is
 * the gesture, not the movement — a hand that shakes while dragging must not
 * switch off the stopwatch it meant to move.
 */
describe('A running rest timer can be moved out of the way', () => {
  /** jsdom gives every element a zero-sized box; the drag needs a real one. */
  function withBoxes() {
    const app = document.querySelector('.app') as HTMLElement
    const float = document.querySelector('.rest-float') as HTMLElement
    app.getBoundingClientRect = () =>
      ({ left: 0, right: 400, top: 0, bottom: 800, width: 400, height: 800 }) as DOMRect
    float.getBoundingClientRect = () =>
      ({ left: 330, right: 388, top: 68, bottom: 126, width: 58, height: 58 }) as DOMRect
    return float
  }

  /**
   * jsdom has no PointerEvent, and `fireEvent.pointerDown` then drops the
   * coordinates — which would make every one of these tests a drag from
   * nowhere. A MouseEvent under the pointer event's name carries them.
   */
  const pointer = (type: string, target: Element | Window, x: number, y: number) =>
    fireEvent(
      target,
      new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }),
    )

  const drag = (el: HTMLElement, from: [number, number], to: [number, number]) => {
    act(() => {
      pointer('pointerdown', el.querySelector('button')!, from[0], from[1])
      pointer('pointermove', window, to[0], to[1])
      pointer('pointerup', window, to[0], to[1])
    })
  }

  async function running() {
    useRestTimer.setState({ startedAt: Date.now() })
    await seedSession()
    renderAt('/settings')
    await screen.findByRole('button', { name: /^Cronômetro/ })
    return withBoxes()
  }

  it('moves without switching off', async () => {
    const float = await running()
    drag(float, [350, 90], [150, 400])

    expect(float.style.left).toBe('130px')
    expect(float.style.top).toBe('378px')
    expect(useRestTimer.getState().startedAt).not.toBeNull()
  })

  it('still switches off on a tap that does not move', async () => {
    const float = await running()
    const btn = float.querySelector('button')!
    pointer('pointerdown', btn, 350, 90)
    pointer('pointerup', window, 350, 90)
    fireEvent.click(btn)

    expect(useRestTimer.getState().startedAt).toBeNull()
  })

  it('does not switch off for a hand that shakes', async () => {
    const float = await running()
    const btn = float.querySelector('button')!
    // Just past the threshold: the smallest movement that counts as a drag.
    act(() => {
      pointer('pointerdown', btn, 350, 90)
      pointer('pointermove', window, 360, 90)
      pointer('pointerup', window, 360, 90)
    })
    fireEvent.click(btn)

    expect(useRestTimer.getState().startedAt).not.toBeNull()
  })

  it('treats a tremor below the threshold as a tap', async () => {
    const float = await running()
    const btn = float.querySelector('button')!
    act(() => {
      pointer('pointerdown', btn, 350, 90)
      pointer('pointermove', window, 353, 92)
      pointer('pointerup', window, 353, 92)
    })
    fireEvent.click(btn)

    // Under the threshold nothing moved, so this was a tap all along.
    expect(float.style.left).toBe('')
    expect(useRestTimer.getState().startedAt).toBeNull()
  })

  it('cannot be dragged off the screen', async () => {
    const float = await running()
    drag(float, [350, 90], [-500, -500])

    // Held at the edges, whole and visible.
    expect(float.style.left).toBe('12px')
    expect(float.style.top).toBe('12px')
  })

  it('goes home again on the next rest, not to where the last one was left', async () => {
    const float = await running()
    drag(float, [350, 90], [150, 400])
    expect(float.style.left).toBe('130px')

    await act(async () => {
      useRestTimer.getState().stop()
    })
    await act(async () => {
      useRestTimer.getState().start()
    })

    expect((document.querySelector('.rest-float') as HTMLElement).style.left).toBe('')
  })
})
