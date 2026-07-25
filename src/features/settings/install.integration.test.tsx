import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { initInstall, useInstall, type BeforeInstallPromptEvent } from '../../lib/install'
import { useOnboarding } from '../../state/onboarding'

let teardown: () => void

function makePromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
  Object.assign(event, {
    platforms: ['web'],
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
  return event
}

function renderInstallPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/install']}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  // Not the focus of these tests — skip the first-launch sample-data prompt.
  useOnboarding.getState().markPromptSeen()
  teardown = initInstall()
})

afterEach(() => {
  cleanup()
  teardown()
})

describe('Settings → Instalar app', () => {
  it('offers the button only once the browser has offered the install', async () => {
    renderInstallPage()

    expect(await screen.findByRole('heading', { name: 'Instalar app' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Instalar app/ })).not.toBeInTheDocument()

    // The browser fires this while the page is already mounted — the whole
    // point of parking the event is that the screen picks it up afterwards.
    act(() => {
      window.dispatchEvent(makePromptEvent())
    })

    expect(await screen.findByRole('button', { name: /Instalar app/ })).toBeInTheDocument()
  })

  it('opens the native dialog and confirms the install', async () => {
    const user = userEvent.setup()
    const event = makePromptEvent('accepted')
    window.dispatchEvent(event)
    renderInstallPage()

    await user.click(await screen.findByRole('button', { name: /Instalar app/ }))

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(await screen.findByText('App instalado.')).toBeInTheDocument()
    // The screen must stop offering an install it can no longer perform.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Instalar app/ })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('App instalado')).toBeInTheDocument()
  })

  it('reports a dismissed dialog without claiming the app was installed', async () => {
    const user = userEvent.setup()
    window.dispatchEvent(makePromptEvent('dismissed'))
    renderInstallPage()

    await user.click(await screen.findByRole('button', { name: /Instalar app/ }))

    expect(await screen.findByText('Instalação cancelada.')).toBeInTheDocument()
    expect(screen.queryByText('App instalado')).not.toBeInTheDocument()
  })

  it('shows the Share → Adicionar à Tela de Início steps on iOS, and no button', async () => {
    useInstall.setState({ platform: 'ios' })
    renderInstallPage()

    expect(await screen.findByText(/Como instalar no iPhone/)).toBeInTheDocument()
    expect(screen.getByText('Compartilhar')).toBeInTheDocument()
    expect(screen.getByText('Adicionar à Tela de Início')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Instalar app/ })).not.toBeInTheDocument()
  })

  it('confirms the state instead of offering an install when already installed', async () => {
    useInstall.setState({ isInstalled: true, canInstall: true, platform: 'android' })
    renderInstallPage()

    expect(await screen.findByText('App instalado')).toBeInTheDocument()
    // canInstall is deliberately true here: a stale event must never win over
    // the app already being installed.
    expect(screen.queryByRole('button', { name: /Instalar app/ })).not.toBeInTheDocument()
  })

  it('explains the limitation on a browser that cannot install', async () => {
    useInstall.setState({ platform: 'other' })
    renderInstallPage()

    expect(await screen.findByText(/Este navegador não oferece instalação/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Instalar app/ })).not.toBeInTheDocument()
  })

  it('points Android at the browser menu when no prompt has arrived yet', async () => {
    useInstall.setState({ platform: 'android' })
    renderInstallPage()

    expect(await screen.findByText(/ainda não ofereceu a instalação/)).toBeInTheDocument()
  })

  it('is reachable from the Settings list, which reflects the state', async () => {
    const user = userEvent.setup()
    window.dispatchEvent(makePromptEvent())
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    const row = await screen.findByRole('link', { name: /Instalar app/ })
    expect(row).toHaveTextContent('Adicione o MyOneGym à tela inicial')

    await user.click(row)
    expect(await screen.findByRole('heading', { name: 'Instalar app' })).toBeInTheDocument()
  })
})
