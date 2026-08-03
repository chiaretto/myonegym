import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { createCategory, createDay, createExercise, listCategories, listDays } from '../db/repos'
import { ALL_SECTIONS, type CatalogProposal, type SectionSelection } from '../data/catalogPayload'
import type { TurnResult } from '../lib/geminiClient'
import { useAssistantChat } from './assistantChat'
import { useAssistantToken } from './assistantToken'

// The network is the only thing stubbed: everything below this line — history
// bookkeeping, the tool-result handshake, the apply — is the real code.
vi.mock('../lib/geminiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/geminiClient')>()
  return { ...actual, runTurn: vi.fn() }
})
const { runTurn } = await import('../lib/geminiClient')
const mockedTurn = vi.mocked(runTurn)

let peito: number
let supino: number
let dia1: number

beforeEach(async () => {
  for (const table of [db.categories, db.exercises, db.days]) await table.clear()
  peito = await createCategory('Peito', db)
  supino = await createExercise({ name: 'Supino Reto', categoryIds: [peito] }, db)
  dia1 = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)

  useAssistantChat.getState().reset()
  useAssistantToken.getState().setToken('AIzaTeste')
  mockedTurn.mockReset()
})

/** A proposal that renames the category and adds a day — two sections to pick from. */
function twoSectionProposal(): CatalogProposal {
  return {
    summary: 'Renomeei a categoria e criei o Dia 2.',
    categories: [{ ref: 'c1', id: peito, name: 'Peitoral' }],
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

const textTurn = (text: string): TurnResult => ({ kind: 'text', text })
const proposalTurn = (proposal: CatalogProposal): TurnResult => ({
  kind: 'proposal',
  callId: 'call_1',
  proposal,
  text: 'Fiz assim:',
})

const send = (text: string) => useAssistantChat.getState().send(text)

/** The parts of the last content handed to the API — where the handshake shows. */
type Parts = { text?: string; functionResponse?: { name: string; response: Record<string, unknown> } }[]
const lastParts = () => mockedTurn.mock.calls.at(-1)![0].contents.at(-1)!.parts as Parts

describe('conversation', () => {
  it('renders a text turn as a message, with no decision to make', async () => {
    mockedTurn.mockResolvedValue(textTurn('Quantos dias por semana você treina?'))

    await send('monta um treino melhor pra mim')

    const { entries, pending } = useAssistantChat.getState()
    expect(entries.map((e) => e.kind)).toEqual(['user', 'assistant'])
    expect(pending).toBeNull()
    expect(useAssistantChat.getState().canSend()).toBe(true)
  })

  it('renders a tool turn as a proposal and blocks the next message', async () => {
    mockedTurn.mockResolvedValue(proposalTurn(twoSectionProposal()))

    await send('redistribui e já gera')

    const { entries, pending } = useAssistantChat.getState()
    expect(entries.at(-1)!.kind).toBe('proposal')
    expect(pending).toBe(entries.at(-1)!.id)
    expect(useAssistantChat.getState().canSend()).toBe(false)

    // A second message is refused while the proposal is undecided.
    await send('outra coisa')
    expect(useAssistantChat.getState().entries.filter((e) => e.kind === 'user')).toHaveLength(1)
  })

  it('does not send without a token', async () => {
    useAssistantToken.getState().clear()
    expect(useAssistantChat.getState().canSend()).toBe(false)

    await send('oi')
    expect(mockedTurn).not.toHaveBeenCalled()
  })

  it('carries the catalog on the first turn and does not re-read it later', async () => {
    mockedTurn.mockResolvedValue(textTurn('ok'))
    await send('primeira')
    await createExercise({ name: 'Adicionado Depois' }, db)
    await send('segunda')

    const [first, second] = mockedTurn.mock.calls.map((c) => c[0].catalog)
    expect(first.exercises.map((e) => e.name)).toEqual(['Supino Reto'])
    expect(second).toEqual(first)
  })
})

describe('failures', () => {
  it('shows the failure and leaves the conversation usable', async () => {
    mockedTurn.mockRejectedValueOnce(
      Object.assign(new Error('Sem conexão.'), { name: 'AssistantError' }),
    )
    await send('oi')

    expect(useAssistantChat.getState().entries.at(-1)!.kind).toBe('error')
    expect(useAssistantChat.getState().canSend()).toBe(true)

    // ...and a retry works, without the failed turn polluting the history.
    mockedTurn.mockResolvedValue(textTurn('pronto'))
    await send('de novo')
    const roles = mockedTurn.mock.calls.at(-1)![0].contents.map((c) => c.role)
    expect(roles).toEqual(['user'])
  })

  it('changes nothing in the catalog when a turn fails', async () => {
    mockedTurn.mockRejectedValue(new Error('falhou'))
    await send('oi')

    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Peito'])
    expect(await db.days.count()).toBe(1)
  })
})

describe('deciding a proposal', () => {
  const only = (...s: (keyof SectionSelection)[]): SectionSelection => ({
    categories: s.includes('categories'),
    exercises: s.includes('exercises'),
    days: s.includes('days'),
  })

  async function proposeAndGetId() {
    mockedTurn.mockResolvedValue(proposalTurn(twoSectionProposal()))
    await send('ajusta pra mim')
    return useAssistantChat.getState().entries.at(-1)!.id
  }

  it('rejecting writes nothing and reopens the conversation', async () => {
    const id = await proposeAndGetId()
    useAssistantChat.getState().reject(id)

    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Peito'])
    expect(await db.days.count()).toBe(1)
    expect(useAssistantChat.getState().pending).toBeNull()
    expect(useAssistantChat.getState().canSend()).toBe(true)
  })

  it('sends the rejection back with the follow-up message', async () => {
    const id = await proposeAndGetId()
    useAssistantChat.getState().reject(id)

    mockedTurn.mockResolvedValue(textTurn('ajustado'))
    await send('mantém o dia 1 como está')

    const parts = lastParts()
    // Gemini wants the function answered first, then the user's own words — both
    // in the same user content.
    expect(parts[0].functionResponse?.name).toBe('propor_catalogo')
    expect(parts[0].functionResponse?.response.resultado).toBe('recusado')
    expect(parts[1]).toEqual({ text: 'mantém o dia 1 como está' })
  })

  it('accepting everything applies it and records the decision', async () => {
    const id = await proposeAndGetId()
    await useAssistantChat.getState().accept(id, ALL_SECTIONS)

    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Peitoral'])
    expect((await listDays(db)).map((x) => x.name)).toEqual(['Dia 1', 'Dia 2'])

    const entry = useAssistantChat.getState().entries.find((e) => e.id === id)!
    expect(entry.kind === 'proposal' && entry.decision).toMatchObject({ accepted: true, skipped: [] })
    expect(useAssistantChat.getState().pending).toBeNull()
  })

  it('accepting part of it leaves the rest alone and says so to the assistant', async () => {
    const id = await proposeAndGetId()
    await useAssistantChat.getState().accept(id, only('categories'))

    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Peitoral'])
    expect(await db.days.count()).toBe(1) // Dia 2 was not created

    mockedTurn.mockResolvedValue(textTurn('ok'))
    await send('e agora?')
    const payload = lastParts()[0].functionResponse!.response
    expect(payload.aplicado).toEqual(['categories'])
    expect(payload.nao_aplicado).toEqual(['exercises', 'days'])
  })

  it('reports the ids new entities received, so a follow-up builds on them', async () => {
    const id = await proposeAndGetId()
    await useAssistantChat.getState().accept(id, ALL_SECTIONS)

    mockedTurn.mockResolvedValue(textTurn('ok'))
    await send('e agora?')
    const { catalogo_atual } = lastParts()[0].functionResponse!.response as {
      catalogo_atual: { days: { id: number; name: string }[] }
    }
    const dia2 = catalogo_atual.days.find((x) => x.name === 'Dia 2')!
    expect(dia2.id).toBeGreaterThan(0)
  })

  it('cannot decide the same proposal twice', async () => {
    const id = await proposeAndGetId()
    await useAssistantChat.getState().accept(id, ALL_SECTIONS)
    useAssistantChat.getState().reject(id)

    const entry = useAssistantChat.getState().entries.find((e) => e.id === id)!
    expect(entry.kind === 'proposal' && entry.decision!.accepted).toBe(true)
  })

  it('keeps the proposal pending when applying fails', async () => {
    mockedTurn.mockResolvedValue(
      proposalTurn({ ...twoSectionProposal(), categories: [{ ref: 'c1', id: 9999, name: 'X' }] }),
    )
    await send('ajusta')
    const id = useAssistantChat.getState().entries.at(-1)!.id

    await useAssistantChat.getState().accept(id, ALL_SECTIONS)

    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Peito'])
    expect(useAssistantChat.getState().entries.at(-1)!.kind).toBe('error')
    const entry = useAssistantChat.getState().entries.find((e) => e.id === id)!
    expect(entry.kind === 'proposal' && entry.decision).toBeNull()
  })
})
