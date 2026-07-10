import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { FONT_SCALE_DEFAULT, useSettings } from '../../state/settings'

beforeEach(() => {
  localStorage.clear()
  useSettings.getState().reset()
  document.documentElement.style.removeProperty('--font-scale')
})
afterEach(() => {
  cleanup()
  document.documentElement.style.removeProperty('--font-scale')
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
    expect(screen.getByText('150%')).toBeInTheDocument()

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
    expect(screen.getByText('150%')).toBeInTheDocument()
  })
})

/** Fire a controlled range-input change (userEvent doesn't drag sliders). */
function fireChange(el: HTMLElement, value: string) {
  const input = el as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
