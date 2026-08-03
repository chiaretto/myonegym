import {
  PROPOSE_TOOL_NAME,
  PROPOSE_TOOL_SCHEMA,
  type CatalogProposal,
  type CatalogSnapshot,
} from '../data/catalogContract'
import { MODEL } from './geminiModel'
import { systemPrompt } from './geminiPrompt'

/** A failure worth showing the user, already phrased in Portuguese. */
export class AssistantError extends Error {}

/**
 * One turn of the conversation, as the API returned it.
 *
 * The two shapes are the whole point of declaring the proposal as a *function*:
 * a text turn is the assistant talking (asking what it needs, confirming), a
 * function call is a proposal. Nothing has to guess which one happened.
 */
export type TurnResult =
  | { kind: 'text'; text: string }
  | { kind: 'proposal'; callId: string; proposal: CatalogProposal; text: string }

/**
 * Conversation history in Gemini's own shape: `role` is `user` or **`model`**
 * (not `assistant`), and every turn is a list of parts — text, a `functionCall`,
 * or a `functionResponse`. Opaque to the rest of the app.
 */
export type ApiContent = { role: 'user' | 'model'; parts: unknown[] }

export { MODEL } from './geminiModel'

/**
 * A hard ceiling, not a target — it costs nothing unless used. Generous because
 * a proposal echoes the entire catalog back, and a truncated function call is a
 * failed turn rather than a smaller one.
 */
const MAX_OUTPUT_TOKENS = 32_768

const SYSTEM_PROMPT = systemPrompt(PROPOSE_TOOL_NAME)

/* ------------------------------------------------------------ error mapping */

/** Shape of the SDK's HTTP errors, read structurally so tests need no SDK. */
type MaybeApiError = { status?: number; message?: string; name?: string }

/**
 * Turn whatever went wrong into something the user can act on.
 *
 * Branches on `status` where there is one, and otherwise on the message: the
 * SDK is dynamically imported, so its error classes are not in scope at module
 * level, and a plain object is enough to drive this in a test.
 */
function describeFailure(err: unknown): AssistantError {
  if (err instanceof AssistantError) return err

  const e = (err ?? {}) as MaybeApiError
  const message = e.message ?? ''
  const status = e.status ?? Number(/\b(4\d\d|5\d\d)\b/.exec(message)?.[1] ?? Number.NaN)

  if (!status || Number.isNaN(status)) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return new AssistantError('Sem conexão. O assistente precisa de internet para responder.')
    }
    return new AssistantError(
      'Não consegui falar com o Gemini. Verifique sua conexão e tente de novo.',
    )
  }

  switch (status) {
    case 400:
      // Google answers 400 both for a malformed request and for a bad key, so
      // the message is what separates "your key is wrong" from "your ask is".
      if (/api[_ ]?key/i.test(message)) {
        return new AssistantError(
          'A chave foi recusada. Confira a chave salva em Configurações → Assistente.',
        )
      }
      return new AssistantError(`O Gemini recusou o pedido: ${message || 'requisição inválida'}`)
    case 401:
    case 403:
      return new AssistantError(
        'A chave foi recusada ou não tem permissão para a API do Gemini. Confira em Configurações → Assistente.',
      )
    case 404:
      return new AssistantError(
        `O modelo ${MODEL} não está disponível para esta chave. Verifique o acesso na sua conta Google AI.`,
      )
    case 429:
      return new AssistantError('Limite de uso da API atingido. Espere um pouco e tente de novo.')
    default:
      if (status >= 500) {
        return new AssistantError('O serviço do Gemini está indisponível agora. Tente de novo.')
      }
      return new AssistantError(message || 'Falha ao falar com o Gemini.')
  }
}

/* -------------------------------------------------------------------- turn */

export interface RunTurnInput {
  apiKey: string
  /** The catalog, established once as the stable prefix of every turn. */
  catalog: CatalogSnapshot
  contents: ApiContent[]
  /** Called with each chunk of assistant text as it arrives. */
  onText?: (chunk: string) => void
}

/**
 * Run one turn against the Gemini API.
 *
 * The SDK is imported **dynamically** so it lands in its own chunk: the initial
 * bundle is the part that has to work offline, and it must not grow for a
 * screen most users never open.
 */
export async function runTurn(input: RunTurnInput): Promise<TurnResult> {
  // The enum comes along on the dynamic import rather than a static one: a
  // top-level `import { FunctionCallingConfigMode }` is a value import, which
  // would put the whole SDK back in the initial bundle.
  const { GoogleGenAI, FunctionCallingConfigMode } = await import('@google/genai')

  // There is no backend to hide the key behind; the screen says so plainly.
  const ai = new GoogleGenAI({ apiKey: input.apiKey })

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: input.contents as Parameters<typeof ai.models.generateContentStream>[0]['contents'],
      config: {
        // Prompt *and* catalog go here. The system instruction is the same bytes
        // on every turn of the conversation, which is exactly the prefix Gemini's
        // implicit caching keys on — there is no breakpoint to place, unlike a
        // provider with an explicit cache marker. `cachedContentTokenCount` in
        // the usage metadata is how we tell whether it took.
        systemInstruction: `${SYSTEM_PROMPT}\n\n# Catálogo atual (JSON)\n\n${JSON.stringify(input.catalog)}`,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        tools: [
          {
            functionDeclarations: [
              {
                name: PROPOSE_TOOL_NAME,
                description:
                  'Propor o catálogo completo depois da mudança. Use somente quando for propor; para conversar, responda em texto.',
                parameters: PROPOSE_TOOL_SCHEMA,
              },
            ],
          },
        ],
        toolConfig: {
          // The closest thing Gemini offers to a strict mode: the model may
          // still answer in text, but a call it does make is checked against
          // the schema. The real gate is still `validateProposal`.
          functionCallingConfig: { mode: FunctionCallingConfigMode.VALIDATED },
        },
      },
    })

    let text = ''
    let call: { id?: string; name?: string; args?: unknown } | undefined
    let truncated = false

    for await (const chunk of stream) {
      const piece = chunk.text
      if (piece) {
        text += piece
        input.onText?.(piece)
      }
      // Only the first call is kept: one proposal per turn is all the screen can
      // render a decision for.
      call ??= chunk.functionCalls?.[0]
      if (chunk.candidates?.[0]?.finishReason === 'MAX_TOKENS') truncated = true
    }

    // A cut-off turn is a failure, never a smaller success: applying half a
    // catalog is exactly the outcome the accept/reject gate exists to prevent.
    if (truncated) {
      throw new AssistantError(
        'O catálogo é grande demais para uma resposta só. Tente pedir uma mudança mais específica.',
      )
    }

    if (call?.name === PROPOSE_TOOL_NAME && call.args) {
      return {
        kind: 'proposal',
        // Gemini matches a function response by name and only sometimes carries
        // an id, so the name is the dependable half and stands in as fallback.
        callId: call.id ?? PROPOSE_TOOL_NAME,
        proposal: call.args as CatalogProposal,
        text: text.trim(),
      }
    }
    return { kind: 'text', text: text.trim() }
  } catch (err) {
    throw describeFailure(err)
  }
}
