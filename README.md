# MyOneGym

Offline-first PWA to track gym workouts. Register **gyms**, define **exercises**
(grouped by muscle **category**), organize them into **training days**, and track
the **target weight** for each exercise **per gym**. No login, no server — all
data lives in the browser (IndexedDB).

Built for the `bootstrap-myonegym` OpenSpec change. See
`openspec/changes/bootstrap-myonegym/` for the proposal and specs, and
`mockups/` for the visual reference.

## Stack

- **React 18 + TypeScript + Vite**
- **Dexie.js** over IndexedDB (local persistence)
- **Zustand** (active-gym selection, persisted)
- **React Router** (Home / Exercise detail / Settings)
- **vite-plugin-pwa** (installable, offline)
- **Vitest + Testing Library** (unit + component)
- **Tabler icons webfont** (bundled locally — offline-safe)

## Getting started

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build (dist/)
npm run preview    # serve the production build
npm test           # run the test suite
npm run typecheck  # tsc --noEmit
```

## How it works

- **Home** — training days as an accordion. Expanding a day lists its exercises
  (media thumbnail + name) with an inline badge showing the current weight for
  the **active gym** (or "definir" when unset). Tap an exercise for its detail.
- **Exercise detail** — renders the media (static image **or animated GIF**),
  an edit→save weight field with a unit toggle (**KG / LB / #**), and a
  per-gym **history timeline** with per-entry delete. Deleting the newest entry
  reverts the active weight to the previous one (or clears it).
- **Settings** — all CRUD: gyms (with *copy weights from another gym* on
  create), categories (rename; deleting one reassigns its exercises to
  "Sem categoria"), exercises (name, media URL, category), and training days
  (name, optional category, ordered exercise selection — exercises may repeat).
- **Data** — generate an example routine, export a full backup JSON, import a
  backup (**replaces all** local data, with confirmation), and export an
  exercises-only JSON to share with other users.

## Design decisions worth knowing

- **Weight is keyed by `(gym, exercise)`**, with its own unit — the same
  exercise can be 40 KG in one gym and 15 LB in another; the value is identical
  across every day it appears in.
- **Weight history is device-local and never exported.** The full-backup JSON
  contains only the *current* weight per `(gym, exercise)`; the change log stays
  on the device. Importing a backup starts a fresh history.
- **Offline-first.** All data operations are local; the service worker caches the
  app shell so it opens and works with no network.

## Data & storage

Data is stored in IndexedDB (`myonegym` database). The app requests persistent
storage to reduce the chance of eviction, but browsers may still clear storage
under pressure — use **Settings → export backup** for real backups. Clearing
site data or the browser profile deletes everything.
