/**
 * Spike: check the real Gemini API against the contract this app assumes.
 *
 * Covers the tasks that cannot be answered with a mock (see
 * `openspec/changes/add-ai-catalog-assistant/tasks.md`):
 *
 *   0.2  the `propor_catalogo` function declaration is accepted, and a
 *        realistic catalog fits well inside `maxOutputTokens`
 *   0.3  streaming delivers text chunks, and the function call arrives whole
 *   2.4  the catalog prefix is actually cached — `cachedContentTokenCount > 0`
 *        from the second turn on
 *
 * It also prints the model ids the key can reach, because `MODEL` in
 * `src/lib/geminiClient.ts` was chosen without being able to confirm it.
 *
 * It imports the SAME schema the app ships (`src/data/catalogContract.ts`), so
 * a pass means the app's contract works, not that a copy of it does.
 *
 * Run it yourself — it costs real quota and is never part of `npm test`:
 *
 *   export GEMINI_API_KEY=AIza...
 *   node scripts/spike-gemini.mts
 *
 * Node 24 strips the types natively; no build step and no extra dependency.
 */
import { FunctionCallingConfigMode, GoogleGenAI, type Schema } from '@google/genai'
import {
  PROPOSE_TOOL_NAME,
  PROPOSE_TOOL_SCHEMA,
  type CatalogProposal,
  type CatalogSnapshot,
} from '../src/data/catalogContract.ts'
// The app's own model constant, not a copy. A spike that validates a different
// model than the app ships is worse than no spike: it reports a pass for
// something nobody runs.
import { MODEL as APP_MODEL } from '../src/lib/geminiModel.ts'
import { systemPrompt } from '../src/lib/geminiPrompt.ts'

const KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
if (!KEY) {
  console.error('Defina GEMINI_API_KEY (ou GOOGLE_API_KEY) antes de rodar.')
  process.exit(2)
}

const MODEL = process.env.GEMINI_MODEL ?? APP_MODEL
const MAX_OUTPUT_TOKENS = 32_768

/* ------------------------------------------------- a realistically big catalog */

const GROUPS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Core', 'Panturrilha']
const MOVES = ['Supino', 'Remada', 'Agachamento', 'Desenvolvimento', 'Rosca', 'Extensão', 'Prancha', 'Elevação']
const VARIANTS = ['Reto', 'Inclinado', 'Máquina', 'Halter', 'Cabo', 'Unilateral', 'Livre', 'Curvado']

/** 64 exercises across 8 categories and 5 days — the size 0.2 asks about. */
function bigCatalog(): CatalogSnapshot {
  const categories = GROUPS.map((name, i) => ({ id: i + 1, name }))
  const exercises: CatalogSnapshot['exercises'] = []
  let id = 1
  for (const move of MOVES) {
    for (const variant of VARIANTS) {
      exercises.push({
        id,
        name: `${move} ${variant}`,
        mediaUrl: id % 3 === 0 ? null : `https://example.com/img/${id}.png`,
        categoryIds: [((id - 1) % GROUPS.length) + 1],
        alternativeIds: [],
      })
      id++
    }
  }
  const perDay = Math.ceil(exercises.length / 5)
  const days = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `Dia ${i + 1}`,
    exerciseIds: exercises.slice(i * perDay, (i + 1) * perDay).map((e) => e.id),
  }))
  return { categories, exercises, days }
}

/* ------------------------------------------------------------------ request */

const ai = new GoogleGenAI({ apiKey: KEY })
const catalog = bigCatalog()

// The app's own system prompt, not a paraphrase: what this spike is really
// testing is whether the shipped instructions hold up, and the anti-deletion
// rule in particular lives there.
const SYSTEM = `${systemPrompt(PROPOSE_TOOL_NAME)}

# Catálogo atual (JSON)

${JSON.stringify(catalog)}`

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: PROPOSE_TOOL_NAME,
        description: 'Propor o catálogo completo depois da mudança.',
        parameters: PROPOSE_TOOL_SCHEMA as Schema,
      },
    ],
  },
]

type Content = { role: 'user' | 'model'; parts: unknown[] }

async function turn(label: string, contents: Content[], maxOutputTokens = MAX_OUTPUT_TOKENS) {
  let chunks = 0
  let text = ''
  let call: { name?: string; args?: unknown } | undefined
  let truncated = false
  let cached = 0
  let promptTokens = 0
  let outputTokens = 0

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: contents as never,
    config: {
      systemInstruction: SYSTEM,
      maxOutputTokens,
      tools: TOOLS,
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.VALIDATED } },
    },
  })

  for await (const chunk of stream) {
    if (chunk.text) {
      chunks++
      text += chunk.text
    }
    call ??= chunk.functionCalls?.[0]
    if (chunk.candidates?.[0]?.finishReason === 'MAX_TOKENS') truncated = true
    const u = chunk.usageMetadata
    if (u) {
      cached = u.cachedContentTokenCount ?? cached
      promptTokens = u.promptTokenCount ?? promptTokens
      outputTokens = u.candidatesTokenCount ?? outputTokens
    }
  }

  console.log(
    `  [${label}] prompt=${promptTokens} out=${outputTokens} cached=${cached} ` +
      `chunks=${chunks} truncated=${truncated}`,
  )
  return { text, call, truncated, cached }
}

/* -------------------------------------------------------------------- run */

const results: { name: string; ok: boolean; detail: string }[] = []
const check = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? '✅' : '❌'} ${name} — ${detail}`)
}

/**
 * Reported, but not counted against the verdict.
 *
 * For things the provider may or may not grant us and that cost nothing but
 * money when absent. Failing the run on one would mean a red spike for a
 * correct app, which trains everyone to ignore the spike.
 */
const note = (name: string, ok: boolean, detail: string) =>
  console.log(`  ${ok ? '✅' : 'ℹ️ '} ${name} — ${detail}`)

/**
 * A stack trace answers "where did it throw"; what this script needs to answer
 * is "whose problem is it" — the app's contract, the credential, or the quota.
 * Only the first of those is what the spike is for.
 */
function diagnose(err: unknown): never {
  const e = err as { status?: number; message?: string }
  const msg = e.message ?? String(err)
  console.log(`\n${'─'.repeat(60)}`)
  // Always show what the API actually said. A classified summary that hides the
  // original message turns a precise error into a guess — which is how a model
  // that IS in the list gets reported as "not found".
  console.log(`Erro cru da API:\n  ${msg}\n`)
  if (/api[_ ]?key/i.test(msg)) {
    console.log('❌ Chave recusada. Gere uma em aistudio.google.com e exporte em GEMINI_API_KEY.')
  } else if (/quota|rate|429|RESOURCE_EXHAUSTED/i.test(msg)) {
    console.log('❌ Limite de uso. O contrato do app NÃO foi invalidado — a requisição')
    console.log('   foi barrada por quota, não por formato. Tente de novo mais tarde.')
  } else if (/not found|404|NOT_FOUND/i.test(msg)) {
    console.log(`❌ Modelo "${MODEL}" indisponível para esta chave.`)
    console.log('   Veja a lista impressa acima e rode de novo com:')
    console.log('   GEMINI_MODEL=<id> node scripts/spike-gemini.mts')
  } else {
    console.log(`❌ ${msg}`)
  }
  process.exit(1)
}

// --- Which models does this key actually reach? ----------------------------
console.log('\nModelos disponíveis para esta chave:')
try {
  // Presence in the list is not enough: plenty of entries are image, TTS or
  // audio models that never serve generateContent. Filter by what they support,
  // or the check green-lights a model the request will bounce off.
  const usable: string[] = []
  let listedActions: string[] | undefined
  for await (const m of await ai.models.list()) {
    const name = (m.name ?? '').replace(/^models\//, '')
    if (!/^gemini-/.test(name)) continue
    const actions = m.supportedActions ?? []
    if (name === MODEL) listedActions = actions
    if (actions.length === 0 || actions.includes('generateContent')) usable.push(name)
  }
  console.log(`  ${usable.length ? usable.sort().join(', ') : '(nenhum listado)'}`)
  if (listedActions) console.log(`  ${MODEL} suporta: ${listedActions.join(', ') || '(não informado)'}`)
  check(
    `modelo ${MODEL} serve generateContent`,
    usable.length === 0 || usable.includes(MODEL),
    usable.includes(MODEL) ? 'confirmado na lista' : 'NÃO serve generateContent — veja a lista acima',
  )
} catch (err) {
  console.log(`  (não foi possível listar: ${(err as Error).message})`)
}

console.log(`\nModelo em teste: ${MODEL}${process.env.GEMINI_MODEL ? ' (via GEMINI_MODEL)' : ' (do app)'}`)
console.log(
  `\nCatálogo de teste: ${catalog.exercises.length} exercícios, ` +
    `${catalog.categories.length} categorias, ${catalog.days.length} dias ` +
    `(${Math.round(JSON.stringify(catalog).length / 1024)} KB de JSON)\n`,
)

// --- Turn 1: a vague ask should get a QUESTION, not a proposal --------------
console.log('Turno 1 — pedido vago (esperado: pergunta, sem função)')
const t1 = await turn(
  '1',
  [{ role: 'user', parts: [{ text: 'quero melhorar meu treino' }] }],
  2_000,
).catch(diagnose)
check('0.3 streaming entrega texto', t1.text.length > 0, `${t1.text.length} chars`)
check(
  'assistente pergunta em vez de chutar',
  !t1.call && t1.text.includes('?'),
  t1.call ? 'propôs sem perguntar' : 'respondeu com pergunta',
)

// --- Turn 2: an explicit "generate" should produce the function call --------
console.log('\nTurno 2 — pedido explícito (esperado: chamada de função)')
const t2 = await turn('2', [
  { role: 'user', parts: [{ text: 'quero melhorar meu treino' }] },
  { role: 'model', parts: [{ text: t1.text }] },
  {
    role: 'user',
    parts: [
      { text: 'treino 5 dias, foco em costas, sem lesão. redistribui os exercícios e já gera.' },
    ],
  },
]).catch(diagnose)

check(
  '0.2 função é aceita e chamada',
  t2.call?.name === PROPOSE_TOOL_NAME,
  t2.call ? `chamou ${t2.call.name}` : 'nenhuma chamada',
)
check('0.2 catálogo cabe em maxOutputTokens', !t2.truncated, t2.truncated ? 'truncado' : 'resposta completa')

if (t2.call?.args) {
  const p = t2.call.args as CatalogProposal
  const shaped =
    typeof p.summary === 'string' &&
    Array.isArray(p.categories) &&
    Array.isArray(p.exercises) &&
    Array.isArray(p.days)
  check('0.2 proposta tem a forma do schema', shaped, shaped ? 'summary + 3 listas' : 'forma inesperada')

  if (shaped) {
    const refs = new Set(p.exercises.map((e) => e.ref))
    const dangling = p.days.flatMap((d) => d.exerciseRefs).filter((r) => !refs.has(r))
    check(
      'refs dos dias resolvem',
      dangling.length === 0,
      dangling.length ? `pendentes: ${dangling.slice(0, 3).join(', ')}` : 'todos resolvem',
    )

    const known = new Set(catalog.exercises.map((e) => e.id))
    const bogus = p.exercises.filter((e) => e.id != null && !known.has(e.id))
    check(
      'ids preservados são reais',
      bogus.length === 0,
      bogus.length ? `${bogus.length} id(s) inventado(s)` : 'nenhum id inventado',
    )
    // The failure this exists to catch: a proposal that is internally valid but
    // quietly drops entities nobody asked to remove. Omitting IS deleting, so
    // this is data loss dressed up as a tidy-up — and validateProposal cannot
    // see it, because dropped ids leave nothing dangling behind.
    const dropped = catalog.exercises.length - p.exercises.length
    check(
      'nada foi removido sem pedir',
      dropped <= 0,
      dropped > 0
        ? `${dropped} exercício(s) sumiram da proposta — seriam apagados ao aceitar`
        : `${p.exercises.length} de ${catalog.exercises.length} exercícios mantidos`,
    )
    const droppedDays = catalog.days.length - p.days.length
    const droppedCats = catalog.categories.length - p.categories.length
    check(
      'dias e categorias preservados',
      droppedDays <= 0 && droppedCats <= 0,
      `dias ${p.days.length}/${catalog.days.length}, categorias ${p.categories.length}/${catalog.categories.length}`,
    )
    console.log(`\n  resumo do modelo: ${String(p.summary).slice(0, 220)}`)
  }
}

// --- Turn 3: same prefix again, to give implicit caching a fair chance -------
console.log('\nTurno 3 — mesmo prefixo de novo (esperado: cache do catálogo)')
const t3 = await turn(
  '3',
  [
    { role: 'user', parts: [{ text: 'quero melhorar meu treino' }] },
    { role: 'model', parts: [{ text: t1.text }] },
    {
      role: 'user',
      parts: [{ text: 'obrigado, era isso mesmo. me diga só quantos dias ficaram.' }],
    },
  ],
  2_000,
).catch(diagnose)

const cachedAnywhere = Math.max(t2.cached, t3.cached)
note(
  '2.4 prefixo do catálogo é cacheado',
  cachedAnywhere > 0,
  cachedAnywhere > 0
    ? `cachedContentTokenCount=${cachedAnywhere}`
    : 'nenhum cache observado — só encarece, não quebra nada (ver proposal)',
)

/* ----------------------------------------------------------------- verdict */

const failed = results.filter((r) => !r.ok)
console.log(`\n${'─'.repeat(60)}`)
console.log(`${results.length - failed.length}/${results.length} verificações passaram`)
if (failed.length) {
  console.log('\nFalhas:')
  for (const f of failed) console.log(`  ❌ ${f.name}: ${f.detail}`)
}
process.exit(failed.length ? 1 : 0)
