# Proposal: Redesign "Momentum" — Dark Premium

**Change ID:** `redesign-momentum-dark`
**Created:** 2026-07-10
**Status:** Implementation Complete (code) — manual visual QA pending
**Implemented:** 2026-07-10 (Direction A "Momentum", dark-only)

---

## Problem Statement

The current MyOneGym UI uses a light/dark "white · near-black · muted terracotta"
palette with system fonts. It is functional but visually flat: no strong brand
identity, weak hierarchy on the Home screen, and no at-a-glance sense of weekly
progress or "what to train next".

The `design_handoff_myonegym/` bundle delivers a high-fidelity redesign covering
all 6 screens. It proposes two dark-premium directions; the team selected
**Direction A — "Momentum"** (refined, calm, Sora + Manrope, ~22px radii, weekly
progress ring, featured next-workout card) and a **dark-only** theme.

Users are affected on every screen: they get a more legible, more motivating, more
cohesive interface. The pain today is a low-identity UI with no motivational
surface (progress, next workout) and no distinctive visual language.

## Proposed Solution

Re-skin the existing React PWA to the **Momentum** design system, keeping all
current behavior and data flow intact. Concretely:

- **Design tokens (dark-only).** Replace `tokens.css` palette with the Momentum
  tokens: `bg #0b0b0e`, layered surfaces, orange accent `#ff5a36` (+ gradient
  `#ff7a52`, soft tint, accent border, `on-accent #160a06`), muted/dim text.
  Adopt Momentum radii (cards 22px, rows 16px, chips/buttons 11–15px, pills 999px).
  **Remove the light theme** — the app ships dark-only.
- **Typography.** Introduce **Sora** (titles) + **Manrope** (body) + **JetBrains
  Mono** (uppercase micro-labels, letter-spacing .1–.14em), self-hosted for
  offline/PWA. Keep the existing single `--font-scale` typography-scale system
  (150% default, user-adjustable) — only the font *families* and per-role weights
  change, not the scale mechanism.
- **Home restyle + two new surfaces.** Restyle the day accordion into rounded
  Momentum cards, and add (1) a **weekly training summary** with an SVG progress
  ring derived from completed sessions this week, and (2) a **featured next
  workout** treatment on the first/next day card with a filled orange CTA.
- **Per-screen restyle.** Apply the system to Expanded day, Active session
  (status card, progress bar, completion styling), Exercise detail (large media,
  chips, "peso usado" card), Edit weight (stepper + segmented KG/LB/# toggle),
  and Settings (grouped rows with tint-orange icon squares, section labels).
- **Icons.** Map the handoff's Lucide names to the project's existing Tabler
  webfont icons (closest equivalents); no new icon dependency.

## Scope

### In Scope
- New dark-only Momentum design tokens (palette, radii, spacing) in `tokens.css`.
- Self-hosted Sora / Manrope / JetBrains Mono fonts and font-role wiring.
- Restyle of all 6 screens' components/CSS to the Momentum system.
- Home **weekly training summary** (progress ring) and **featured next workout**.
- Icon-name mapping from Lucide → Tabler for the redesigned surfaces.
- Updating the PWA theme-color / manifest background to the dark palette.

### Out of Scope
- Direction B ("Blaze") and any light-theme variant.
- Any change to data model, persistence, gyms/weights/session logic or routing.
- New exercise media/GIF assets (existing per-exercise media is reused).
- New settings or CRUD capabilities beyond what already exists.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database  | No  | No schema or data changes. |
| API       | No  | No backend. |
| State     | No* | *Weekly-summary values are **derived** from existing session history; no new persisted state. |
| UI        | Yes | Token overhaul, fonts, and restyle of all 6 screens; two new Home surfaces. |

## Architecture Considerations

- Fits the existing token-driven CSS approach: nearly all visual change flows
  through `tokens.css` + per-feature CSS, so components change minimally.
- Preserves the established **single typography-scale** system (one `--font-scale`
  knob, user-adjustable) mandated by app-foundation — only font families/weights
  change. No regression to the adjustable-font-size capability.
- Dark-only simplifies theming: drop the `prefers-color-scheme: dark` override
  block and make the dark palette the base `:root`.
- Weekly summary reuses the existing session/history data; it is a derived,
  read-only view — no new store or table.
- Fonts are **self-hosted** (not Google Fonts CDN) to keep the app fully offline
  and installable.

## Success Criteria

- [ ] App renders in the dark Momentum palette with orange accent on all 6 screens.
- [ ] Titles use Sora, body uses Manrope, micro-labels use JetBrains Mono; fonts
      load offline (no network request at runtime).
- [ ] Home shows a weekly progress ring reflecting completed sessions this week,
      and a featured next-workout card with a filled orange CTA.
- [ ] The `--font-scale` control still rescales the whole app (100%–200%) with
      hierarchy preserved; no clipping/overlap at any supported size.
- [ ] No behavioral regressions: all existing integration tests pass unchanged.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Self-hosted fonts inflate bundle / slow first paint | Med | Med | Subset to needed weights; `font-display: swap`; preload primary weights. |
| Removing light theme regresses low-light/OS preference users | Low | Med | Product decision (dark-premium identity); dark palette meets contrast targets. |
| Lucide→Tabler icon mapping lacks an exact equivalent | Med | Low | Pick nearest Tabler glyph per icon; document the mapping in tasks. |
| Orange-on-dark contrast fails AA for small text | Low | Med | Use accent for large/CTA text; keep body on `--text`/`--muted`; verify contrast. |
| Font-family swap disturbs the tuned typography scale | Low | Low | Change families/weights only; keep `--font-scale` tokens and defaults intact. |
