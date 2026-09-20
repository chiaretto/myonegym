import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { officialExercises } from '../../data/officialCatalog'
import { db } from '../../db/db'
import {
  createExercise,
  createGym,
  listCardioExercises,
  listHiddenCardioIds,
  setCardioHidden,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  useOnboarding.getState().markPromptSeen()
})
afterEach(async () => {
  cleanup()
  await Promise.all([db.gyms, db.exercises, db.hiddenCardio].map((t) => t.clear()))
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  const escada = await createExercise({ name: 'Escada do prédio', kind: 'cardio' }, db)
  await createExercise({ name: 'Supino' }, db)
  return { escada }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const toggleOf = (name: string) =>
  screen.findByRole('switch', { name: `Mostrar ${name} na aba Cardio` })

describe('Settings → Cardio', () => {
  it('is reached from Cadastros, which counts what the tab shows', async () => {
    const { escada } = await seed()
    await setCardioHidden(escada, true, db)
    const total = (await listCardioExercises(db)).length
    const user = userEvent.setup()
    renderAt('/settings')

    const row = await screen.findByRole('link', { name: /Escolha o que aparece na aba Cardio/ })
    await waitFor(() => expect(within(row).getByText(String(total - 1))).toBeInTheDocument())
    await user.click(row)
    expect(await screen.findByRole('heading', { name: 'Cardio' })).toBeInTheDocument()
  })

  it('lists every cardio exercise, hidden or not, and no strength', async () => {
    const { escada } = await seed()
    await setCardioHidden(escada, true, db)
    renderAt('/settings/cardio')

    expect(await toggleOf('Escada do prédio')).toHaveAttribute('aria-checked', 'false')
    const official = officialExercises().find((e) => e.kind === 'cardio')!
    expect(await toggleOf(official.name)).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('Supino')).not.toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength((await listCardioExercises(db)).length)
  })

  it('saves on the tap, for a user exercise and an official one alike', async () => {
    const { escada } = await seed()
    const official = officialExercises().find((e) => e.kind === 'cardio')!
    const user = userEvent.setup()
    renderAt('/settings/cardio')

    await user.click(await toggleOf('Escada do prédio'))
    await user.click(await toggleOf(official.name))
    await waitFor(async () =>
      expect((await listHiddenCardioIds(db)).sort()).toEqual([escada, official.id!].sort()),
    )
    expect(await toggleOf('Escada do prédio')).toHaveAttribute('aria-checked', 'false')

    // No save button to forget: leaving and coming back finds it as left.
    cleanup()
    renderAt('/cardio')
    expect(await screen.findByText(/2 ocultos/)).toBeInTheDocument()
    expect(screen.queryByText('Escada do prédio')).not.toBeInTheDocument()
    expect(screen.queryByText(official.name)).not.toBeInTheDocument()
  })

  it('brings an exercise back', async () => {
    const { escada } = await seed()
    await setCardioHidden(escada, true, db)
    const user = userEvent.setup()
    renderAt('/settings/cardio')

    await user.click(await toggleOf('Escada do prédio'))
    await waitFor(async () => expect(await listHiddenCardioIds(db)).toEqual([]))
    expect(await toggleOf('Escada do prédio')).toHaveAttribute('aria-checked', 'true')
  })

  it('goes back to Configurações', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/settings/cardio')
    await user.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
  })
})
