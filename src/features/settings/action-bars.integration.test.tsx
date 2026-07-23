import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboarding.getState().markPromptSeen()
})
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
      db.exerciseNotes,
      db.exercisePhotos,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

/** The button must be inside .action-bar and NOT inside the scrolling <main>. */
async function expectFloating(buttonName: RegExp | string) {
  const btn = await screen.findByRole('button', { name: buttonName })
  const bar = btn.closest('.action-bar')
  expect(bar, 'button is inside .action-bar').not.toBeNull()
  expect(bar!.closest('main.screen'), 'the bar is NOT inside the scrolling main').toBeNull()
  expect(document.querySelector('main.screen')).toHaveClass('has-action-bar')
  return btn
}

describe('Floating action bars on the create-screens', () => {
  const cases: [string, string | RegExp][] = [
    ['/settings/gyms', 'Nova academia'],
    ['/settings/categories', 'Nova categoria'],
    ['/settings/exercises', 'Novo exercício'],
    ['/settings/days', 'Novo dia'],
  ]

  for (const [path, label] of cases) {
    it(`${path}: "${label}" is in a fixed bar and navigates to the create page`, async () => {
      const user = userEvent.setup()
      renderAt(path)
      const btn = await expectFloating(label)
      await user.click(btn)
      // The create form is now a PAGE (heading), not a modal dialog.
      expect(await screen.findByRole('heading', { name: label, level: 1 })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      // Its Salvar/Cancelar are in the fixed action bar.
      expect(document.querySelector('.action-bar')?.textContent).toMatch(/Salvar/)
    })
  }
})

describe('Floating action bar on the session runner', () => {
  async function seedRunner() {
    const gym = await createGym('Academia A', undefined, db)
    useActiveGym.setState({ activeGymId: gym })
    const ex = await createExercise({ name: 'Supino' }, db)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
    const sid = await startSession(gym, day, db)
    return { sid }
  }

  it('floats "Concluir treino", disabled until an exercise is marked', async () => {
    const { sid } = await seedRunner()
    const user = userEvent.setup()
    renderAt(`/session/${sid}`)

    const btn = await expectFloating('Concluir treino')
    expect(btn).toBeDisabled()
    expect(screen.getByText(/Marque ao menos um exercício/)).toBeInTheDocument()

    // Mark the one exercise done → the bar's button enables.
    await user.click(screen.getByRole('button', { name: /Supino/ }))
    expect(await screen.findByRole('button', { name: 'Concluir treino' })).toBeEnabled()
  })

  it('shows no action bar on a completed session (share buttons stay in the body)', async () => {
    const { sid } = await seedRunner()
    await import('../../db/repos').then(async (r) => {
      await r.setEntryDone((await listSessionEntries(sid, db))[0].id!, true, db)
      await r.completeSession(sid, db)
    })
    renderAt(`/session/${sid}`)

    // Completed view: share button present, in the body, no action bar.
    expect(await screen.findByRole('button', { name: /^Compartilhar$/ })).toBeInTheDocument()
    expect(document.querySelector('.action-bar')).toBeNull()
    expect(document.querySelector('main.screen')).not.toHaveClass('has-action-bar')
  })
})
