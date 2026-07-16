# Implementation Tasks: Floating Stepper + Day-Aware Exercise Detail

**Change ID:** `floating-stepper-nav`

---

## Phase 1: The Day in the URL (Home)

- [x] 1.1 `src/features/home/HomePage.tsx`: replace `const [openId, setOpenId] =
      useState<number | null>(null)` with `useSearchParams()` — the open day is
      read from `?day=` and written back on toggle. This **removes** state rather
      than adding any; the URL is the only place that survives the unmount that
      causes the bug.
- [x] 1.2 Write with **`{ replace: true }`**. Pushing would make every
      expand/collapse a history entry, so Back would walk the accordion instead
      of leaving Home.
- [x] 1.3 An unknown/stale `?day=` (day since deleted) MUST behave as **no day** —
      no crash, nothing expanded.
- [x] 1.4 Exercise links become `/exercise/<exId>?day=<dayId>`.
- [x] 1.5 Tests: `?day=3` renders Dia 3 expanded; toggling updates the URL;
      collapsing clears the param; a stale id expands nothing; toggling doesn't
      grow history.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Home tests pass — 11/11, the existing accordion suite untouched
- [x] **Mutation-checked** the replace-vs-push test: flipping `setParams(next)`
      (push) makes it fail (`expected '/' to be '/sessions'` — Back got stuck in
      the accordion); restoring `replace: true` makes it pass. A guard that
      doesn't fail when the bug is present guards nothing.

---

## Phase 2: The Floating Bar (shared component)

- [x] 2.1 `src/ui/StepperBar.tsx`: a fixed bottom bar rendering an optional
      primary action plus the Voltar/Avançar row. Renders **nothing** when it has
      no actions (so the catalog detail without a day shows no bar).
- [x] 2.2 **Measure, don't guess.** A `ResizeObserver` on the bar publishes its
      height to a CSS custom property (e.g. `--stepper-h` on `:root` or the
      scroll container). The bar's height scales with `--font-scale` (100–200%),
      so any hard-coded `padding-bottom` would hide content at large scales —
      the exact failure this change exists to prevent.
- [x] 2.3 `src/styles/global.css`: `.stepper-bar { position: fixed; bottom: 0;
      left: 0; right: 0; padding-bottom: calc(<pad> + env(safe-area-inset-bottom))
      }` — the safe-area inset as `.tabbar`/`.sheet` already do, so the iOS home
      indicator can't sit on the buttons. Give it a z-index below the sheet
      backdrop (140) and the toast.
- [x] 2.4 A `.has-stepper` (or equivalent) modifier adds
      `padding-bottom: var(--stepper-h)` to the page's scroll container, on top of
      its existing padding.
- [x] 2.5 **Toast**: offset `.toast`'s `bottom: 92px` by the measured bar height
      on pages that have a bar — today it would render on top of it.

- [x] 2.6 (added) **`ResizeObserver` stub in `vitest.setup.ts`.** jsdom doesn't
      implement it, so measuring threw on mount and took the whole page down —
      every session test failed with `ReferenceError`. It's an environment gap
      (all target browsers have it, iOS Safari 13.4+), so the stub belongs in the
      setup file next to `fake-indexeddb`, not as a guard in product code.
- [x] 2.7 (added) The bar is width-capped to **480px and centred**, matching the
      `.app` shell — `position: fixed` alone would have spanned a desktop window.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Bar renders nothing when given no actions (covered by the no-day test)

---

## Phase 3: Session Exercise Detail

- [x] 3.1 `src/features/session/SessionEntryPage.tsx`: lift the `entry-stepper`
      block **out of the `tab === 'exec'` panel** and render `StepperBar` as a
      sibling of `<Tabs>`, so it shows on **all three** tabs.
- [x] 3.2 Move the logic **verbatim**: `onCompleteAndAdvance` (mark → advance;
      last + all done → finish prompt; declined/skipped → runner), the
      `prevId`/`nextId` ends being disabled, and the read-only completed state
      (`Concluído` / `Não feito` indicator instead of the button). This change is
      about **position**, not behaviour.
- [x] 3.3 `src/features/session/session.css`: `.entry-stepper` loses its in-flow
      layout in favour of the shared bar.
- [x] 3.4 The existing `session.integration.test.tsx` suite (finish prompt,
      decline, skip, disabled ends) MUST pass **unmodified** — it is the guard
      that the move changed nothing.
- [x] 3.5 New test: the bar is present on the Observações and Foto tabs, and
      Concluir works from a non-Execução tab.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `session.integration.test.tsx` — **7/7 with zero edits** (`git diff` on it is
      empty). That is the proof the move changed no behaviour.

---

## Phase 4: Catalog Exercise Detail (day-aware)

- [x] 4.1 `src/features/exercise/ExerciseDetailPage.tsx`: read `?day=` via
      `useSearchParams`; resolve the day from `useDays()`; the neighbours are that
      day's ordered `exerciseIds` around this exercise.
- [x] 4.2 Replace the hardcoded `<BackBar to="/" />` (three call sites, incl. the
      loading and not-found branches) with `to={day ? '/?day=<id>' : '/'}` — this
      is the fix for "Voltar loses the open day".
- [x] 4.3 Render `StepperBar` with **only** Voltar/Avançar (no Concluir — there is
      no session here), navigating to `/exercise/<next>?day=<id>` so the context
      carries across steps.
- [x] 4.4 **No `?day=` → no bar**, Back to `/`: exactly today's behaviour for a
      direct link or a stale bookmark. Same for an unknown day id.
- [x] 4.5 An exercise present in **several days** navigates within the day it was
      opened from — the reason the day can't be inferred.
- [x] 4.6 Tests: nav walks the right day's list; ends disabled; back target with
      and without `?day=`; the two-day case; a stale day id.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Catalog detail tests pass — 7/7 in `day-nav.integration.test.tsx`

---

## Phase 5: Integration & Polish

- [x] 5.1 Integration test for the reported bug: Home → expand Dia 3 → open an
      exercise → Voltar → **Dia 3 still expanded**.
- [x] 5.2 **Real-browser pass** (headless Chromium against the dev server — jsdom
      has no layout, so "covers no content" is not provable there):
      - **9/9 combinations clean**: font-scale 1.0 / 1.5 / 2.0 x Execução /
        Observações / Foto, on the example day, document scrolled fully to the
        end → **no leaf element's rect intersects the bar**. The numbers show why
        this mattered: the bar measures **127 / 145 / 165px** as the scale grows,
        and the reservation tracks it (151 / 169 / 189px). A fixed padding sized
        at scale 1 would have left ~14px of content under the bar at scale 2.
      - Bar top stayed at 699px while the document scrolled → fixed. ✓
      - Toast sits **16px above** the bar (bottom 683 vs bar top 699). ✓
      - Real trip verified: open a day → tap an exercise → Avançar goes to that
        day's next exercise, `?day` preserved → **Voltar lands on `/?day=1` with 6
        exercises still visible** (the reported bug, fixed).
      - Screenshots at 390px of both detail screens.
      - **Corrected a false alarm:** the first audit reported content covered. The
        script was scrolling `main.screen`, which is **not** the scroller —
        `.app` uses `min-height`, so `main` never gets a constrained height and the
        **document** scrolls. `main.scrollTop` was a no-op and the "covered"
        elements were just mid-content ones passing under a fixed bar, which is
        normal. Scrolling the window instead: all clean.
- [x] 5.3 Verify history: expanding/collapsing days N times doesn't grow
      `history.length`; Back from Home still leaves Home.
- [x] 5.4 `README.md`: document the floating stepper and `?day=` deep-linking.

**Quality Gate:** PASSED
- [x] All tests pass — 195/195 (178 before + 17 new)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive` (**via PR** — push the branch and
      `gh pr create`, don't push `main` directly)
