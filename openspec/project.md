# Project: MyOneGym

**Type:** Mobile-first PWA (offline, local-only, no backend)
**Status:** Bootstrapping

---

## Overview

MyOneGym is a personal, offline-first Progressive Web App for managing gym
workouts. A user registers one or more **gyms**, defines **exercises** (grouped
by muscle **category**), organizes them into **training days**, and tracks the
**target weight** of each exercise — one weight shared by every gym, with a
**per-gym exception** where a gym really is different. There is **no login and
no server** — all data lives in the browser.

## Tech Stack (proposed conventions)

| Concern | Choice | Notes |
|---------|--------|-------|
| Language | TypeScript | Strict mode |
| Framework | React 18 + Vite | Fast dev, small bundle |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest + service worker + installable |
| App icons | `@vite-pwa/assets-generator` | Generated from `public/icon.png` |
| Launch screens | `sharp` (`scripts/gen-splash.mjs`) | iOS launch images + boot splash, from `new-design/assets/splash-master.png` |
| Local storage | IndexedDB via **Dexie.js** | Structured, indexed, migratable |
| State | Zustand (or React Context) | Lightweight, no boilerplate |
| Routing | React Router | Home / Detail / Settings |
| Styling | CSS Modules (mobile-first) | Simple, no heavy UI lib required |
| Testing | Vitest + Testing Library | Unit + component |

> The stack above is a recommendation to be confirmed during
> `/openspec-apply`. It is not yet implemented.

## Core Domain Entities

- **Gym (Academia)** — a physical gym. It owns the *exceptions* to weights, plus
  notes, photos and sessions.
- **Category (Categoria)** — muscle group (Peito, Tríceps, Costas, Bíceps…). Editable.
- **Exercise (Exercício)** — e.g. "Rosca Direta"; has an image URL and a category.
- **Training Day (Dia de Treino)** — e.g. "Dia 1"; optional category; ordered list of exercises.
- **Weight (Peso)** — target load for an exercise; value + unit (KG/LB/#).
  **Global** by default; a gym may hold an **exception** that wins inside it.

## Key Design Decisions (to review)

1. **Weight is global, and a gym is the exception.** What a person lifts is a
   property of that person, not of the building, so the target weight belongs to
   the **exercise** and is the same everywhere — the same "Rosca Direta" on every
   day and in every gym. A gym MAY hold an **exception** (that machine really is
   different), which wins inside it alone.

   Both live in `weights`, keyed by `(gymId, exerciseId)`: the global row uses
   the reserved `GLOBAL_GYM_ID = 0`, which no `++id` gym can collide with. That
   is what keeps `&[gymId+exerciseId]` a working unique index — a compound key
   cannot hold `undefined` — so both scopes are read, written and cascaded by
   the same queries. The sentinel never leaves `db/repos`: screens call
   `resolveWeight`/`weightsForGym` and get the value plus the scope it came from.
2. **The history belongs to the scope that was saved.** A global save appends to
   the global timeline, an exception to that gym's. Entries never move between
   scopes, so dropping an exception hides its timeline rather than deleting it —
   and recreating the exception brings it back.
3. **A new gym copies nothing.** It already shows every global weight the moment
   it exists, and starts with no exceptions of its own.
4. **All CRUD lives in a Settings menu.** The Home screen is read/track only.
5. **Local-only, no auth.** Sharing happens through JSON export/import.
6. **Category deletion reassigns** affected exercises to a reserved "Sem
   categoria" category (never blocks; never orphans).
7. **Full-backup import replaces all** local data (with an overwrite warning).
   Importing *shared exercises* JSON instead merges/adds without touching gyms or
   weights.
8. **One screen talks to the network, and only if asked.** The *Assistente (IA)*
   sends categories, exercises and days to the Gemini API to reorganize them.
   It is opt-in (needs a token the user supplies), it never sends gyms, weights,
   notes, photos or sessions, and its client is loaded on demand so the offline
   bundle does not carry it. Everything else in the app remains local-only.
9. **Photo images live in OPFS, their metadata in IndexedDB.** A photo's bytes
   are a file in the origin's private file system (`src/data/photoStore.ts`);
   the `exercisePhotos` row keeps only metadata plus the file name. Two
   consequences to respect: no transaction spans a record and its file (write
   the file first, delete the record first), and a browser with no writable
   OPFS still stores the bytes in the record — every read goes through the
   store, never through `photo.bytes` directly.

## Conventions

- Feature work follows the OpenSpec SDD flow: `/openspec-proposal` →
  `/openspec-apply` → `/openspec-archive`.
- Delta specs use ADDED / MODIFIED / REMOVED with Given/When/Then scenarios.
- Mobile-first: design for a phone viewport; PWA installable and offline-capable.
- Install assets are **generated**, never drawn by hand. Two chains, because the
  icon and the launch screen are different artwork:
  - **Icons** — master `public/icon.png`, run `npm run pwa-assets`
    (`pwa-assets.config.ts`).
  - **Launch screens** — master `new-design/assets/splash-master.png`, run
    `npm run splash` (`scripts/gen-splash.mjs`), which writes the iOS launch
    images plus `public/splash.webp` for the in-app boot splash.

  Both masters are versioned, so either command can be re-run from a fresh
  checkout, and their output is committed so `npm run build` never needs the
  image toolchain. Edit a master and re-run; never edit a generated file.
