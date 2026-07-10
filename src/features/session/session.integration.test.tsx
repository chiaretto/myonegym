import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { generateExample } from '../../data/portability'
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

describe('Workout session end-to-end', () => {
  it('starts from a day, completes, appears in history, and deletes', async () => {
    await generateExample(db) // creates days + gym "Minha Academia"
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

  it('opens an entry detail, marks done and edits the used weight there', async () => {
    await generateExample(db) // Supino Reto seeded at 40 KG in the demo gym
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click((await screen.findAllByRole('button', { name: 'Iniciar' }))[0])

    // Tap the row (link) to open the exercise detail.
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))
    expect(await screen.findByText('Peso usado')).toBeInTheDocument()

    // Mark done from the detail.
    await user.click(screen.getByRole('button', { name: /Marcar como concluído/ }))
    expect(await screen.findByRole('button', { name: 'Concluído' })).toBeInTheDocument()

    // Edit the used weight here (40 → 42.5) — updates only the entry.
    await user.click(screen.getByRole('button', { name: /Editar/ }))
    const input = screen.getByLabelText('Peso usado')
    await user.clear(input)
    await user.type(input, '42.5')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () => {
      const entries = await db.sessionEntries.toArray()
      const supino = entries.find((e) => e.exerciseName === 'Supino Reto')!
      expect(supino.usedValue).toBe(42.5)
      expect(supino.done).toBe(true)
    })
    // The exercise's target weight is unchanged (still 40 KG).
    const supinoEx = (await db.exercises.toArray()).find((e) => e.name === 'Supino Reto')!
    const w = await db.weights.where('exerciseId').equals(supinoEx.id!).first()
    expect(w?.value).toBe(40)

    // Back to the runner: progress reflects the done entry.
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByText(/de 3 concluídos/)).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('prevents a second active session and resumes instead', async () => {
    await generateExample(db)
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
