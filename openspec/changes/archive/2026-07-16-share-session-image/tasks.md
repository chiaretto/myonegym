# Implementation Tasks: Share a Workout Session as an Image

**Change ID:** `share-session-image`

---

## Phase 1: Foundation (Pure Share Model)

- [x] 1.1 `src/features/session/share/shareModel.ts`: define `ShareVariant =
      'full' | 'lite'`, `ShareRow { name, category?, weight?, done, mediaUrl? }`
      and `ShareCard { title, gymName?, dateLabel, durationLabel?, doneLabel,
      rows }`.
- [x] 1.2 Implement `buildShareCard({ session, entries, gym, weights, exMap,
      catMap, variant })`:
      - `title` = `session.dayName`; `gymName` = gym name (omit when absent).
      - `dateLabel` = **absolute** date from `completedAt` (e.g. "16 jul 2026") —
        **not** `relativeDate`, which would rot inside a shared image.
      - `durationLabel` = `fmtDuration(completedAt - startedAt)` for `'full'`,
        **`undefined` for `'lite'`**.
      - `doneLabel` = `"{done} de {total} concluídos"`.
      - per row: `exerciseName` snapshot, category via `exMap`→`catMap`,
        `mediaUrl` via `exMap`, `done`; `weight` = `fmtWeight` of the **live**
        `weights.get(exerciseId)` for `'full'` only — **`undefined` for `'lite'`
        and for entries with no target** (no "definir" hint on a shared card).
- [x] 1.3 `src/features/session/share/share.test.ts`: `'full'` includes weights +
      duration; `'lite'` omits **both**; absolute (not relative) date; unset
      target → no weight; deleted source exercise → snapshot name, no category,
      no media; done count. Also added a live-target test and a missing-gym test. ✓
- [x] 1.4 (added) `fmtFullDate` in `src/lib/format.ts` — the existing
      `fmtDayMonth` carries no year. Lives with the other pt-BR formatters rather
      than in the share module. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `shareModel` unit tests pass — 8/8 in `share.test.ts`

---

## Phase 2: Rendering (Canvas 2D)

- [x] 2.1 `src/features/session/share/renderCard.ts`: a `C` token block + layout
      constants. Layout is in **design units** (`W` 540) scaled by `SCALE` 2 →
      a 1080px-wide PNG. No `--font-scale` is read anywhere — font sizes are
      literals in the `TITLE`/`NAME`/`META`/… font strings. ✓
- [x] 2.2 `loadImage(url)`: `crossOrigin = 'anonymous'` + a 4s timeout, resolves
      `null` on error/timeout/zero-width — **never rejects**. ✓
- [x] 2.3 `renderCard(card)`: `await document.fonts?.ready`, media loaded in
      parallel up front, canvas sized via `cardHeight(card)`, then background →
      header → rows → footer → `toBlob('image/png')`. ✓
- [x] 2.4 Check mark and media placeholder drawn as vector paths. ✓
- [x] 2.5 `ellipsize()` binary-searches the fit; applied to title, gym chip,
      exercise name and category. ✓
- [x] 2.6 (added) `rrect()` via `arcTo` instead of `ctx.roundRect` — the latter
      needs Safari 16.4+, too new to rely on for a PWA. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Visual pass — done in Phase 5.2 (jsdom has no 2D context, so it ran in
      headless Chromium against the dev server rather than in the test suite)

---

## Phase 3: Delivery (Share / Download)

- [x] 3.1 `src/features/session/share/shareCard.ts`: `shareSessionImage(blob,
      filename, title)` returns a `ShareOutcome` (`'shared' | 'downloaded' |
      'cancelled'`) so the page can toast the right thing instead of guessing. ✓
- [x] 3.2 `AbortError` → `'cancelled'`, resolved quietly; any other rejection
      propagates to the page's error toast. ✓
- [x] 3.3 `shareFilename(dayName, ts)` → `myonegym-dia-1-2026-07-16.png`;
      NFD-strips accents, falls back to `treino` when nothing usable remains. ✓
- [x] 3.4 `shareCard.test.ts` — 8 tests: filename slug/accents/fallback; share
      path; download fallback when `canShare` is **absent** and when it **returns
      false**; `AbortError` → `'cancelled'`; genuine failure propagates. jsdom has
      no `URL.createObjectURL`, so it is defined rather than spied. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Delivery tests pass — 8/8 in `shareCard.test.ts`

---

## Phase 4: User Interface

- [x] 4.1 `src/features/session/SessionPage.tsx`: both buttons added in the
      `readOnly` branch, wired `buildShareCard` → `renderCard` →
      `shareSessionImage`. ✓
- [x] 4.2 `sharing: ShareVariant | null` state disables both buttons while
      generating and labels the active one "Gerando…"; `'downloaded'` → "Imagem
      salva." toast, throw → "Não foi possível gerar a imagem.", `'cancelled'` →
      silent. ✓
- [x] 4.3 `session.css`: `.share-row` stacks the buttons vertically — side by
      side, "Compartilhar sem pesos" truncates at 390px. ✓
- [x] 4.4 Covered by a test (no share button while in progress). ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass (buttons present when completed, absent when active)

---

## Phase 5: Integration & Polish

- [x] 5.1 New `src/features/session/session.share.integration.test.tsx` (7 tests)
      rather than extending the existing file — the painter must be `vi.mock`ed,
      which would leak to the other suites. Covers: both buttons on a completed
      session; **none** in progress; the `full` card carries weights + duration
      and the `lite` one carries neither; the share-sheet path; the download
      fallback + toast; the error toast. ✓
- [x] 5.2 **Verified in a real browser** (Chromium via Playwright, driven against
      the dev server) rather than by eye, since the painter has no unit coverage:
      - The bundled example routine, at 390px, through the real UI: start → mark
        done → Concluir treino → open the recap → tap both share actions. Both
        PNGs downloaded (`myonegym-dia-1-peito-e-triceps-2026-07-16.png`), the
        toast fired, no page errors.
      - **Taint mitigation proven, not assumed**: a PNG served from a second
        origin with **no** `Access-Control-Allow-Origin` was blocked by the
        browser (console shows the CORS error) and the card still rendered — the
        row fell back to the placeholder and `toBlob` never threw. The real
        example dataset reproduced this on its own: the hipertrofia.org GIF sends
        no CORS header → placeholder, while the other 5 exercises' media drew fine.
      - Geometry checked with fixtures of known content: a 64×64 square fills the
        thumb edge to edge; a 96×32 (3:1) image is cropped on the sides at full
        height (`drawCover` is correct).
      - Also exercised: name ellipsis, a deleted-exercise row, an unset weight, a
        1-row card, and `1 h 5 min` duration formatting.
- [x] 5.3 **Byte-identical** at `--font-scale` 1.0 vs 2.0 — same 135,793-byte
      PNG, hex compared in-browser. ✓
- [x] 5.4 `README.md` documents both actions, the fixed-design/absolute-date
      behaviour, and the CORS caveat on media. ✓
- [x] 5.5 (added) Design fix found only by looking at the render: the card first
      mirrored the screen's `.entry.done` styling (dim + line-through), which
      made **completed** exercises look cancelled and **skipped** ones look like
      the highlight — backwards for a share image. Inverted per the user's call:
      done renders full strength, skipped recedes (`SKIPPED_ALPHA`). ✓

**Quality Gate:** PASSED
- [x] All tests pass — 152/152 (129 before this change + 23 new: 8 `shareModel`,
      8 `shareCard`, 7 integration)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
