import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { ACCENTS, DEFAULT_ACCENT } from '../../state/accents'
import { FONT_SCALE_DEFAULT, useSettings } from '../../state/settings'
import { useOnboarding } from '../../state/onboarding'

const ROOT_PROPS = ['--font-scale', '--accent', '--accent-2', '--accent-rgb']
const clearRoot = () => ROOT_PROPS.forEach((p) => document.documentElement.style.removeProperty(p))
const rootVar = (p: string) => document.documentElement.style.getPropertyValue(p)
const swatch = (name: string) =>
  within(screen.getByRole('group', { name: 'Cor de destaque' })).getByRole('button', { name })

beforeEach(() => {
  localStorage.clear()
  useSettings.getState().reset()
  // Not the focus of this test — skip the first-launch sample-data prompt.
  useOnboarding.getState().markPromptSeen()
  clearRoot()
})
afterEach(() => {
  cleanup()
  clearRoot()
})

describe('Appearance font-size setting', () => {
  it('changes the scale live, persists it, and resets to default', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings/appearance']}>
        <App />
      </MemoryRouter>,
    )

    // App effect applies the default on mount.
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe(
        String(FONT_SCALE_DEFAULT),
      ),
    )
    expect(screen.getByText(pctLabel(FONT_SCALE_DEFAULT))).toBeInTheDocument()

    // Move the slider to 180% → live-applies to the root and persists.
    const slider = screen.getByLabelText('Tamanho da fonte')
    fireChange(slider, '1.8')
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.8'),
    )
    expect(screen.getByText('180%')).toBeInTheDocument()
    expect(useSettings.getState().fontScale).toBe(1.8)
    expect(JSON.parse(localStorage.getItem('myonegym.settings')!).state.fontScale).toBe(1.8)

    // Reset → back to the default.
    await user.click(screen.getByRole('button', { name: /Restaurar padrão/ }))
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe(
        String(FONT_SCALE_DEFAULT),
      ),
    )
    expect(screen.getByText(pctLabel(FONT_SCALE_DEFAULT))).toBeInTheDocument()
  })
})

describe('Appearance accent colour', () => {
  it('offers every colour, applies the chosen one live, and persists it', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings/appearance']}>
        <App />
      </MemoryRouter>,
    )

    // The default paints on mount, and its swatch is the pressed one.
    await waitFor(() => expect(rootVar('--accent')).toBe(DEFAULT_ACCENT.accent))
    for (const a of ACCENTS) expect(swatch(a.name)).toBeInTheDocument()
    expect(swatch(DEFAULT_ACCENT.name)).toHaveAttribute('aria-pressed', 'true')

    const blue = ACCENTS.find((a) => a.id === 'blue')!
    await user.click(swatch(blue.name))

    // All three properties move together — the rest of the palette derives.
    await waitFor(() => expect(rootVar('--accent')).toBe(blue.accent))
    expect(rootVar('--accent-2')).toBe(blue.accent2)
    expect(rootVar('--accent-rgb')).toBe(blue.rgb)
    expect(swatch(blue.name)).toHaveAttribute('aria-pressed', 'true')
    expect(swatch(DEFAULT_ACCENT.name)).toHaveAttribute('aria-pressed', 'false')
    expect(useSettings.getState().accent).toBe('blue')
    expect(JSON.parse(localStorage.getItem('myonegym.settings')!).state.accent).toBe('blue')
  })

  it('restores the default colour along with the font size', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings/appearance']}>
        <App />
      </MemoryRouter>,
    )

    const green = ACCENTS.find((a) => a.id === 'green')!
    await screen.findByRole('group', { name: 'Cor de destaque' })
    await user.click(swatch(green.name))
    await waitFor(() => expect(rootVar('--accent')).toBe(green.accent))

    await user.click(screen.getByRole('button', { name: /Restaurar padrão/ }))
    await waitFor(() => expect(rootVar('--accent')).toBe(DEFAULT_ACCENT.accent))
    expect(rootVar('--accent-rgb')).toBe(DEFAULT_ACCENT.rgb)
    expect(rootVar('--accent-2')).toBe(DEFAULT_ACCENT.accent2)
    expect(useSettings.getState().accent).toBe(DEFAULT_ACCENT.id)
  })

  it('applies a stored colour on the first paint of a later visit', async () => {
    // What the user sees after closing and reopening the app: the store
    // rehydrates before render, so nothing ever paints in the old colour.
    useSettings.getState().setAccent('purple')
    const purple = ACCENTS.find((a) => a.id === 'purple')!

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await waitFor(() => expect(rootVar('--accent')).toBe(purple.accent))
    expect(rootVar('--accent-rgb')).toBe(purple.rgb)
  })
})

/** The label the page shows for a scale. Derived rather than hardcoded so that
 *  changing FONT_SCALE_DEFAULT does not silently strand this assertion. */
function pctLabel(scale: number) {
  return `${Math.round(scale * 100)}%`
}

/** Fire a controlled range-input change (userEvent doesn't drag sliders). */
function fireChange(el: HTMLElement, value: string) {
  const input = el as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
