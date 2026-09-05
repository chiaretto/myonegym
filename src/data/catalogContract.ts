import type { Schema } from '@google/genai'

/**
 * The wire contract between the app and the assistant: the shape of the catalog
 * we send, the shape of the proposal we get back, and the tool schema that
 * constrains it.
 *
 * **Deliberately free of runtime dependencies.** The only import is a type,
 * erased at build — nothing here pulls in Dexie, React or the SDK, because the
 * contract is not a database concern, and because a module with no runtime
 * imports can be loaded anywhere, including a plain Node script that checks the
 * real API accepts this exact schema (`scripts/spike-gemini.mts`). Reading the
 * catalog lives next door in `catalogPayload.ts`, which does need the database.
 */

/**
 * The three parts of the catalog the assistant may edit. They are not
 * independent: a day references exercises, an exercise references categories,
 * and nothing references days — `categories <- exercises <- days`. That order is
 * why `SECTIONS` is declared root-first: every pass that has to respect the
 * dependency (validating, applying) can just walk it forwards.
 */
export const SECTIONS = ['categories', 'exercises', 'days'] as const
export type Section = (typeof SECTIONS)[number]

export type SectionSelection = Record<Section, boolean>

export const ALL_SECTIONS: SectionSelection = {
  categories: true,
  exercises: true,
  days: true,
}

export const SECTION_LABEL: Record<Section, string> = {
  categories: 'Categorias',
  exercises: 'Exercícios',
  days: 'Dias de treino',
}

/* ------------------------------------------------------------- what we send */

/**
 * The catalog as handed to the assistant: categories, exercises and days, each
 * with its **real** id, and nothing else.
 *
 * It carries **both sources**. The official catalog ships with the app and is
 * marked `readOnly` — the model may put those exercises in a day, give one to a
 * user exercise as an alternative, or classify with an official category, but it
 * may not rename, re-categorise or delete one, and it must not list them back in
 * `categories`/`exercises`. Sending them is what stops the assistant proposing a
 * second "Supino Reto" every time it is asked to fill a gap it cannot see.
 *
 * Gyms, weights, weight history, notes, photos and sessions are deliberately
 * absent. They are per-gym or personal training data, they are not what the
 * assistant edits, and this is the payload that leaves the device — so the
 * cheapest way to guarantee they never leak is for this type not to have a
 * field to put them in.
 */
export interface CatalogSnapshot {
  categories: { id: number; name: string; readOnly?: true }[]
  exercises: {
    id: number
    name: string
    mediaUrl: string | null
    categoryIds: number[]
    alternativeIds: number[]
    readOnly?: true
  }[]
  days: { id: number; name: string; exerciseIds: number[] }[]
}

/* --------------------------------------------------------- what comes back */

/**
 * Every proposed entity carries a `ref` — a string key unique within the
 * proposal — **and** an `id`, which is its real identifier or `null` when it is
 * new.
 *
 * The `ref` exists because ids alone cannot express the proposal. A brand-new
 * exercise placed in a brand-new category has nothing to point at: both are
 * `id: null`, and null is not addressable. Referencing by name would work until
 * two exercises share one (the name index is not unique), so the proposal gets
 * its own address space and cross-references use it.
 *
 * It also makes the section dependency exactly computable: a section needs
 * another section precisely when it references a `ref` whose `id` is null — that
 * entity does not exist yet, and only applying its section brings it into being.
 */
export interface ProposedCategory {
  ref: string
  id: number | null
  name: string
}

export interface ProposedExercise {
  ref: string
  id: number | null
  name: string
  mediaUrl: string | null
  categoryRefs: string[]
  alternativeRefs: string[]
}

export interface ProposedDay {
  ref: string
  id: number | null
  name: string
  exerciseRefs: string[]
}

/**
 * A complete proposed catalog plus the assistant's own account of what it did.
 *
 * It is **complete**, not a patch: an entity missing from the list is an entity
 * to be deleted. That is what makes "o que sumiu" answerable at all — a patch
 * format would need a separate deletion channel, and a model that forgot to use
 * it would silently mean "no change" instead of "remove".
 */
export interface CatalogProposal {
  summary: string
  categories: ProposedCategory[]
  exercises: ProposedExercise[]
  days: ProposedDay[]
}

/* ----------------------------------------------------------- tool schema */

export const PROPOSE_TOOL_NAME = 'propor_catalogo'

/**
 * Schema for the `propor_catalogo` function declaration.
 *
 * This is Gemini's Schema dialect (an OpenAPI 3.0 subset), not raw JSON Schema:
 * types are the uppercase `Type` enum, and "may be absent" is `nullable: true`
 * rather than a `["integer", "null"]` type union. There is no
 * `additionalProperties`, so the schema constrains what the model *should*
 * produce but cannot forbid an extra key — which is why `validateProposal` is
 * the actual gate before anything is written, not this.
 *
 * Declaring the proposal as a *function* rather than as a forced response
 * format is what lets the assistant hold a conversation at all: a text turn is
 * a question, a function call is a proposal. Pinned to a response schema it
 * could only ever propose, and would have no way to ask how many days a week
 * the user trains.
 *
 * `propertyOrdering` is set throughout: the model emits fields in this order,
 * which keeps the streamed JSON stable and diffs between proposals readable.
 *
 * The types are written as the literal wire strings and cast once at the end,
 * rather than using the SDK's `Type` enum. The enum is a *value*: importing it
 * would put `@google/genai` in this module's import graph, and since every
 * screen reaches the contract, that would drag the whole SDK into the initial
 * bundle — undoing the dynamic import that keeps the offline app small. The
 * enum's members are exactly these strings, so nothing is lost but the cast.
 */
export const PROPOSE_TOOL_SCHEMA = {
  type: 'OBJECT',
  required: ['summary', 'categories', 'exercises', 'days'],
  propertyOrdering: ['summary', 'categories', 'exercises', 'days'],
  properties: {
    summary: {
      type: 'STRING',
      description:
        'Resumo em português, para o usuário, do que foi feito e por quê. Cite remoções explicitamente.',
    },
    categories: {
      type: 'ARRAY',
      description: 'A lista COMPLETA de categorias após a mudança. Omitir uma categoria a apaga.',
      items: {
        type: 'OBJECT',
        required: ['ref', 'name'],
        propertyOrdering: ['ref', 'id', 'name'],
        properties: {
          ref: {
            type: 'STRING',
            description: 'Id em texto se já existe (id 3 -> "3"); "novo1", "novo2"... se for nova.',
          },
          id: {
            type: 'INTEGER',
            nullable: true,
            description: 'Id existente, ou null se for nova.',
          },
          name: { type: 'STRING' },
        },
      },
    },
    exercises: {
      type: 'ARRAY',
      description: 'A lista COMPLETA de exercícios após a mudança. Omitir um exercício o apaga.',
      items: {
        type: 'OBJECT',
        required: ['ref', 'name', 'categoryRefs', 'alternativeRefs'],
        propertyOrdering: ['ref', 'id', 'name', 'mediaUrl', 'categoryRefs', 'alternativeRefs'],
        properties: {
          ref: {
            type: 'STRING',
            description: 'Id em texto se já existe (id 53 -> "53"); "novo1", "novo2"... se for novo.',
          },
          id: {
            type: 'INTEGER',
            nullable: true,
            description: 'Id existente, ou null se for novo.',
          },
          name: { type: 'STRING' },
          mediaUrl: {
            type: 'STRING',
            nullable: true,
            description: 'URL http(s) de imagem PNG/JPG/WebP/GIF, ou null.',
          },
          categoryRefs: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'refs de categorias desta proposta. Lista vazia = sem categoria.',
          },
          alternativeRefs: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              'refs de exercícios intercambiáveis com este. Basta declarar de um lado; a simetria é resolvida ao aplicar.',
          },
        },
      },
    },
    days: {
      type: 'ARRAY',
      description: 'A lista COMPLETA de dias após a mudança, na ordem. Omitir um dia o apaga.',
      items: {
        type: 'OBJECT',
        required: ['ref', 'name', 'exerciseRefs'],
        propertyOrdering: ['ref', 'id', 'name', 'exerciseRefs'],
        properties: {
          ref: {
            type: 'STRING',
            description: 'Id em texto se já existe (id 53 -> "53"); "novo1", "novo2"... se for novo.',
          },
          id: {
            type: 'INTEGER',
            nullable: true,
            description: 'Id existente, ou null se for novo.',
          },
          name: { type: 'STRING' },
          exerciseRefs: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              'refs de exercícios desta proposta (id em texto para os que já existem), na ordem em que devem aparecer no dia.',
          },
        },
      },
    },
  },
} as unknown as Schema
