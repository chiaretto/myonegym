import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/**
 * The day card's header is one tap target.
 *
 * Only the day name and the chevron used to toggle the accordion; the avatar,
 * the categories and the padding around them looked like part of the same
 * control and did nothing. On a phone the difference between hitting the name
 * and missing it by three pixels is invisible, and the miss reads as the app
 * having frozen.
 *
 * These tests click the regions that used to be dead, plus the two things that
 * must NOT toggle: the Iniciar pill inside the header, and the exercise list
 * below it.
 */

afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  await createGym('Academia A', undefined, db)
  const cat = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryIds: [cat] }, db)
  await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

/** The card's header — the box every one of these taps lands somewhere inside. */
async function head() {
  const title = await screen.findByText('Dia 1')
  const el = title.closest('.day-head')
  if (!el) throw new Error('.day-head not found — the card markup changed')
  return el as HTMLElement
}

const isExpanded = () => screen.queryByText('Supino Reto') != null

describe('Day card header is one tap target', () => {
  it('expands when the categories are tapped', async () => {
    await seed()
    const user = userEvent.setup()
    renderHome()

    const sub = (await head()).querySelector('.day-sub')
    expect(sub).not.toBeNull()
    expect(isExpanded()).toBe(false)

    await user.click(sub as Element)

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
  })

  it('expands when the muscle avatar is tapped', async () => {
    await seed()
    const user = userEvent.setup()
    renderHome()

    const avatar = (await head()).querySelector('.day-ic')
    expect(avatar).not.toBeNull()

    await user.click(avatar as Element)

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
  })

  it('expands when the header itself is tapped, away from any child', async () => {
    // The padding: it belongs to the head and to nothing inside it, so this is
    // the one region no child element can account for.
    await seed()
    const user = userEvent.setup()
    renderHome()

    await user.click(await head())

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
  })

  it('still expands and collapses from the chevron, which is no longer a button', async () => {
    await seed()
    const user = userEvent.setup()
    renderHome()

    const chev = (await head()).querySelector('.day-chev')
    expect(chev).not.toBeNull()
    // It moved out of .day-actions and up to the name's line.
    expect((await head()).querySelector('.day-actions .day-chev')).toBeNull()
    expect(chev!.closest('button')).toBe(screen.getByRole('button', { name: 'Dia 1' }))

    await user.click(chev as Element)
    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()

    await user.click(chev as Element)
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('starts the workout without expanding the day', async () => {
    // The costliest regression this change could introduce: the header swallows
    // the pill's tap, or the pill's tap leaks into the header and does both.
    await seed()
    const user = userEvent.setup()
    renderHome()
    await head()

    await user.click(screen.getByRole('button', { name: 'Iniciar' }))

    // Landed in the session screen, so Home — and its accordion — is gone. Had
    // the tap also toggled the header, the day would have expanded on the way
    // out; there is no Home left to expand.
    expect(await screen.findByRole('button', { name: /Concluir treino/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar' })).not.toBeInTheDocument()
    expect(document.querySelector('.day-head')).toBeNull()
  })

  it('does not collapse the day when its exercise list is tapped', async () => {
    // The tap target stops at the header. If it covered the whole card, opening
    // an exercise would also throw away the state the user just opened.
    await seed()
    const user = userEvent.setup()
    renderHome()

    await user.click(await head())
    const exercise = await screen.findByText('Supino Reto')

    await user.click(exercise)

    // Left Home for the exercise detail, rather than collapsing in place.
    expect(screen.queryByRole('button', { name: 'Iniciar' })).not.toBeInTheDocument()
  })

  it('exposes exactly two controls per day', async () => {
    // Before, the chevron was a third button saying the same thing as the
    // first — a redundant stop for every day, on every keyboard pass.
    await seed()
    const user = userEvent.setup()
    renderHome()
    const box = await head()

    expect(box.querySelectorAll('button')).toHaveLength(2)

    const toggle = screen.getByRole('button', { name: 'Dia 1' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
