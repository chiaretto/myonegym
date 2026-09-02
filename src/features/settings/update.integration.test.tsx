import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { buildInfo, initAppUpdate } from '../../lib/appUpdate'
import {
  fakeRegistration,
  resetPwaRegister,
  setFakeRegistration,
  type FakeUpdateOutcome,
} from '../../test/pwaRegister'
import { useOnboarding } from '../../state/onboarding'

let teardown: (() => void) | undefined

/** Registers a service worker whose `update()` behaves as asked, then boots the
 *  module the way main.tsx does. Without this the app is on the "no service
 *  worker" branch, which is the honest default under jsdom. */
function withWorker(outcome: FakeUpdateOutcome = 'none') {
  setFakeRegistration(fakeRegistration(outcome))
  teardown = initAppUpdate()
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  // Not what these tests are about — skip the first-launch sample-data prompt.
  useOnboarding.getState().markPromptSeen()
})

afterEach(() => {
  cleanup()
  teardown?.()
  teardown = undefined
  resetPwaRegister()
})

describe('Settings → Atualizar app', () => {
  it('is reachable from Settings, and the row already says the version', async () => {
    withWorker()
    renderAt('/settings')

    const row = await screen.findByRole('link', { name: /Atualizar app/ })
    expect(row).toHaveAttribute('href', '/settings/update')
    expect(row).toHaveTextContent(`Versão ${buildInfo.version}`)
  })

  it('says which version is running, and when it was built', async () => {
    withWorker()
    renderAt('/settings/update')

    expect(await screen.findByText(`Versão ${buildInfo.version}`)).toBeInTheDocument()
    // The stamp is pinned by vitest.config.ts, so only the formatting can vary.
    expect(screen.getByText(/^Build de \d{2}\/\d{2}\/2026 \d{2}:\d{2}$/)).toBeInTheDocument()
  })

  it('reports that the app is already current', async () => {
    withWorker('none')
    renderAt('/settings/update')

    await userEvent.click(await screen.findByRole('button', { name: /Procurar atualização/ }))

    expect(await screen.findByText('Você já está na versão mais recente')).toBeInTheDocument()
    expect(screen.getByText(/Última verificação às \d{2}:\d{2}/)).toBeInTheDocument()
  })

  it('reports a new version being applied', async () => {
    withWorker('found')
    renderAt('/settings/update')

    await userEvent.click(await screen.findByRole('button', { name: /Procurar atualização/ }))

    expect(await screen.findByText('Nova versão encontrada')).toBeInTheDocument()
    expect(screen.getByText(/o app vai recarregar sozinho/)).toBeInTheDocument()
  })

  it('reports a failed check instead of pretending it checked', async () => {
    withWorker('fail')
    renderAt('/settings/update')

    await userEvent.click(await screen.findByRole('button', { name: /Procurar atualização/ }))

    expect(await screen.findByText('Não foi possível verificar')).toBeInTheDocument()
    expect(screen.queryByText(/Última verificação/)).not.toBeInTheDocument()
  })

  it('offers no button where there is no service worker to ask', async () => {
    // No withWorker(): registration never reports one, as in a plain http page.
    renderAt('/settings/update')

    expect(await screen.findByText(`Versão ${buildInfo.version}`)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Procurar atualização/ })).not.toBeInTheDocument()
    expect(screen.getByText(/não registrou o service worker/)).toBeInTheDocument()
  })
})
