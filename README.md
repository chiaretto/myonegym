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
  The **expanded day is part of the address** (`/?day=<id>`), not screen state, so
  it survives opening an exercise and coming back — and `/?day=3` deep-links
  straight to that day. Toggling days replaces rather than pushes, so Back leaves
  Home instead of walking the accordion.
- **Exercise detail** — renders the media (static image **or animated GIF**) and
  tabs. Opened from a day (`/exercise/<id>?day=<id>`) it **remembers that day**:
  Voltar returns to Home with the day still expanded, and a **floating bottom bar**
  offers **Voltar / Avançar** across that day's exercises (disabled at the ends).
  An exercise can belong to several days, so the day is carried in the address
  rather than guessed; opened without one, there is no bar and Voltar goes to
  Home. Tabs: **Detalhe** (an edit→save weight field with a unit toggle
  **KG / LB / #**, and a per-gym **history timeline** with per-entry delete —
  deleting the newest entry reverts the active weight to the previous one or
  clears it) and **Observações** (a free-text note for this exercise in the active
  gym — see below).
- **Workout sessions** — start a workout from a day on Home (**Iniciar** /
  **Continuar**). The session lists that day's exercises. Each entry is a
  Home-style row (thumbnail + name + the exercise's current **per-gym target
  weight**, or "definir") with a done checkbox; tap it to open the **entry
  detail** — an **Execução** tab (the exercise image/GIF and the **same "Peso
  alvo" editor as the catalog** — edit → save the per-gym target, with its history)
  and an **Observações** tab for the exercise's per-gym note. Editing the weight
  here updates the exercise's **per-gym target** (and appends history) — a
  session stores **no independent weight**; on a completed session the editor is
  read-only. The entry detail is a **guided stepper**, in a **floating bar fixed
  to the bottom of the screen and present on every tab** — mid-set these are the
  controls you reach for, so they never require scrolling and don't vanish when
  you open the note or the photo. The bar reserves its own **measured** height, so
  it covers no content at any font size. **Concluir** marks the exercise done and
  jumps to the next one (a done exercise then shows a calm **Concluído** state +
  chip), and **Voltar / Avançar** step between exercises.
  Completing the **last** exercise, when every exercise is done, prompts to
  **finish the workout** (confirm completes the session; decline returns to the
  list). You can also finish anytime with **Concluir treino** on the runner
  (enabled once at least one exercise is marked). Only one session runs at a time
  per gym.
  **Settings → Sessões** lists completed sessions for the active gym (grouped by
  month, with a done-count badge); open one for a read-only recap or delete it.
  Entries snapshot the exercise **name** (so a recap still renders after a delete);
  the weight shown is always the live per-gym target.
- **Share a session as an image** — a completed session's recap offers
  **Compartilhar** (with weights and training duration) and **Compartilhar sem
  pesos** (with neither), so a workout can be shown off without revealing how
  much you lift. Each renders a PNG resembling the recap and hands it to the OS
  share sheet, falling back to a download where sharing files isn't supported.
  The image is a **fixed design** — it ignores the Aparência font-size setting —
  and prints an **absolute** date, since it outlives the day it was made. An
  exercise's media only appears if its host sends CORS headers; anything that
  can't be loaded falls back to the placeholder rather than failing the share.
- **Exercise photos** — the **Foto** tab (beside Observações, on both the catalog
  exercise detail and the in-session entry detail) holds **photos per
  `(gym, exercise)`** — your own pictures of *that machine* (seat height, pin
  position), as opposed to the exercise's `mediaUrl` demo image, which is the
  same everywhere. Take one with the camera or pick one from the gallery; several
  can coexist, newest first, each viewable full-size and deletable. Photos are
  **downscaled to 1600px / JPEG** before being stored (a 6 MB camera frame lands
  around 200 KB) and kept as bytes in IndexedDB. They stay **editable on a
  completed session** — a photo describes the exercise in that gym, not that
  session. Deleting a gym or an exercise deletes its photos. Photos are
  **device-local: they are NOT in the backup** and an import erases them — the
  one kind of user content a restore cannot bring back.
- **Exercise notes** — the **Observações** tab (on both the catalog exercise
  detail and the in-session entry detail) holds one **free-text note per
  `(gym, exercise)`**, like the target weight. It is durable and shared across
  sessions of that exercise in that gym; saving an empty note clears it. Notes are
  isolated per gym and are **included in the full backup**.
- **Settings** — all CRUD: gyms (with *copy weights from another gym* on
  create), categories (rename; deleting one just **removes it from every
  exercise** — an exercise left with none is uncategorized), exercises (name,
  media URL, and **zero or more categories** picked as toggle chips — a compound
  lift can be *Peito · Tríceps*; none selected shows "Sem categoria"; each item
  also shows which training days it belongs to; the list has a name search plus
  category and training-day filters, combinable, to narrow a growing catalog), and
  training days (name + ordered exercise selection — exercises may repeat;
  days can be reordered). A day's categories are **derived from its exercises**
  (e.g. "Peito · Tríceps"), not set by hand. **Creating and editing each of these
  is a dedicated page** (`/settings/<kind>/new`, `/settings/<kind>/:id/edit`), not
  a modal — so the browser Back button returns to the list, the URL is
  deep-linkable, and a tall form (the day's exercise picker) gets a full screen.
  Modals are kept for quick, transient things: the active-gym selector, a photo
  viewer, an exercise preview, and confirmations. On each of these screens the
  **create action** ("+ Novo…") sits in a **floating bar fixed to the bottom**,
  reachable without scrolling to the end of the list; the same bar carries **"Concluir
  treino"** on the session runner. Inside a form modal, the **Cancelar/Salvar**
  footer stays pinned as the content scrolls. All of these reserve their measured
  height so they never cover content, at any font size (`ui/ActionBar`, shared
  with the exercise stepper).
- **Appearance** — **Configurações → Aparência** has a **font-size** slider
  (100%–200%, default 150%) with a live preview; the choice is saved locally and
  rescales the whole app instantly.
- **Data** — generate an example routine, export a **complete backup** JSON, and
  import one to **restore** (a **replace-all**, with a destructive confirmation).
  The backup is a full snapshot of the database: gyms, categories, exercises,
  days, current weights **and their history**, exercise notes, **every workout
  session** and its entries, and **all exercise photos** (embedded as base64).
  Restore reproduces the device exactly, keeping original ids so every reference
  stays valid. Because photos are embedded, the file can be a few MB (much more if
  photos are large); a backup with no photos stays tiny. The only things left out
  are **device-local UI preferences** (font-size, the first-launch flag) — not
  user data. This is the safety net for the PWA's storage being evicted or lost.
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
- **The backup is a full snapshot, meant for restore.** It carries the whole
  database — including the weight-change history, workout sessions, and photos —
  so importing it on a fresh device reproduces the old one exactly. Photos are
  base64-encoded into the JSON (chunked, to avoid a stack overflow on large
  buffers); the file is self-contained and needs no special tool to read.
- **Offline-first.** All data operations are local; the service worker caches the
  app shell so it opens and works with no network.

## Data & storage

Data is stored in IndexedDB (`myonegym` database). The app requests persistent
storage to reduce the chance of eviction, but browsers may still clear storage
under pressure — use **Settings → export backup** for real backups. Clearing
site data or the browser profile deletes everything.
