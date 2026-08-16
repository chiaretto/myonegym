import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym, saveWeight } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

afterEach(async () => {
  cleanup()
  await Promise.all(
    [
      db.gyms,
      db.categories,
      db.exercises,
      db.days,
      db.weights,
      db.weightHistory,
      db.sessions,
      db.sessionEntries,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

/** Controlled fixture: gym + "Dia 1" (3 named exercises, Supino at 40 KG) and a
 *  second "Dia 2", independent of the sample-data content so these tests stay
 *  stable (Dia 2 provides another day to exercise the resume/second-session path). */
async function seedDia1() {
  const gym = await createGym('Academia A', db)
  const peito = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryIds: [peito] }, db)
  const crucifixo = await createExercise({ name: 'Crucifixo', categoryIds: [peito] }, db)
  const corda = await createExercise({ name: 'Tríceps Corda', categoryIds: [peito] }, db)
  await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo, corda] }, db)
  await createDay({ name: 'Dia 2', exerciseIds: [crucifixo, corda] }, db)
  await saveWeight(gym, supino, 40, 'KG', 'global', db)
}

describe('Workout session end-to-end', () => {
  it('starts from a day, completes, appears in history, and deletes', async () => {
    await seedDia1()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // Start the first day's workout from Home.
    const startButtons = await screen.findAllByRole('button', { name: 'Iniciar' })
    await user.click(startButtons[0])

    // Runner shows the day's entries and a progress line.
    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    expect(screen.getByText(/de 3 concluídos/)).toBeInTheDocument()
    // Each row ends with an icon-only chevron — the visible "opens the detail" cue.
    expect(document.querySelectorAll('.entry-link .row-chev')).toHaveLength(3)

    // Mark the first exercise done (1/3 → 33%).
    await user.click(screen.getByRole('button', { name: /Supino Reto/ }))
    await waitFor(() => expect(screen.getByText('33%')).toBeInTheDocument())

    // Complete → stays on this session, which is now its summary: the share
    // buttons are right there, which is what most people want next.
    await user.click(screen.getByRole('button', { name: /Concluir treino/ }))
    expect(await screen.findByRole('heading', { name: 'Sessão' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Compartilhar$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Compartilhar sem pesos/ })).toBeInTheDocument()
    // And it is read-only now: no way to un-tick what was just recorded.
    expect(screen.queryByRole('button', { name: /Concluir treino/ })).toBeNull()

    // The history is one tap away: on a completed session, back goes there.
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Consistência' })).toBeInTheDocument()
    expect(await screen.findByText('1/3')).toBeInTheDocument()

    // Open the session detail (read-only) then delete it.
    await user.click(screen.getByText('Dia 1'))
    const del = await screen.findByRole('button', { name: 'Excluir sessão' })
    await user.click(del)
    // Confirm in the sheet.
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    // Back to the Consistência screen, now empty.
    expect(await screen.findByText('Nenhum treino ainda')).toBeInTheDocument()
    expect(await db.sessions.count()).toBe(0)
    expect(await db.sessionEntries.count()).toBe(0)
  })

  it('detail: editing the weight updates the per-gym target, then Concluído advances', async () => {
    await seedDia1()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click((await screen.findAllByRole('button', { name: 'Iniciar' }))[0])
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))
    // The session detail now uses the same "Peso alvo" editor as the catalog.
    expect(await screen.findByText('Peso alvo')).toBeInTheDocument()

    // Edit the weight here (40 → 42.5) — this updates the exercise's per-gym target.
    // Wait for the target-weight live query to resolve (button flips Definir→Editar).
    await user.click(await screen.findByRole('button', { name: /Editar/ }))
    const input = screen.getByLabelText('Peso')
    await user.clear(input)
    await user.type(input, '42.5')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    const supinoEx = (await db.exercises.toArray()).find((e) => e.name === 'Supino Reto')!
    await waitFor(async () =>
      expect((await db.weights.where('exerciseId').equals(supinoEx.id!).first())?.value).toBe(42.5),
    )
    // No independent per-session weight is stored on the entry.
    expect(
      (await db.sessionEntries.toArray()).every((e) => !('usedValue' in e)),
    ).toBe(true)

    // Pending exercise shows the "Concluir" CTA; tapping it marks Supino done and
    // advances to the next exercise (Crucifixo).
    await user.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()
    await waitFor(async () =>
      expect((await db.sessionEntries.toArray()).find((e) => e.exerciseName === 'Supino Reto')?.done).toBe(true),
    )

    // Voltar back to Supino → it now shows the distinct "Concluído" done state + chip.
    await user.click(screen.getByRole('button', { name: 'Exercício anterior' }))
    expect(await screen.findByRole('heading', { name: 'Supino Reto', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concluído' })).toBeInTheDocument()
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(1) // button + chip
  })

  it('steps between exercises (Voltar/Avançar) and guards Concluir treino', async () => {
    await seedDia1()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click((await screen.findAllByRole('button', { name: 'Iniciar' }))[0])

    // With nothing done, "Concluir treino" is disabled + hint is shown.
    expect(await screen.findByRole('button', { name: /Concluir treino/ })).toBeDisabled()
    expect(screen.getByText(/Marque ao menos um exercício/)).toBeInTheDocument()

    // Open the first exercise, Avançar without marking → Crucifixo, nothing done.
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))
    await user.click(screen.getByRole('button', { name: 'Próximo exercício' }))
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()
    expect((await db.sessionEntries.toArray()).every((e) => !e.done)).toBe(true)

    // Voltar back to Supino, then Concluir (marks + advances).
    await user.click(screen.getByRole('button', { name: 'Exercício anterior' }))
    expect(await screen.findByRole('heading', { name: 'Supino Reto', level: 1 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir' }))
    await waitFor(async () =>
      expect((await db.sessionEntries.toArray()).find((e) => e.exerciseName === 'Supino Reto')?.done).toBe(true),
    )

    // Back to the runner (BackBar): "Concluir treino" is now enabled.
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('button', { name: /Concluir treino/ })).toBeEnabled()
  })

  it('prevents a second active session and resumes instead', async () => {
    await seedDia1()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const startButtons = await screen.findAllByRole('button', { name: 'Iniciar' })
    await user.click(startButtons[0])
    expect(await screen.findByText(/de 3 concluídos/)).toBeInTheDocument()

    // Exactly one active session exists.
    await waitFor(async () => expect(await db.sessions.count()).toBe(1))

    // Go back Home — the started day now shows "Continuar".
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument()

    // CHANGED: tapping another day used to drop the user into the Dia 1 runner.
    // Dia 2's button is now drawn and announced as disabled, and answers the tap
    // with the reason instead of a navigation nobody asked for. Either way, no
    // second session is created — that is what this test is really about.
    const others = await screen.findAllByRole('button', { name: 'Iniciar' })
    await waitFor(() => expect(others[0]).toHaveAttribute('aria-disabled', 'true'))
    await user.click(others[0])
    expect(await screen.findByText(/treino em andamento/i)).toBeInTheDocument()
    expect(screen.queryByText(/de 3 concluídos/)).not.toBeInTheDocument()
    expect(await db.sessions.count()).toBe(1)
  })
})

describe('Finish-workout prompt at the end of the stepper', () => {
  /** Start Dia 1 and open the first exercise's detail. */
  async function startAndOpenFirst(user: ReturnType<typeof userEvent.setup>) {
    await user.click((await screen.findAllByRole('button', { name: 'Iniciar' }))[0])
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))
  }

  it('offers to finish after the last exercise and completes on confirm', async () => {
    await seedDia1()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await startAndOpenFirst(user)
    // Concluir through all three exercises in order.
    await user.click(await screen.findByRole('button', { name: 'Concluir' })) // Supino → Crucifixo
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir' })) // Crucifixo → Tríceps Corda
    expect(await screen.findByRole('heading', { name: 'Tríceps Corda', level: 1 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir' })) // last → prompt

    // The finish prompt appears; confirming completes the session → its summary.
    expect(await screen.findByText('Todos os exercícios concluídos!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
    // Same destination whichever screen finished the workout.
    expect(await screen.findByRole('heading', { name: 'Sessão' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Compartilhar$/ })).toBeInTheDocument()
    await waitFor(async () => expect((await db.sessions.toArray())[0]?.status).toBe('completed'))
  })

  it('returns to the runner when the finish prompt is declined', async () => {
    await seedDia1()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await startAndOpenFirst(user)
    await user.click(await screen.findByRole('button', { name: 'Concluir' }))
    await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Concluir' }))
    await screen.findByRole('heading', { name: 'Tríceps Corda', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Concluir' }))

    // Decline → back on the runner, session still in progress.
    expect(await screen.findByText('Todos os exercícios concluídos!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByRole('heading', { name: 'Treino em andamento' })).toBeInTheDocument()
    await waitFor(async () => expect((await db.sessions.toArray())[0]?.status).toBe('active'))
  })

  it('does not prompt when the last exercise is completed but some were skipped', async () => {
    await seedDia1()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await startAndOpenFirst(user)
    // Skip Supino (Avançar without marking), then Concluir the remaining two.
    await user.click(await screen.findByRole('button', { name: 'Próximo exercício' }))
    await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Concluir' })) // → Tríceps Corda
    await screen.findByRole('heading', { name: 'Tríceps Corda', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Concluir' })) // last, but Supino skipped

    // No prompt; runner shown, session still active.
    expect(await screen.findByRole('heading', { name: 'Treino em andamento' })).toBeInTheDocument()
    expect(screen.queryByText('Todos os exercícios concluídos!')).not.toBeInTheDocument()
    await waitFor(async () => expect((await db.sessions.toArray())[0]?.status).toBe('active'))
  })

})

describe('Session duration', () => {
  it('runs a clock while the session is open, and hands over to the summary once completed', async () => {
    const gymId = await createGym('Academia A', db)
    const startedAt = Date.now() - 754_000 // 12 min 34 s ago
    // Seeded straight into Dexie rather than started through the UI: the point
    // of the test is a session that began BEFORE this mount.
    const sessionId = (await db.sessions.add({
      gymId,
      kind: 'strength',
      dayName: 'Dia 1',
      startedAt,
      status: 'active',
    })) as number
    await db.sessionEntries.add({ sessionId, exerciseName: 'Supino Reto', done: false })

    render(
      <MemoryRouter initialEntries={[`/session/${sessionId}`]}>
        <App />
      </MemoryRouter>,
    )

    // Counted from `startedAt`, so reloading mid-workout does not restart it.
    expect(await screen.findByText('00:12:34')).toBeInTheDocument()
    expect(screen.getByText(/Duração:/)).toBeInTheDocument()

    await db.sessions.update(sessionId, { status: 'completed', completedAt: startedAt + 754_000 })

    // Completed: the running clock stops being shown and the fixed, rounded
    // duration in the summary takes over — one duration on screen, never two.
    await waitFor(() => expect(screen.queryByText(/Duração:/)).toBeNull())
    expect(screen.getByText(/13 min/)).toBeInTheDocument()
  })
})
