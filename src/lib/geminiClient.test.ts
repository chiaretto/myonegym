import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CatalogSnapshot } from '../data/catalogPayload'
import { AssistantError, runTurn } from './geminiClient'

/**
 * The SDK is stubbed at the module boundary — `runTurn` imports it dynamically,
 * so the mock has to stand in for the whole client. What is under test is what
 * the function makes of the stream it is handed.
 */
const generateContentStream = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContentStream }
  },
  FunctionCallingConfigMode: { VALIDATED: 'VALIDATED' },
}))

const CATALOG: CatalogSnapshot = { categories: [], exercises: [], days: [] }

/**
 * An async iterable over the chunks, the way the SDK yields them.
 *
 * Chunks that carry a call expose it **both** ways the real response object
 * does — the `functionCalls` shortcut and the parts it was derived from. That
 * duplication is the point: the shortcut is what the client used to read, and
 * it silently drops the `thoughtSignature`, so a mock offering only the parts
 * would make the fix look tested when it was merely unreachable.
 */
function stream(chunks: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
}

const call = {
  id: 'call_1',
  name: 'propor_catalogo',
  args: { summary: 'ok', categories: [], exercises: [], days: [] },
}

const run = () => runTurn({ apiKey: 'AIzaTeste', catalog: CATALOG, contents: [] })

beforeEach(() => {
  generateContentStream.mockReset()
})

describe('reading a turn off the stream', () => {
  it('keeps the thought signature that sits beside the function call', async () => {
    generateContentStream.mockResolvedValue(
      stream([
        {
          functionCalls: [call],
          candidates: [
            { content: { parts: [{ functionCall: call, thoughtSignature: 'EjQKMgER' }] } },
          ],
        },
      ]),
    )

    const result = await run()

    expect(result.kind).toBe('proposal')
    // The part itself, not a copy assembled from the call: the signature is a
    // sibling of `functionCall` and the API wants the pair back together.
    expect(result.kind === 'proposal' && result.callPart).toEqual({
      functionCall: call,
      thoughtSignature: 'EjQKMgER',
    })
  })

  it('still works when there is no signature at all', async () => {
    generateContentStream.mockResolvedValue(
      stream([
        { functionCalls: [call], candidates: [{ content: { parts: [{ functionCall: call }] } }] },
      ]),
    )

    const result = await run()

    expect(result.kind === 'proposal' && result.callId).toBe('call_1')
  })

  it('collects streamed text and reports a plain answer as text', async () => {
    const chunks: string[] = []
    generateContentStream.mockResolvedValue(
      stream([
        { text: 'Quantos dias ', candidates: [{ content: { parts: [{ text: 'Quantos dias ' }] } }] },
        { text: 'você treina?', candidates: [{ content: { parts: [{ text: 'você treina?' }] } }] },
      ]),
    )

    const result = await runTurn({
      apiKey: 'AIzaTeste',
      catalog: CATALOG,
      contents: [],
      onText: (c) => chunks.push(c),
    })

    expect(result).toEqual({ kind: 'text', text: 'Quantos dias você treina?' })
    expect(chunks).toEqual(['Quantos dias ', 'você treina?'])
  })

  it('takes the first call when a turn somehow carries two', async () => {
    const second = { ...call, id: 'call_2' }
    generateContentStream.mockResolvedValue(
      stream([
        {
          functionCalls: [call],
          candidates: [{ content: { parts: [{ functionCall: call, thoughtSignature: 'a' }] } }],
        },
        {
          functionCalls: [second],
          candidates: [{ content: { parts: [{ functionCall: second, thoughtSignature: 'b' }] } }],
        },
      ]),
    )

    const result = await run()

    expect(result.kind === 'proposal' && result.callId).toBe('call_1')
  })

  it('refuses a turn that was cut short', async () => {
    generateContentStream.mockResolvedValue(
      stream([
        {
          functionCalls: [call],
          candidates: [
            { content: { parts: [{ functionCall: call }] }, finishReason: 'MAX_TOKENS' },
          ],
        },
      ]),
    )

    await expect(run()).rejects.toThrow(AssistantError)
  })
})
