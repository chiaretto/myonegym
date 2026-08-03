import { create } from 'zustand'
import { db } from '../db/db'
import { catalogSnapshot, type CatalogProposal, type CatalogSnapshot, type SectionSelection } from '../data/catalogPayload'
import {
  ProposalError,
  applyCatalogProposal,
  proposalImpact,
  type ProposalImpact,
} from '../data/catalogProposal'
import { PROPOSE_TOOL_NAME } from '../data/catalogContract'
import { repairProposal, type Repair } from '../data/proposalRepair'
import { AssistantError, runTurn, type ApiContent } from '../lib/geminiClient'
import { useAssistantToken } from './assistantToken'

export interface Decision {
  accepted: boolean
  applied: string[]
  skipped: string[]
}

export type ChatEntry =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | {
      kind: 'proposal'
      id: string
      callId: string
      /** Already repaired — this is the proposal the card decides on. */
      proposal: CatalogProposal
      repairs: Repair[]
      impact: ProposalImpact
      decision: Decision | null
    }
  | { kind: 'error'; id: string; text: string }

let seq = 0
const nextId = () => `e${seq++}`

interface AssistantChatState {
  entries: ChatEntry[]
  /** History in the API's shape — the conversation as the model sees it. */
  contents: ApiContent[]
  /**
   * The catalog as it was when the conversation started, frozen.
   *
   * Frozen on purpose: it is the stable prefix the prompt cache keys on, so
   * re-reading it every turn would pay for it in full every time. It stays true
   * because a decision on a proposal sends the resulting catalog back as the
   * tool result — the model's picture is updated by the conversation, not by a
   * re-send.
   */
  catalog: CatalogSnapshot | null
  status: 'idle' | 'working'
  /** Entry id of the proposal awaiting a decision. Blocks sending while set. */
  pending: string | null
  /**
   * A decided proposal's function response, waiting for a ride.
   *
   * The API needs the function answered before the conversation can go on, but
   * the user has not necessarily said anything yet — so it is held here and
   * flushed with their next message. Deciding therefore costs no API turn of
   * its own.
   */
  functionResponse: Record<string, unknown> | null

  canSend: () => boolean
  send: (text: string, onChunk?: (text: string) => void) => Promise<void>
  accept: (entryId: string, selection: SectionSelection) => Promise<void>
  reject: (entryId: string) => void
  reset: () => void
}

export const useAssistantChat = create<AssistantChatState>()((set, get) => ({
  entries: [],
  contents: [],
  catalog: null,
  status: 'idle',
  pending: null,
  functionResponse: null,

  canSend: () => {
    const s = get()
    return s.status === 'idle' && s.pending === null && useAssistantToken.getState().token.length > 0
  },

  send: async (text, onChunk) => {
    const trimmed = text.trim()
    if (!trimmed || !get().canSend()) return

    // Captured on the first turn only — see `catalog` above.
    const catalog = get().catalog ?? (await catalogSnapshot(db))

    // A decided proposal's result rides along with this message: Gemini wants
    // the function answered before anything else in the turn, and both parts
    // belong to the same user content.
    const held = get().functionResponse
    const parts: unknown[] = held
      ? [
          { functionResponse: { name: PROPOSE_TOOL_NAME, response: held } },
          { text: trimmed },
        ]
      : [{ text: trimmed }]

    const contents: ApiContent[] = [...get().contents, { role: 'user', parts }]

    set((s) => ({
      catalog,
      status: 'working',
      functionResponse: null,
      contents,
      entries: [...s.entries, { kind: 'user', id: nextId(), text: trimmed }],
    }))

    try {
      const result = await runTurn({
        apiKey: useAssistantToken.getState().token,
        catalog,
        contents,
        onText: onChunk,
      })

      if (result.kind === 'text') {
        set((s) => ({
          status: 'idle',
          contents: [...s.contents, { role: 'model', parts: [{ text: result.text }] }],
          entries: [...s.entries, { kind: 'assistant', id: nextId(), text: result.text }],
        }))
        return
      }

      // Read once, against the catalog as it stands **now** rather than the
      // frozen one: both the repair and the impact have to be about the catalog
      // the apply will meet, or the card promises something else.
      const current = await catalogSnapshot(db)
      // Repaired before anything else looks at it: the impact, the card and the
      // history all have to be about the proposal that would actually be
      // applied, not the one that came off the wire.
      const { proposal, repairs } = repairProposal(current, result.proposal)
      const impact = proposalImpact(current, proposal)
      const id = nextId()
      // The model's part goes back exactly as it came, thought signature and
      // original arguments included — see `TurnResult.callPart`. The repaired
      // proposal is what the card decides on and what gets applied; the model
      // hears about the result through the function response, not through an
      // edited copy of its own turn.
      const parts: unknown[] = [
        ...(result.text ? [{ text: result.text }] : []),
        result.callPart,
      ]
      set((s) => ({
        status: 'idle',
        pending: id,
        contents: [...s.contents, { role: 'model', parts }],
        entries: [
          ...s.entries,
          {
            kind: 'proposal',
            id,
            callId: result.callId,
            proposal,
            repairs,
            impact,
            decision: null,
          },
        ],
      }))
    } catch (err) {
      const message =
        err instanceof AssistantError ? err.message : 'Falha inesperada ao falar com o Gemini.'
      // The failed turn is dropped from the API history: replaying a user
      // message the model never answered would make the retry look like two
      // separate asks.
      set((s) => ({
        status: 'idle',
        contents: contents.slice(0, -1),
        entries: [...s.entries, { kind: 'error', id: nextId(), text: message }],
      }))
    }
  },

  accept: async (entryId, selection) => {
    const entry = get().entries.find((e) => e.id === entryId)
    if (!entry || entry.kind !== 'proposal' || entry.decision) return

    try {
      const outcome = await applyCatalogProposal(entry.proposal, selection, db)
      set((s) => ({
        pending: null,
        functionResponse: {
          resultado: 'aplicado',
          aplicado: outcome.applied,
          // Spelled out so a follow-up cannot assume the skipped parts landed.
          nao_aplicado: outcome.skipped,
          catalogo_atual: outcome.catalog,
        },
        entries: s.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                decision: { accepted: true, applied: outcome.applied, skipped: outcome.skipped },
              }
            : e,
        ),
      }))
    } catch (err) {
      // Nothing was written (the apply is transactional), so the proposal stays
      // pending and the user can adjust the selection and try again.
      //
      // The apply promises a ProposalError with the cause in it; the fallback is
      // for a failure that never reached it at all, and still says what it was —
      // a message the user cannot act on is a dead end, not a report.
      const message =
        err instanceof ProposalError
          ? err.message
          : `Não consegui aplicar a proposta: ${err instanceof Error ? err.message : String(err)}`
      set((s) => ({
        entries: [...s.entries, { kind: 'error', id: nextId(), text: message }],
      }))
    }
  },

  reject: (entryId) => {
    const entry = get().entries.find((e) => e.id === entryId)
    if (!entry || entry.kind !== 'proposal' || entry.decision) return

    set((s) => ({
      pending: null,
      functionResponse: {
        resultado: 'recusado',
        observacao:
          'O usuário recusou. A próxima mensagem dele diz o que ajustar; trate como ajuste do que já foi combinado, não como pedido novo.',
      },
      entries: s.entries.map((e) =>
        e.id === entryId
          ? { ...e, decision: { accepted: false, applied: [], skipped: [] } }
          : e,
      ),
    }))
  },

  reset: () =>
    set({
      entries: [],
      contents: [],
      catalog: null,
      status: 'idle',
      pending: null,
      functionResponse: null,
    }),
}))
