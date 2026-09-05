import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, listDays } from '../../db/repos'
import type { CatalogProposal } from '../../data/catalogPayload'
import {
  reportedProposal,
  seedReportedCatalog,
  type SeededCatalog,
} from '../../data/__fixtures__/noisyProposal'
import type { TurnResult } from '../../lib/geminiClient'
import { useAssistantChat } from '../../state/assistantChat'
import { useAssistantToken } from '../../state/assistantToken'
import { useOnboarding } from '../../state/onboarding'

// Only the network is stubbed — the screen, the store and the apply are real.
vi.mock('../../lib/geminiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/geminiClient')>()
  return { ...actual, runTurn: vi.fn() }
})
const { runTurn } = await import('../../lib/geminiClient')
const mockedTurn = vi.mocked(runTurn)

let peitoral: number
let supino: number
let dia1: number

beforeEach(async () => {
  localStorage.clear()
  useOnboarding.getState().markPromptSeen()
  useAssistantChat.getState().reset()
  useAssistantToken.getState().clear()
  mockedTurn.mockReset()

  peitoral = await createCategory('Peitoral', db)
  supino = await createExercise({ name: 'Supino Reto', categoryIds: [peitoral] }, db)
  dia1 = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
})

afterEach(async () => {
  cleanup()
  await Promise.all([db.categories, db.exercises, db.days].map((t) => t.clear()))
})

function proposal(): CatalogProposal {
  return {
    summary: 'Renomeei a categoria e criei o Dia 2.',
    categories: [{ ref: 'c1', id: peitoral, name: 'Peitoral' }],
    exercises: [
      {
        ref: 'e1',
        id: supino,
        name: 'Supino Reto',
        mediaUrl: null,
        categoryRefs: ['c1'],
        alternativeRefs: [],
      },
    ],
    days: [
      { ref: 'd1', id: dia1, name: 'Dia 1', exerciseRefs: ['e1'] },
      { ref: 'd2', id: null, name: 'Dia 2', exerciseRefs: ['e1'] },
    ],
  }
}

const asText = (text: string): TurnResult => ({ kind: 'text', text })
const asProposal = (p: CatalogProposal = proposal()): TurnResult => ({
  kind: 'proposal',
  callId: 'call_1',
  proposal: p,
  text: '',
  callPart: {
    functionCall: { id: 'call_1', name: 'propor_catalogo', args: p },
    thoughtSignature: 'EjQKMgERTTIPQd2VNoR',
  },
})

function open(path = '/settings/assistant') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const withToken = () => useAssistantToken.getState().setToken('AIzaTeste')

async function ask(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(await screen.findByPlaceholderText('O que você quer ajustar?'), text)
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
}

describe('token gate', () => {
  it('explains what is missing and offers no way to send', async () => {
    open()

    expect(await screen.findByLabelText('Chave')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument()
    expect(screen.getByText(/fica/i)).toHaveTextContent(/neste navegador/i)
  })

  it('saving a token opens the conversation', async () => {
    const user = userEvent.setup()
    open()

    await user.type(await screen.findByLabelText('Chave'), 'AIzaTeste')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('button', { name: 'Enviar' })).toBeInTheDocument()
  })
})

describe('conversation', () => {
  it('renders a question as a message, with nothing to decide', async () => {
    withToken()
    mockedTurn.mockResolvedValue(asText('Quantos dias por semana você treina?'))
    const user = userEvent.setup()
    open()

    await ask(user, 'monta um treino melhor')

    expect(await screen.findByText('Quantos dias por semana você treina?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument()
  })

  it('shows a failure without touching the catalog, and stays usable', async () => {
    withToken()
    mockedTurn.mockRejectedValue(new Error('caiu'))
    const user = userEvent.setup()
    open()

    await ask(user, 'oi')

    expect(await screen.findByText(/Falha inesperada|não consegui/i)).toBeInTheDocument()
    expect((await db.categories.toArray()).map((c) => c.name)).toEqual(['Peitoral'])

    // Usable means the thread accepts another try — the send button waits for
    // text, as it always does, rather than staying locked by the failure.
    const composer = screen.getByPlaceholderText('O que você quer ajustar?')
    expect(composer).toBeEnabled()
    await user.type(composer, 'de novo')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })

  it('survives leaving the screen and coming back', async () => {
    withToken()
    mockedTurn.mockResolvedValue(asText('Oi! Como posso ajudar?'))
    const user = userEvent.setup()
    open()

    await ask(user, 'bom dia')
    expect(await screen.findByText('Oi! Como posso ajudar?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    await user.click(await screen.findByText('Assistente (IA)'))

    expect(await screen.findByText('Oi! Como posso ajudar?')).toBeInTheDocument()
  })
})

describe('deciding a proposal', () => {
  async function propose() {
    withToken()
    mockedTurn.mockResolvedValue(asProposal())
    const user = userEvent.setup()
    open()
    await ask(user, 'ajusta e já gera')
    await screen.findByText('Renomeei a categoria e criei o Dia 2.')
    return user
  }

  it('shows the proposal without writing anything, and blocks the next message', async () => {
    const user = await propose()

    expect((await db.categories.toArray()).map((c) => c.name)).toEqual(['Peitoral'])
    expect(await db.days.count()).toBe(1)
    expect(screen.getByPlaceholderText('Decida a proposta acima primeiro')).toBeDisabled()
    expect(user).toBeDefined()
  })

  it('rejecting leaves the data alone and gives the composer back', async () => {
    const user = await propose()

    await user.click(screen.getByRole('button', { name: 'Rejeitar' }))

    expect((await db.categories.toArray()).map((c) => c.name)).toEqual(['Peitoral'])
    expect(await screen.findByText(/Recusado/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByPlaceholderText('O que você quer ajustar?')).toBeEnabled(),
    )
  })

  it('accepting everything applies it and shows what landed', async () => {
    const user = await propose()

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    await waitFor(async () =>
      expect((await db.categories.toArray()).map((c) => c.name)).toEqual(['Peitoral']),
    )
    expect((await listDays(db)).map((x) => x.name)).toEqual(['Dia 1', 'Dia 2'])
    expect(await screen.findByText(/Aplicado:/)).toBeInTheDocument()
  })

  it('unselecting a section applies only the rest', async () => {
    const user = await propose()

    // "Dias de treino" here only adds a day built from an existing exercise, so
    // nothing depends on it and it can be dropped on its own.
    await user.click(screen.getByRole('checkbox', { name: /Dias de treino/ }))
    await user.click(screen.getByRole('button', { name: /Aplicar 2 de 3/ }))

    await waitFor(async () =>
      expect((await db.categories.toArray()).map((c) => c.name)).toEqual(['Peitoral']),
    )
    expect(await db.days.count()).toBe(1) // Dia 2 never created
    expect(await screen.findByText(/fora: Dias de treino/)).toBeInTheDocument()
  })

  it('locks a section another selected one depends on, and says why', async () => {
    withToken()
    // The new day places an exercise this same proposal creates — so the days
    // cannot be applied without the exercises.
    const p = proposal()
    p.exercises.push({
      ref: 'novo',
      id: null,
      name: 'Crucifixo',
      mediaUrl: null,
      categoryRefs: ['c1'],
      alternativeRefs: [],
    })
    p.days[1].exerciseRefs = ['novo']
    mockedTurn.mockResolvedValue(asProposal(p))

    const user = userEvent.setup()
    open()
    await ask(user, 'gera')
    await screen.findByText('Renomeei a categoria e criei o Dia 2.')

    const exercises = screen.getByRole('checkbox', { name: /Exercícios/ })
    expect(exercises).toBeDisabled()
    expect(screen.getByText(/Necessária: outra parte selecionada/)).toBeInTheDocument()

    // Dropping the dependent unlocks it.
    await user.click(screen.getByRole('checkbox', { name: /Dias de treino/ }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Exercícios/ })).toBeEnabled())
  })

  it('cannot be decided twice', async () => {
    const user = await propose()
    await user.click(screen.getByRole('button', { name: 'Aceitar' }))
    await screen.findByText(/Aplicado:/)

    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument()
  })
})

describe('the proposal from the bug report', () => {
  let seeded: SeededCatalog

  beforeEach(async () => {
    for (const table of [db.categories, db.exercises, db.days]) await table.clear()
    seeded = await seedReportedCatalog(db)
  })

  async function propose() {
    withToken()
    mockedTurn.mockResolvedValue(asProposal(reportedProposal(seeded)))
    const user = userEvent.setup()
    open()
    await ask(user, 'Pode apagar.')
    await screen.findByText(/Reorganizei seus treinos/)
    return user
  }

  it('says what it repaired, before there is anything to decide', async () => {
    await propose()

    expect(await screen.findByText('Ajustes na proposta')).toBeInTheDocument()
    expect(screen.getByText(/fica sem imagem/)).toHaveTextContent('HIIT (Esteira ou Bike)')
    expect(screen.getByText(/fica sem a categoria/)).toHaveTextContent('Aeróbico')
    // Still a decision, not a report of something already done.
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeEnabled()
  })

  it('applies from the screen, where before it could only fail', async () => {
    const user = await propose()

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    await waitFor(async () => expect((await listDays(db)).length).toBe(3))
    expect(await db.categories.count()).toBe(6)
    expect(await db.exercises.count()).toBe(18)
    expect(await screen.findByText(/Aplicado:/)).toBeInTheDocument()
    expect(screen.queryByText('Não consegui aplicar a proposta.')).not.toBeInTheDocument()
  })

  it('shows no repair section for a proposal that needed none', async () => {
    withToken()
    mockedTurn.mockResolvedValue(asText('Quantos dias você treina?'))
    const user = userEvent.setup()
    open()
    await ask(user, 'oi')

    await screen.findByText('Quantos dias você treina?')
    expect(screen.queryByText('Ajustes na proposta')).not.toBeInTheDocument()
  })
})
