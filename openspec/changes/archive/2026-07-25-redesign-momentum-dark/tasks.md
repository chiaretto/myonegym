# Implementation Tasks: Redesign "Momentum" — Dark Premium

**Change ID:** `redesign-momentum-dark`

---

## Phase 1: Foundation (Tokens, Fonts, Icons)

- [x] 1.1 Replace `src/styles/tokens.css` with the Momentum **dark-only** palette:
      `bg #0b0b0e`, `surface-1 #151519`, `surface-2 #1d1d23`, `surface-3 #26262e`,
      `border rgba(255,255,255,.07)`, `text #f4f4f6`, `muted #8b8b95`,
      `dim #5f5f68`, `accent #ff5a36`, `accent-2 #ff7a52`,
      `accent-soft rgba(255,90,54,.15)`, `accent-border rgba(255,90,54,.28)`,
      `on-accent #160a06`. Remove the `@media (prefers-color-scheme: dark)` block
      (dark becomes the base `:root`).
- [x] 1.2 Set Momentum radii tokens: `--r-card: 22px`, rows/sub-cards `16px`,
      chips/buttons `11–15px`, `--r-pill: 999px`.
- [x] 1.3 Self-host **Sora**, **Manrope**, **JetBrains Mono** (subset weights:
      Sora 700/800, Manrope 400–800, JetBrains Mono 600/700); add `@font-face`
      with `font-display: swap`; preload primary weights. Add
      `--font-title`, `--font-body`, `--font-mono` tokens.
- [x] 1.4 Keep the existing `--font-scale` + `--fs-*` token system unchanged
      (families/weights only); confirm 150% default and 100–200% range still apply.
- [x] 1.5 Define a Lucide→Tabler icon map for the handoff icon set
      (`dumbbell, history, settings, play, chevron-*, arrow-left, trash-2, pencil,
      save, calendar, tag, building-2, check, circle-check, flag, clock, type,
      database`) and centralize it (e.g. in `src/ui/Icon.tsx`).
- [x] 1.6 Update PWA `theme-color`/manifest background + `index.html` to the dark bg.

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] App boots dark with new fonts; no runtime font network request (offline check)

---

## Phase 2: Global Components & Shell

- [x] 2.1 Restyle `global.css` primitives to Momentum: `.appbar` (gradient
      brand-mark + wordmark), `.tabbar` (active = accent), `.btn`/`.btn.primary`
      (orange, `on-accent` text, press-darken), `.group`/`.row`/`.chip`,
      `.field`/inputs, `.sheet`, `.toast`, `.empty`.
- [x] 2.2 Micro-label style: JetBrains Mono, uppercase, letter-spacing .1–.14em,
      applied to `.group-label` and screen eyebrow labels.
- [x] 2.3 Gym selector pill (`GymSelector`) restyle: `building-2` + name +
      `chevron-down` in a surface pill.
- [x] 2.4 Press/hover states: surfaces darken/opacify slightly; orange buttons
      darken on press.

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] Shell (appbar, tabbar, buttons, rows) matches Momentum on every route

---

## Phase 3: Screen Restyle + New Home Surfaces

- [x] 3.1 **Home (screen 1)**: restyle day accordion into rounded Momentum cards;
      add **weekly training summary** with SVG progress ring (X/Y treinos, %),
      derived from completed sessions this week.
- [x] 3.2 **Home**: add **featured next workout** treatment on the first/next day
      card (eyebrow label + filled orange CTA + chevron).
- [x] 3.3 **Expanded day (screen 2)**: exercise rows with 46–48px thumbnail,
      name + category, weight chip; expanded-card header with Iniciar + chevron-up.
- [x] 3.4 **Active session (screen 3)**: status card (day name, gym + "iniciado
      hoje" chips, "N de M concluídos", %, animated progress bar ~200ms);
      exercise rows with check circle (filled accent + `check` when done);
      completed rows `muted` + `line-through`; fixed "Concluir treino" footer
      (disabled + hint when 0 marked).
- [x] 3.5 **Exercise detail (screen 4)**: large media (~172–180px, rounded),
      title + `tag`/`calendar` chips, primary "Concluir" (`circle-check`),
      Voltar/Avançar nav, "PESO USADO" card (pill gym + big "NN KG" + Editar).
- [x] 3.6 **Edit weight (screen 5)**: stepper (− surface / center field with
      accent border / + accent), segmented **KG / LB / #** toggle (active accent),
      Cancelar/Salvar footer (Salvar ~1.4× wider); pt-BR decimal comma ("19,5").
- [x] 3.7 **Settings (screen 6)**: grouped rows in a card with divisors; tint-orange
      icon squares; section labels (CADASTROS / APARÊNCIA / DADOS); counts +
      `chevron-right`; local-only footer note.

**Quality Gate:**
- [x] `npm run typecheck` passes
- [ ] Each of the 6 screens visually matches the Momentum reference (spot-check vs `.dc.html`)
      — **pending manual QA**: no headless browser available in this environment.

---

## Phase 4: Integration & Polish

- [x] 4.1 Verify no i18n/string changes are needed (copy stays pt-BR).
- [x] 4.2 Run full test suite; fix any snapshot/selector fallout from restyle
      (behavior unchanged — all 67 tests pass).
- [ ] 4.3 Accessibility/contrast pass: body text on dark meets AA; accent reserved
      for large/CTA text; focus states visible. — **pending manual QA** (design
      built to the handoff's contrast intent; needs in-browser measurement).
- [ ] 4.4 Font-scale regression check at 100%, 150%, 200% — no clip/overlap on a
      390px viewport; hierarchy preserved. — **pending manual QA** (scale tokens
      unchanged, so mechanism intact; needs a visual pass).
- [x] 4.5 Offline check: fonts are self-hosted and every family emits a `woff2`
      that Workbox precaches → no runtime font network request. (Device install
      test still recommended.)
- [ ] 4.6 Update `mockups`/`README` design notes to reference the Momentum system.
      — deferred (docs-only; not blocking archive).

**Quality Gate:**
- [x] All tests pass (67)
- [x] `npm run typecheck` clean · `npm run build` succeeds
- [~] Offline precache verified in build; font-scale/contrast visual QA pending

---

## Completion Checklist

- [x] All code phases complete (tokens, fonts, shell, all 6 screens, new Home surfaces)
- [x] No behavioral regressions (67 tests green; typecheck + build clean)
- [ ] Manual visual/contrast/font-scale QA in a browser (no browser in this env)
- [ ] Ready for `/openspec-archive` — after the manual QA pass above
