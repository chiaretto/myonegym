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
| Launch screens | `sharp` (`scripts/gen-splash.mjs`) | iOS launch images + one boot splash per selectable artwork, from `new-design/assets/splash_*.png` |
| Exercise images | `sharp` (`scripts/gen-exercise-media.mjs`) | Masters in `data/assets/exercises/`, served from `public/exercises/` |
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
- **Category (Categoria)** — muscle group (Peito, Tríceps, Costas, Bíceps…). Comes
  from the **official catalog** (read-only) or from the user (editable).
- **Exercise (Exercício)** — e.g. "Rosca Direta"; has an image URL, categories,
  execution **videos** and a **kind**: *Força* or *Cardio*. Comes from the
  **official catalog** (read-only) or from the user (editable).
- **Training Day (Dia de Treino)** — e.g. "Dia 1"; optional category; ordered list of exercises.
- **Weight (Peso)** — target load for a **strength** exercise; value + unit
  (KG/LB/#). **Global** by default; a gym may hold an **exception** that wins
  inside it. Cardio exercises have none.

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
4. **An exercise is Força or Cardio, and the kind decides three things.**
   Whether it has a weight (cardio does not — only notes and photos), whether it
   can join a training day (it cannot), and where it starts: strength from a
   **day** on Home, cardio from the **exercise itself**, on its own tab. A
   cardio session is one exercise, and completing it ticks its single entry
   rather than asking the user for the same fact twice.

   Both `Exercise.kind` and `Session.kind` are stored. The session's is a
   **snapshot**, like `dayName`: derive it from the exercises and the history
   would rewrite itself the moment one of them changes kind or is deleted.
   Cardio counts as a workout in every Consistência aggregate — the calendar's
   star says *which kind* it was, not *whether it counted*.
5. **The catalog has two sources, and the official one is code.** Categories and
   exercises come from a bundled file (`src/data/officialCatalog.json`, read by
   `src/data/officialCatalog.ts`) **and** from the user's own records. Every
   listing shows the two concatenated; the official half is badged "Oficial" and
   cannot be edited, renamed or deleted — the screens hide the actions and the
   repository refuses them.

   Nothing official is ever written to IndexedDB. That is what lets a broken
   media URL be fixed for everyone by a deploy, keeps adding exercises out of
   migrations, and keeps rows the user never created out of the backup.

   **The id says which source it is**: `id ≤ 9999` is official, `id ≥ 10001` is
   the user's (`USER_ID_BASE`). Nothing stores an `official` flag — it is a
   property of the id, like a video's media kind is a property of its URL.

   The **low** range is the official one because the bundled file is an *export
   of the database*: its ids are the ids the devices in the field already carry.
   So the v13 upgrade **empties** `exercises` and `categories` and rewrites **no
   reference at all** — days, weights, history, notes, photos and session
   entries keep the same numbers, and those numbers keep meaning the same
   movements. Only the source of the record changed.

   Two consequences to respect: the ids in the file are **permanent** (renaming
   is free, renumbering silently hands one movement's history to another, and
   `officialCatalog.test.ts` fails if it happens), and a user-created record
   takes its id from `nextUserId` in `db/repos` rather than from Dexie's `++id`
   — clearing a store does not reset the key generator, and a fresh install
   starts it at 1, so both would land inside the reserved range.

   The alternatives relation is the one asymmetry: a user exercise may take an
   official one as an alternative, and the link is stored on the user's record
   alone. `lib/alternatives` restores the symmetry when the list is **read**, by
   unioning the exercises that point back — which costs no query, because every
   caller already holds the whole map.

6. **All CRUD lives in a Settings menu.** The Home screen is read/track only.
7. **Local-only, no auth.** Sharing happens through JSON export/import.
8. **Category deletion reassigns** affected exercises to a reserved "Sem
   categoria" category (never blocks; never orphans).
9. **Full-backup import replaces all** local data (with an overwrite warning).
   Importing *shared exercises* JSON instead merges/adds without touching gyms or
   weights.
10. **One screen talks to the network, and only if asked.** The *Assistente (IA)*
   sends categories, exercises and days to the Gemini API to reorganize them.
   It is opt-in (needs a token the user supplies), it never sends gyms, weights,
   notes, photos or sessions, and its client is loaded on demand so the offline
   bundle does not carry it. Everything else in the app remains local-only.
11. **The accent colour is the user's, and it is governed by a list.** The app is
   dark-only, but the accent is chosen in Settings → Aparência from a curated
   set of 16 (`src/state/accents.ts`) — brand red by default. There is exactly
   **one** accent: the gradient's far stop derives from it by the brand's
   historical 0.79 factor, not from a second colour the user picks. (A second
   colour was built and rejected on look; see the archived change.)

   Three rules hold, enforced by `accents.test.ts` rather than by good
   intentions: every offered colour sits at the red's relative luminance (so
   the AA contrast the palette was built on holds for all of them, and the warm
   band that would collide with the danger amber is simply not offered); no two
   colours are perceptually close enough to be confused; and switching writes
   only `--accent`, `--accent-2` and `--accent-rgb` — tint, border, text, fill
   and gradient all derive from those in `tokens.css`. So: never hardcode an
   accent literal, and never add an accent token that does not derive. Canvas
   cannot read custom properties, so the shared session card takes the colour
   as an argument.
12. **Photo images live in OPFS, their metadata in IndexedDB.** A photo's bytes
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
- The **app** registers the service worker (`src/lib/appUpdate.ts`, called from
  `main.tsx`), and `injectRegister` is off in `vite.config.ts`. That is what puts
  the `ServiceWorkerRegistration` in reach of Settings → "Atualizar app", which
  exists because an installed PWA is resumed rather than navigated to and so
  never asks the browser for a newer build on its own. Turning `injectRegister`
  back on would register the same worker twice.
- The version and build stamp the app shows come from `scripts/buildInfo.ts`,
  shared by `vite.config.ts` and `vitest.config.ts`. Never write a version
  literal into a component.
- Install assets are **generated**, never drawn by hand. Two chains, because the
  icon and the launch screen are different artwork:
  - **Icons** — master `public/icon.png`, run `npm run pwa-assets`
    (`pwa-assets.config.ts`).
  - **Launch screens** — masters `new-design/assets/splash_*.png`, one per
    artwork the user can choose (`src/state/splashes.ts`), run `npm run splash`
    (`scripts/gen-splash.mjs`), which writes one `public/splash-*.webp` each for
    the in-app boot splash, plus the iOS launch images **from the default
    artwork only** — iOS resolves those at install time and cannot follow a
    setting. The chosen file is read synchronously by the inline script in
    `index.html`, before the first frame; `src/state/splashes.test.ts` fails if
    the module, the generator and that script ever disagree on a file name.

  - **Exercise images** — masters `data/assets/exercises/`, run
    `npm run exercise-media` (`scripts/gen-exercise-media.mjs`), which writes the
    served copies to `public/exercises/`. The file is named after the
    **exercise** (`supino-reto-com-barra.webp`), the catalog carries only
    `mediaFile` — no remote address — and anything in `public/` the catalog no
    longer names is swept. Adding a picture means dropping a master next to the
    others and re-running; the script prints the exercises it found none for.
    The pictures were downloaded from their original sites **once**, and those
    addresses are kept in `data/assets/exercises/sources.json` as provenance.

    They are **excluded from the precache** and cached at runtime instead (see
    `vite.config.ts`): 51 pictures weigh ~5 MB, nobody uses 51 exercises, and
    one pass through your own routine puts the ones you do use offline.

  All masters are versioned, so any of these commands can be re-run from a fresh
  checkout, and their output is committed so `npm run build` never needs the
  image toolchain. Edit a master and re-run; never edit a generated file.
