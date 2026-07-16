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
  const gym = await createGym('Academia A', undefined, db)
  const peito = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryId: peito }, db)
  const crucifixo = await createExercise({ name: 'Crucifixo', categoryId: peito }, db)
  const corda = await createExercise({ name: 'Tríceps Corda', categoryId: peito }, db)
  await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo, corda] }, db)
  await createDay({ name: 'Dia 2', exerciseIds: [crucifixo, corda] }, db)
  await saveWeight(gym, supino, 40, 'KG', db)
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

    // Mark the first exercise done (1/3 → 33%).
    await user.click(screen.getByRole('button', { name: /Supino Reto/ }))
    await waitFor(() => expect(screen.getByText('33%')).toBeInTheDocument())

    // Complete → lands on the history page with the session listed.
    await user.click(screen.getByRole('button', { name: /Concluir treino/ }))
    // "Sessões" is both the page heading and the new bottom tab — target the heading.
    expect(await screen.findByRole('heading', { name: 'Sessões' })).toBeInTheDocument()
    expect(await screen.findByText('1/3')).toBeInTheDocument()

    // Open the session detail (read-only) then delete it.
    await user.click(screen.getByText('Dia 1'))
    const del = await screen.findByRole('button', { name: 'Excluir sessão' })
    await user.click(del)
    // Confirm in the sheet.
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    // Back to history, now empty.
    expect(await screen.findByText('Nenhuma sessão ainda')).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 2 })).toBeInTheDocument()
    await waitFor(async () =>
      expect((await db.sessionEntries.toArray()).find((e) => e.exerciseName === 'Supino Reto')?.done).toBe(true),
    )

    // Voltar back to Supino → it now shows the distinct "Concluído" done state + chip.
    await user.click(screen.getByRole('button', { name: 'Exercício anterior' }))
    expect(await screen.findByRole('heading', { name: 'Supino Reto', level: 2 })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 2 })).toBeInTheDocument()
    expect((await db.sessionEntries.toArray()).every((e) => !e.done)).toBe(true)

    // Voltar back to Supino, then Concluir (marks + advances).
    await user.click(screen.getByRole('button', { name: 'Exercício anterior' }))
    expect(await screen.findByRole('heading', { name: 'Supino Reto', level: 2 })).toBeInTheDocument()
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

    // Starting another day just resumes; no second session is created.
    const others = await screen.findAllByRole('button', { name: 'Iniciar' })
    await user.click(others[0])
    await screen.findByText(/de 3 concluídos/)
    expect(await db.sessions.count()).toBe(1)
  })
})
