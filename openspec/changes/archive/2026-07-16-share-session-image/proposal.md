# Proposal: Share a Workout Session as an Image

**Change ID:** `share-session-image`
**Created:** 2026-07-16
**Status:** Implementation Complete
**Completed:** 2026-07-16

---

## Problem Statement

- **What problem are we solving?** A finished workout is a moment worth showing
  off, but today it is trapped in the app. The only way out is
  **Exportar backup (JSON)** — a machine format nobody wants to post. There is
  **no way to share a session** to WhatsApp, Instagram, or a training-partner
  chat.
- **Who is affected?** Anyone who completes a workout and wants to share it.
- **What's the current pain point?** The user has to screenshot the session
  detail manually — which crops badly, captures the app bar and the browser
  chrome, and leaks whatever the phone's font-scale setting happens to be. Worse,
  a raw screenshot always exposes **weights**, which many users consider private.
  Sharing a workout should not force sharing how much you lift.

## Proposed Solution

Add **two share buttons** to the **completed** session detail (`SessionPage`,
`readOnly` branch), each producing a PNG that looks like the session detail
screen and hands it to the OS share sheet:

| Button | Includes | Omits |
|--------|----------|-------|
| **Compartilhar** (detailed) | weights per exercise + training duration | — |
| **Compartilhar sem pesos** (simplified) | exercise list + done state | weights, duration |

Both cards carry the day name, gym, **absolute date**, the exercise list
(thumbnail, name, category, done state) and the done count.

**Rendering: a hand-written Canvas 2D renderer, no new dependency.** The card is
painted at a **fixed size** (1080px wide, `deviceScale` 2), so the output is
identical on every device and **immune to the user's `--font-scale`** setting —
a shared image is a fixed design, not a responsive screen. The work splits three
ways so the logic stays testable despite jsdom having no canvas:

```
src/features/session/share/
  shareModel.ts   — pure: (session, entries, weights, …, variant) → ShareCard   [unit-tested]
  renderCard.ts   — canvas 2D: ShareCard → Blob                                  [manual/visual]
  shareCard.ts    — Blob → navigator.share, else download                        [unit-tested, mocked]
```

**Delivery:** `navigator.canShare({ files })` → `navigator.share(...)`; otherwise
reuse the **existing download pattern** from `DataPage.tsx` (`Blob` →
`createObjectURL` → `<a download>` → `revokeObjectURL`) and toast "Imagem salva.".

## Scope

### In Scope
- Two share actions on the **completed** session detail only.
- `shareModel.ts` — pure model builder, one `variant: 'full' | 'lite'` switch.
- `renderCard.ts` — Canvas 2D painter using the Momentum tokens (dark-only).
- `shareCard.ts` — Web Share API with download fallback + toast/error handling.
- Exercise **thumbnails** in the card, loaded `crossOrigin="anonymous"` with a
  **placeholder fallback** on CORS/404/offline failure.
- Unit tests for `shareModel` + `shareCard` (share/download dispatch mocked).

### Out of Scope
- **Sharing an in-progress session** — the buttons live in the `readOnly` branch
  only. A session with no `completedAt` has no duration to show.
- **A preview modal** — the card goes straight to the share sheet (chosen over a
  `Sheet` preview to keep the surface small; revisit if users ask to see first).
- **Sharing from the history list** (`SessionsPage`) — detail screen only.
- **Light-theme / custom-branded cards, captions, or a share-text string.**
- Sharing weight history, notes, or charts.

### Decisions taken (flag if you disagree)
1. **Absolute date, not relative.** The screen says "Concluído hoje"; an image
   outlives the day it was made and lands in someone's gallery forever, so the
   card prints **"16 jul 2026"**. Relative labels would silently become lies.
2. **Unset weights print no badge.** The screen shows a **"definir"** hint — that
   is a call-to-action for the owner and meaningless to a viewer, so the detailed
   card simply omits the badge for that row.
3. **The card is "similar to", not pixel-identical to, the screen.** Canvas
   re-implements the layout; it will drift from `session.css` over time. Accepted
   — see Risks.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Reads existing `Session`/`SessionEntry`/`Weight`; nothing persisted. |
| Data layer | No | No `repos.ts` change; the page already has every hook it needs. |
| State | No | No store; generation is a one-shot async action per tap. |
| API | No | Local-only, as ever. |
| UI | Yes | `SessionPage.tsx`: two buttons in the `readOnly` branch + `session.css` rules. |
| New module | Yes | `src/features/session/share/` (3 files). |
| Deps | **No** | Canvas 2D is built in — deliberately no `html-to-image`. |
| Tests | Yes | New `share.test.ts`; canvas painting stays manual (jsdom has no 2D context). |
| i18n / copy | Yes (small) | pt-BR button labels, toasts, filename. |

## Architecture Considerations

- **Fits the local-only, offline-first model.** No upload, no backend, no new
  dependency — the PNG is produced on-device and handed to the OS.
- **Reuses the existing download path.** The fallback is the same
  `Blob`/`createObjectURL`/`revokeObjectURL` dance `DataPage.tsx` already uses for
  backup export; no new pattern is introduced.
- **Live weights, consistent with the recap.** The card reads the **current**
  per-gym target via the same `useGymWeights` map the screen uses, honouring the
  spec's existing "the recap reads the live target" rule. The session still
  stores no weight of its own.
- **Snapshot names survive deletion.** The card renders `entry.exerciseName`, so
  a deleted source exercise degrades to name + placeholder — same as the screen.
- **Pure core, thin shell.** jsdom cannot paint canvas, so all decisions
  (what text, which rows, which variant omits what) live in `shareModel.ts` where
  Vitest can reach them; `renderCard.ts` stays dumb pixels.
- **Fonts must be ready before painting.** Sora/Manrope/JetBrains Mono ship
  locally via `@fontsource` (no CORS risk), but canvas silently falls back to a
  system font if it paints too early → `await document.fonts.ready` first.
- **No icon glyphs on canvas.** `@tabler/icons-webfont` is an icon font; rather
  than depend on glyph metrics, the check mark and placeholder are drawn as plain
  vector paths.

## Success Criteria

- [ ] A completed session detail shows **two** share buttons; an in-progress one shows **none**.
- [ ] **Compartilhar** produces a PNG with weights and duration; **Compartilhar sem pesos** produces one with **neither** (no badge column, no duration line).
- [ ] Both cards show day name, gym, absolute date, done count, and every entry with thumbnail, name, category, and done state.
- [ ] On a device with Web Share + files, the OS share sheet opens with the PNG attached.
- [ ] Without Web Share support, the PNG downloads as `myonegym-<dia>-<data>.png` and a toast confirms.
- [ ] A `mediaUrl` that fails CORS renders the **placeholder** — `toBlob` never throws `SecurityError`.
- [ ] The card is byte-identical regardless of the Aparência **font-scale** setting.
- [ ] Cancelling the OS share sheet shows **no** error toast.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Canvas taint** — a remote `mediaUrl` without CORS headers makes `toBlob` throw `SecurityError`, killing the whole share | **High** | **High** | Load each image with `crossOrigin="anonymous"` and a timeout; **any** failure → placeholder. Worst case the card is all placeholders, never an error. |
| Web Share with files unsupported (desktop Chrome/Firefox, older iOS) | High | Low | Feature-detect `navigator.canShare({files})`; fall back to download. |
| Fonts unloaded → canvas paints in a system font | Med | Med | `await document.fonts.ready` before the first `fillText`. |
| Canvas layout drifts from `session.css` as the screen evolves | Med | Low | Accepted by design (the card is "similar", not a mirror). Tokens are read from one shared constants block in `renderCard.ts` to limit drift. |
| Painting is untestable in jsdom (no 2D context) | High | Low | Keep all logic in the pure `shareModel`; verify pixels manually at 390px + a real share on device. |
| A long day (15+ exercises) makes a huge/slow image | Low | Low | Card grows vertically; rows are cheap. Verify with the example dataset's longest day. |
| User taps share twice → two share sheets | Low | Low | Disable the buttons while generating (`busy` state). |
| `navigator.share` rejects with `AbortError` on cancel | High | Low | Swallow `AbortError` specifically; only real failures toast an error. |

---

## Implementation Notes (what the build changed)

Three things the plan got wrong, all found by rendering the card rather than
reasoning about it:

1. **Emphasis was backwards.** The plan said "mirror the screen", so the card
   first copied `.entry.done` (dim + line-through). Rendered, that made the
   exercises the user *completed* look cancelled and the ones they *skipped* look
   like the highlight — precisely inverted for a brag image. The card now renders
   done at full strength and lets skipped recede. This is the one place the card
   deliberately contradicts the screen, and it is now a spec requirement.
2. **The CORS risk is real and partial, not theoretical.** The bundled example
   routine proved it unprompted: its hipertrofia.org GIF sends no
   `Access-Control-Allow-Origin`, so that row falls back to the placeholder, while
   the other five exercises' media (a CORS-friendly host) draw fine. So a typical
   card is *mostly* thumbnails with occasional placeholders — graceful, and worth
   knowing when users paste media URLs from arbitrary sites.
3. **`ctx.roundRect` was too new.** Swapped for an `arcTo` helper — `roundRect`
   needs Safari 16.4+, which is a poor bet for an installable PWA.

Also worth recording: `renderCard` has **no unit coverage** (jsdom has no 2D
context), so it was verified by driving the real app in headless Chromium — the
example routine, the real UI at 390px, both share actions, real canvas. The
font-scale requirement was checked by hex-comparing two renders at scale 1.0 and
2.0 (byte-identical, 135,793 bytes). Re-run that way after any change to the
painter; the test suite will not catch a regression there.

---

## Archive Information

**Archived:** 2026-07-16
**Duration:** 0 days (created, implemented and archived 2026-07-16)
**Outcome:** Successfully implemented

### Files Modified
- `src/features/session/share/shareModel.ts` — **new**; pure `buildShareCard`,
  the `'full' | 'lite'` variant switch, and every "what goes on the image" call
- `src/features/session/share/renderCard.ts` — **new**; Canvas 2D painter at a
  fixed 1080px, `crossOrigin` media loading with a placeholder fallback,
  `arcTo` rounded rects, `document.fonts.ready` gate
- `src/features/session/share/shareCard.ts` — **new**; `navigator.share` with a
  download fallback, `AbortError` handling, `shareFilename`
- `src/features/session/share/share.test.ts` — **new** (8 tests)
- `src/features/session/share/shareCard.test.ts` — **new** (8 tests)
- `src/features/session/session.share.integration.test.tsx` — **new** (7 tests)
- `src/features/session/SessionPage.tsx` — two share buttons in the `readOnly`
  branch, `sharing` state, toasts
- `src/features/session/session.css` — `.share-row`
- `src/lib/format.ts` — added `fmtFullDate` (absolute pt-BR date with year)
- `README.md` — the two share actions, fixed-design/absolute-date behaviour, and
  the CORS caveat on exercise media

**No new dependencies** — `package.json` untouched (Canvas 2D is built in).

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — **added** *Share a Completed
  Session as an Image* and *Deliver the Session Image* (15 scenarios); Purpose
  now mentions sharing. No requirements modified or removed.

### Verification
- `npm test` (152/152), `npm run typecheck`, `npm run build` — all pass
- Real-browser pass (headless Chromium against the dev server): the bundled
  example routine driven through the real UI at 390px → both PNGs produced and
  downloaded, toast shown, no page errors
- Taint mitigation **proven**: a cross-origin PNG with no `Access-Control-Allow-
  Origin` was blocked by the browser and the card still rendered (placeholder
  fallback, `toBlob` never threw). The example dataset reproduced this on its
  own via its hipertrofia.org GIF
- Font-scale independence **proven**: byte-identical renders at scale 1.0 vs 2.0
