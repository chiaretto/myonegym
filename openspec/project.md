# Project: MyOneGym

**Type:** Mobile-first PWA (offline, local-only, no backend)
**Status:** Bootstrapping

---

## Overview

MyOneGym is a personal, offline-first Progressive Web App for managing gym
workouts. A user registers one or more **gyms**, defines **exercises** (grouped
by muscle **category**), organizes them into **training days**, and tracks the
**target weight** for each exercise **per gym**. There is **no login and no
server** — all data lives in the browser.

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

- **Gym (Academia)** — a physical gym. Weights are scoped to a gym.
- **Category (Categoria)** — muscle group (Peito, Tríceps, Costas, Bíceps…). Editable.
- **Exercise (Exercício)** — e.g. "Rosca Direta"; has an image URL and a category.
- **Training Day (Dia de Treino)** — e.g. "Dia 1"; optional category; ordered list of exercises.
- **Weight (Peso)** — target load for an exercise **within a gym**; value + unit (KG/LB/#).

## Key Design Decisions (to review)

1. **Weight is keyed by `(gymId, exerciseId)`.** Because exercises repeat across
   days and categories, the target weight belongs to the exercise within a gym —
   not to a day-exercise pairing. The same "Rosca Direta" shows the same weight
   on every day, but differs between gyms.
2. **Unit (KG/LB/#) is stored on each weight record — per exercise per gym.**
   The same exercise can use KG in one gym, LB in another, and a plain number (#)
   in a third.
3. **Copy-on-create for gyms.** When creating a new gym the user may pick a
   source gym to duplicate all of its weight records.
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
