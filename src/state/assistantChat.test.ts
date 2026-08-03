import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import {
  createCategory,
  createDay,
  createExercise,
  listCategories,
  listDays,
  listExercises,
} from '../db/repos'
import {
  reportedProposal,
  seedReportedCatalog,
  type SeededCatalog,
} from '../data/__fixtures__/noisyProposal'
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
/** As the API hands it over: the part carries the call *and* its signature. */
const proposalTurn = (proposal: CatalogProposal): TurnResult => ({
  kind: 'proposal',
  callId: 'call_1',
  proposal,
  text: 'Fiz assim:',
  callPart: {
    functionCall: { id: 'call_1', name: 'propor_catalogo', args: proposal },
    thoughtSignature: 'EjQKMgERTTIPQd2VNoR',
  },
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

  it('keeps the signature in the history after a rejection, which is when it is read', async () => {
    const id = await proposeAndGetId()
    useAssistantChat.getState().reject(id)

    mockedTurn.mockResolvedValue(textTurn('ajustado'))
    await send('remover dia 1')

    // The turn that used to come back as a 400: the model content sent along
    // with the follow-up still carries the signature of the call it answers.
    const sent = mockedTurn.mock.calls.at(-1)![0].contents
    const model = sent.find((c) => c.role === 'model' && (c.parts as { functionCall?: unknown }[]).some((p) => p.functionCall))!
    const part = (model.parts as { thoughtSignature?: string }[]).at(-1)!
    expect(part.thoughtSignature).toBe('EjQKMgERTTIPQd2VNoR')
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

/* ------------------------------------------------------- the reported bug */

describe('the conversation from the bug report', () => {
  let seeded: SeededCatalog

  beforeEach(async () => {
    for (const table of [db.categories, db.exercises, db.days]) await table.clear()
    seeded = await seedReportedCatalog(db)
    useAssistantChat.getState().reset()
  })

  async function propose() {
    mockedTurn.mockResolvedValue(proposalTurn(reportedProposal(seeded)))
    await send('Pode apagar.')
    const entry = useAssistantChat.getState().entries.at(-1)!
    if (entry.kind !== 'proposal') throw new Error(`esperava uma proposta, veio ${entry.kind}`)
    return entry
  }

  it('turns the noisy proposal into a decidable card, saying what it repaired', async () => {
    const entry = await propose()

    expect(entry.repairs.map((r) => r.kind)).toEqual(['media-cleared', 'category-unlinked'])
    expect(entry.repairs.every((r) => r.text.includes('HIIT (Esteira ou Bike)'))).toBe(true)
    expect(entry.repairs[1].text).toContain('Cardio')
  })

  it('applies it, and the catalog ends up as the card promised', async () => {
    const entry = await propose()
    const { impact } = entry

    await useAssistantChat.getState().accept(entry.id, ALL_SECTIONS)

    // No error entry: the whole point of the change.
    expect(useAssistantChat.getState().entries.some((e) => e.kind === 'error')).toBe(false)

    const cats = await listCategories(db)
    const exercises = await listExercises(db)
    const days = await listDays(db)
    expect(cats).toHaveLength(6)
    expect(exercises).toHaveLength(18)
    expect(days.map((x) => x.name)).toEqual([
      'Dia A - Superior (Peito, Ombros e Tríceps)',
      'Dia B - Costas e Bíceps',
      'Dia C - Core, Cardio e Ombros',
    ])

    // What the card promised to remove is what disappeared.
    expect(impact.exercises.removed).toBe(9)
    expect(impact.categories.removed).toBe(2)
    expect(impact.days.removed).toBe(3)
    expect(impact.exercises.removedNames).toContain('Encolhimento para Trapézio (Halteres)')
  })

  it('leaves the repaired exercise without image and without the dropped category', async () => {
    const entry = await propose()
    await useAssistantChat.getState().accept(entry.id, ALL_SECTIONS)

    const hiit = (await listExercises(db)).find((e) => e.name.startsWith('HIIT'))!
    expect(hiit.mediaUrl).toBeUndefined()
    expect(hiit.categoryIds).toEqual([])
  })

  it('keeps every image that was valid', async () => {
    const entry = await propose()
    await useAssistantChat.getState().accept(entry.id, ALL_SECTIONS)

    const supino = (await listExercises(db)).find((e) => e.name === 'Supino Reto com Barra')!
    expect(supino.mediaUrl).toBe(
      'https://www.mundoboaforma.com.br/wp-content/uploads/2020/12/supino-reto.gif',
    )
    // The one whose url carries a query string — the case that looks broken and is not.
    const triceps = (await listExercises(db)).find((e) => e.name.startsWith('Tríceps Pulley'))!
    expect(triceps.mediaUrl).toContain('?resize=675%2C811&ssl=1')
  })

  it("echoes the model's own part into the history, signature and all", async () => {
    await propose()

    // Gemini 3 refuses a history whose functionCall part lost its
    // thoughtSignature — which is every turn after a rejected proposal.
    const model = useAssistantChat.getState().contents.at(-1)!
    const part = (model.parts as { functionCall?: unknown; thoughtSignature?: string }[]).find(
      (p) => p.functionCall,
    )!
    expect(part.thoughtSignature).toBe('EjQKMgERTTIPQd2VNoR')

    // Verbatim: the arguments are the model's, not the repaired copy. The card
    // and the apply use the repaired one; the model is told what really
    // happened through the function response.
    const args = (part.functionCall as { args: CatalogProposal }).args
    const hiit = args.exercises.find((e) => e.name.startsWith('HIIT'))!
    expect(hiit.mediaUrl).toBe('null')
    expect(hiit.categoryRefs).toEqual([String(seeded.categories[6])])
  })
})
