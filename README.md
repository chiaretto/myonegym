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
- **Workout sessions** — start a workout from a day on Home (**Iniciar** /
  **Continuar**). The session snapshots that day's exercises with their current
  target weights. Each entry is a Home-style row (thumbnail + name + weight)
  with a done checkbox; tap it to open the **entry detail** — the exercise
  image/GIF, the *weight used* (edit → save), and the per-gym weight history. The
  detail is a **guided stepper**: **Concluir** marks the exercise done and jumps
  to the next one (a done exercise then shows a calm **Concluído** state + chip),
  and **Voltar / Avançar** step between exercises. Finish with
  **Concluir treino** (enabled once at least one exercise is marked). Only one
  session runs at a time per gym.
  **Settings → Sessões** lists completed sessions for the active gym (grouped by
  month, with a done-count badge); open one for a read-only recap or delete it.
  Sessions store snapshots, so past sessions survive later edits/deletes.
- **Settings** — all CRUD: gyms (with *copy weights from another gym* on
  create), categories (rename; deleting one reassigns its exercises to
  "Sem categoria"), exercises (name, media URL, category — each item also shows
  which training days it belongs to; the list has a name search plus category
  and training-day filters, combinable, to narrow a growing catalog), and
  training days (name + ordered exercise selection — exercises may repeat;
  days can be reordered). A day's categories are **derived from its exercises**
  (e.g. "Peito · Tríceps"), not set by hand.
- **Appearance** — **Configurações → Aparência** has a **font-size** slider
  (100%–200%, default 150%) with a live preview; the choice is saved locally and
  rescales the whole app instantly.
- **Data** — generate an example routine, export a full backup JSON, and import
  a backup (**replaces all** local data, with confirmation). Device-local data
  (weight-change history and workout sessions) is **not** included in backups.
  A **"Zona de perigo"** section adds **Resetar app**, which erases all
  registered data on the device after an explicit "cannot be undone"
  confirmation — equivalent to a fresh install.
- **First launch** — the very first time the app opens on a device with no
  registered data, it offers to load the same example routine as **Gerar
  exemplo**. The choice (accept or decline) is remembered locally on that
  device so the prompt is shown at most once; **Resetar app** re-arms it.

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
