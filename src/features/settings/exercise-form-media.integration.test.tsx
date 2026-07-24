import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createExercise } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory, db.sessions, db.sessionEntries].map(
      (t) => t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

const PREVIEW = 'Pré-visualização da mídia'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('Exercise form — media preview', () => {
  it('shows the placeholder before a URL is typed, in the same slot', async () => {
    renderAt('/settings/exercises/new')

    // Always rendered, so the fields below don't shift once a URL is typed.
    const preview = await screen.findByRole('img', { name: PREVIEW })
    expect(preview).toHaveClass('media-fallback', 'hero-media')
  })

  it('previews a typed URL large (hero), not as a thumbnail', async () => {
    const user = renderAt('/settings/exercises/new')

    await user.type(await screen.findByLabelText('URL da imagem ou GIF (opcional)'), 'https://x.test/rosca.gif')

    await waitFor(() => {
      const preview = screen.getByRole('img', { name: PREVIEW })
      expect(preview.tagName).toBe('IMG')
      // Same class the detail screen uses — full width, natural proportions.
      expect(preview).toHaveClass('hero-media')
      expect(preview).not.toHaveClass('thumb')
      expect(preview).toHaveAttribute('src', 'https://x.test/rosca.gif')
    })
  })

  it('previews the saved media when editing an exercise', async () => {
    const id = await createExercise({ name: 'Rosca Direta', mediaUrl: 'https://x.test/rosca.png' }, db)

    renderAt(`/settings/exercises/${id}/edit`)

    const preview = await screen.findByRole('img', { name: PREVIEW })
    expect(preview).toHaveClass('hero-media')
    expect(preview).toHaveAttribute('src', 'https://x.test/rosca.png')
  })
})
