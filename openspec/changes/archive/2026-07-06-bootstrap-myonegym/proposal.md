# Proposal: MyOneGym — Offline Workout Tracker PWA

**Change ID:** `bootstrap-myonegym`
**Created:** 2026-07-06
**Status:** Implementation Complete
**Completed:** 2026-07-06

---

## Problem Statement

- **What problem are we solving?** A gym-goer needs a simple, private way to
  organize their workout routine (training days and exercises) and remember the
  **target weight** for each exercise — which changes depending on **which gym**
  they are at (different machines/plates per gym).
- **Who is affected?** A single end user (personal use); no multi-user accounts.
  Users can optionally share their routine with others via JSON.
- **Current pain point?** No app currently exists. Existing apps require login,
  network, or don't model "weight per gym". The user wants an offline,
  no-login, install-to-home-screen experience with data stored locally.

## Proposed Solution

Build **MyOneGym**, a mobile-first Progressive Web App:

- **Local persistence** in the browser via IndexedDB (Dexie.js) — no server, no login.
- **PWA shell**: installable, offline-capable, mobile-first UI.
- **Configuration (Settings) area** for all data entry:
  - Manage **gyms**, with the option to **copy weights from an existing gym** when creating a new one.
  - Manage **categories** (editable muscle groups).
  - Manage **exercises** (name, media URL — image or animated GIF, category).
  - Manage **training days** (name, optional category, selected exercises — repeatable across days).
  - **Generate example** data, **import JSON**, **export full JSON** (backup — see history exclusion below), and **export exercises JSON** (to share).
- **Home screen**: an **accordion** of training days; expanding a day lists that day's active exercises (name + media thumbnail — image or GIF) and previews the **current weight for the active gym** as an inline badge.
- **Exercise detail**: rendered media (static image or **animated GIF**) + an **editable target-weight field** with unit (KG / LB / #), **saved per gym**, plus a **history timeline** of previous saves for the active gym with a per-entry **delete** action.
- **Weight history**: every save (value or unit change) appends an entry to a local, per-`(gym, exercise)` log. Entries can be deleted individually. Deleting the current (newest) entry restores the previous entry as the active weight.
- **Export omits history**: the full-backup JSON exports only the **current** per-`(gym, exercise)` weight — the history log stays device-local by design.
- **Design system**: white surfaces, near-black text, and a single muted-terracotta accent — light + dark modes. Reference mockups are checked in under `mockups/`.

## Scope

### In Scope
- Gym CRUD + copy-weights-on-create.
- Category CRUD (create, rename/edit, delete).
- Exercise CRUD (name, media URL — static image or animated GIF, category).
- Training Day CRUD (name, optional category, ordered exercise selection; exercises may repeat).
- Per-gym target weight per exercise, with unit (KG/LB/#), editable/saveable.
- **Weight history log** per `(gym, exercise)` — auto-appended on save, shown as a timeline on the exercise detail, entries individually deletable (deleting the current entry reverts the active weight to the previous entry, or empty).
- Home accordion of days → exercise list → exercise detail, with a **current-weight preview badge** on each row for the active gym.
- Active-gym selection (which gym's weights and history are shown).
- Data portability: generate example, export full backup JSON (**excludes the weight-history log**), import JSON, export exercises-only JSON.
- Design tokens (white + near-black + muted red) applied globally, light + dark modes.
- PWA: manifest, service worker, offline shell, installable.

### Out of Scope
- User accounts, authentication, cloud sync, multi-device sync.
- Server/backend of any kind.
- Workout **session** logging (sets, reps, per-session logs, rest timers, aggregate charts). The weight-change log is intentionally lightweight — only the target weight value/unit over time.
- Timers, rest tracking, social feeds, notifications.
- Native app store distribution.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Yes | New IndexedDB schema (Dexie): gyms, categories, exercises, days, weights, **weight_history**. |
| API | No | No backend; "data layer" = local repositories over IndexedDB. |
| State | Yes | Active gym + entity stores/selectors (Zustand or Context); weight-save appends a history entry. |
| UI | Yes | New app shell, Home (accordion + current-weight preview badge per row), Exercise detail (image + editable weight + **history timeline with per-entry delete**), Settings CRUD screens. Design tokens per `mockups/`. |

## Architecture Considerations

- **Greenfield**: this proposal bootstraps the project structure and conventions
  (see `openspec/project.md`).
- **Local repository pattern** over Dexie tables keeps UI decoupled from storage.
- **Weight scoping**: a weight record is keyed by `(gymId, exerciseId)`; the UI
  reads/writes against the **active gym**. Copying a gym duplicates its weight rows.
- **Weight history**: append-only `weight_history` table keyed by
  `(gymId, exerciseId, changedAt)`, holding value + unit. History is scoped to
  the active gym. Deleting the newest entry cascades to update the "current"
  weight record to the entry that remains (or clears it if none remain).
- **Export omits history**: the full-backup JSON serializes only the current
  per-`(gym, exercise)` weight — the `weight_history` table is intentionally
  excluded. Importing a backup restores current weights and starts a fresh
  history on the target device.
- **Referential integrity in-app**: deleting a category/exercise must handle
  references from exercises/days gracefully (block or cascade — decided in specs).
  Deleting a gym cascades to its weights **and** its history entries.
- **JSON schema**: a single versioned document for full backup; an
  exercises-only variant for sharing (exercises + categories, no gyms, no
  weights, no history).
- **Design tokens** centralized as CSS custom properties (see
  `mockups/README.md`) so the whole app can adapt to light/dark mode or shift
  palette by changing a single set of variables.

## Success Criteria

- [ ] User can install the app to the home screen and use it fully **offline**.
- [ ] User can create a gym, categories, exercises, and a training day, then see them on Home.
- [ ] Expanding a day on Home lists its active exercises; each row previews the current weight (or a "definir" hint) for the active gym; tapping one shows the image and per-gym weight.
- [ ] Editing and saving a weight persists it for the **active gym only** and appends a history entry with a timestamp.
- [ ] The exercise detail shows a history timeline (per active gym) with delta indicators; deleting a non-current entry removes it while the active weight is preserved; deleting the current entry reverts the active weight to the previous entry (or empty).
- [ ] Creating a new gym with "copy from" reproduces the source gym's **current** weights (history is not copied — it starts fresh in the new gym).
- [ ] Export → clear storage → import restores all gyms, categories, exercises, days, and current weights. The exported JSON contains no `weight_history` records.
- [ ] "Generate example" populates a usable demo routine.
- [ ] The app uses only the documented palette (white / near-black / muted red) in both light and dark modes.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| IndexedDB data loss (browser clears storage) | Med | High | Provide JSON export/backup; document persistence limits; request persistent storage. |
| Broken/hotlinked exercise media URLs (image or GIF) | Med | Low | Graceful fallback placeholder; validate URL + accepted media type (image/GIF) on save. |
| Orphaned references on delete (category/exercise) | Med | Med | Define delete rules in specs (block-if-referenced or cascade). |
| Import of malformed/foreign JSON | Med | Med | Validate against versioned schema; reject with clear error; never partially corrupt store. |
| Unbounded weight-history growth | Low | Low | Only appends on explicit save (bounded by user actions); per-entry delete + full-backup wipe give the user control. History is device-local and never syncs. |
| Users expect history to survive export/import | Med | Low | Communicate the trade-off in Settings copy near the export action; history stays device-local by design. |
| Scope creep from weight history into session logging | Med | Med | Weight history is intentionally narrow — value + unit + timestamp only. Session logs (sets, reps, per-session data) remain out of scope, revisitable in a future proposal. |

---

## Archive Information

**Archived:** 2026-07-06
**Duration:** same-day (created and implemented 2026-07-06)
**Outcome:** Successfully implemented

### Specs promoted to source of truth (`openspec/specs/`)
- app-foundation, categories, data-portability, exercises, gyms, home-navigation, training-days, weights (25 requirements)

### App implemented
- React 18 + TS + Vite + Dexie(IndexedDB) + Zustand + React Router + vite-plugin-pwa
- 35 source files under `src/`; 32 tests passing; `tsc` clean; PWA build OK

### Known follow-ups (see tasks.md → Notes & Deviations)
- Add ESLint/Prettier; run Lighthouse; manual offline (airplane-mode) verification
