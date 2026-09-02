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
- **Exercise (Exercício)** — e.g. "Rosca Direta"; has an image URL, categories
  and a **kind**: *Força* or *Cardio*.
- **Training Day (Dia de Treino)** — e.g. "Dia 1"; optional category; ordered list of exercises.
- **Warmup (Aquecimento)** — a name and one piece of media (image, video file or
  external link), linked to many exercises and shared by them.
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
5. **A warm-up's media type is read from its URL, never stored.** Video file,
   embeddable provider or **image** is decided by `lib/warmupMedia.ts`, and the
   same function backs validation and rendering so the two cannot disagree.
   Image is the default rather than an "unknown" case: plenty of real image URLs
   carry no extension, and the viewer's failure state — which keeps the address
   openable — is what makes guessing optimistically safe. A `kind`
   column would be a second source of truth about the same string; the
   durability argument that makes `Session.kind` a snapshot does not apply,
   because nothing is rewritten retroactively if the classification improves.

   A provider that publishes a **player URL** (YouTube, Vimeo) is embedded, via
   that URL — the watch page itself refuses to be framed. Nothing else is ever
   framed: most sites refuse it, so guessing an iframe would render a blank box
   with nothing to explain it.

   Embedding is a **deliberate trade**, revisited once and decided by the owner:
   it puts a third party's player inside an otherwise local-only app, and that
   provider sees the request. The app gives back what it can — the no-cookie
   host where one exists, no autoplay, lazy loading — and does not pretend that
   makes it private.

   Exercise ↔ warm-up is many-to-many through `Exercise.warmupIds` with a
   multiEntry index — the shape `categoryIds` already uses, and the array order
   IS the order the viewer pages through. Unlike `alternativeIds` the relation
   is **asymmetric**, so there is no symmetry for a repository to maintain.
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
  - **Launch screens** — master `new-design/assets/splash-master.png`, run
    `npm run splash` (`scripts/gen-splash.mjs`), which writes the iOS launch
    images plus `public/splash.webp` for the in-app boot splash.

  Both masters are versioned, so either command can be re-run from a fresh
  checkout, and their output is committed so `npm run build` never needs the
  image toolchain. Edit a master and re-run; never edit a generated file.
