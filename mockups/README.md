# MyOneGym — Reference Mockups

Static HTML previews of the app's primary screens, produced during the design
phase of the `bootstrap-myonegym` change proposal. Open any `.html` file
directly in a browser to view — no build step, no dev server.

They are **not** production code — treat them as a visual spec for the React
implementation. Palette values, spacing, and component patterns should carry
over 1:1.

## Files

| File | Screen | Notes |
|------|--------|-------|
| `home.html` | Home | Active-gym selector, day accordion, exercise rows with inline weight badge |
| `exercise-detail.html` | Exercise detail | Hero image, weight editor (stepper + unit toggle), history timeline with sparkline and per-entry delete affordance |
| `settings.html` | Settings | Active-gym context, cadastros menu (academias/categorias/exercícios/dias), data actions (gerar exemplo, exportar backup, exportar exercícios, importar) |

## Design system

### Palette

The app uses three colors: **white**, **near-black**, and a **muted terracotta
red**. Nothing else — no green, blue, orange, or vibrant reds. Every screen
must adapt to light and dark mode.

#### Light mode

| Token | Hex | Use |
|-------|-----|-----|
| `--surface-2` | `#FFFFFF` | Cards, phone canvas, icons on top of red |
| `--surface-1` | `#FAF6F5` | Subtle card interior (exercise rows) |
| `--surface-0` | `#F4EEEC` | Page background, thumbnail placeholders |
| `--text-primary` | `#1A1614` | Body text, headings |
| `--text-secondary` | `#6B615F` | Categories, dates, subtitles |
| `--text-muted` | `#A29996` | Hints, empty text |
| `--border` | `rgba(26, 22, 20, 0.09)` | Hairlines |
| `--border-strong` | `rgba(26, 22, 20, 0.18)` | Emphasized borders |
| `--bg-accent` | `#F7EAE7` | Blush — gym pill, hero, delta badges |
| `--border-accent` | `#D9B6B1` | Open-day border, "definir" badge, timeline delta borders |
| `--text-accent` | `#7A3634` | Text on blush, links |
| `--fill-accent` | `#B8524E` | Brand mark, primary CTA (Salvar), active toggle, current timeline dot |
| `--on-accent` | `#FFFFFF` | Text/icons on solid red fill |

#### Dark mode

Same structure, mirrored:

| Token | Hex |
|-------|-----|
| `--surface-2` | `#2A2624` |
| `--surface-1` | `#221E1D` |
| `--surface-0` | `#1B1817` |
| `--text-primary` | `#F5EFED` |
| `--text-secondary` | `#A79E9C` |
| `--text-muted` | `#6B615F` |
| `--border` | `rgba(245, 239, 237, 0.12)` |
| `--border-strong` | `rgba(245, 239, 237, 0.24)` |
| `--bg-accent` | `#3B2A28` |
| `--border-accent` | `#6D3E3A` |
| `--text-accent` | `#E6B5B0` |
| `--fill-accent` | `#C77373` |
| `--on-accent` | `#1A1614` |

### When to use each color

- **Full red fill** (`--fill-accent`) — reserved for decisive moments: brand
  mark, primary CTA (Salvar peso), active state of a toggle (KG selected),
  current point of a timeline. One per screen if possible.
- **Blush** (`--bg-accent`) — for informational context: active-gym pill,
  hero image background, "up"/"down" delta badges on history.
- **White / off-white / near-black** — carry all structure. Hierarchy comes
  from text weight and color, never from a second hue.

### Typography

- Font: use Anthropic Sans (or your brand font); the mockups fall back to a
  system-ui stack.
- **Sentence case** everywhere. Never Title Case, never ALL CAPS.
- Two weights: **400** regular, **500** medium. Do not use 600/700.
- Sizes (px): caption 11 · body 13–15 · title 20 · display 44 (weight value).

### Icons

Tabler outline webfont. Install `@tabler/icons-webfont`; render as
`<i class="ti ti-{name}"></i>`. Icons used in the mockups:

`ti-barbell` · `ti-settings` · `ti-building` · `ti-chevron-down` ·
`ti-chevron-up` · `ti-chevron-right` · `ti-photo` · `ti-info-circle` ·
`ti-arrow-left` · `ti-arrow-up` · `ti-arrow-down` · `ti-dots-vertical` ·
`ti-tag` · `ti-tags` · `ti-calendar-event` · `ti-minus` · `ti-plus` ·
`ti-device-floppy` · `ti-history` · `ti-trash` · `ti-wand` · `ti-download` ·
`ti-upload` · `ti-share-2` · `ti-wifi` · `ti-battery`

### Spacing

- Corner radius: `12px` for cards, `10px` for buttons, `8px` for controls,
  `999px` for pills, `28px` for the phone frame in the mockup.
- Padding: `14px` inside cards, `8–12px` inside list rows.
- Gaps: `8–12px` between major sections.

## Notes for implementation

- The mockups render at **340px wide** inside a "phone" frame. The real app
  should fill the mobile viewport (`100vw`), with a soft max-width around
  480px for larger screens.
- The **weight badge on Home rows** shows the current weight for the active
  gym; when empty, it prompts action ("definir"). See
  `openspec/changes/bootstrap-myonegym/specs/home-navigation/spec.md`.
- The **history timeline** is scoped to the active gym. Deleting the newest
  entry reverts the active weight to the previous entry (or empty if that was
  the only one). See
  `openspec/changes/bootstrap-myonegym/specs/weights/spec.md`.
- **History is not exported** — the full-backup JSON contains the current
  weight per `(gym, exercise)` only. See
  `openspec/changes/bootstrap-myonegym/specs/data-portability/spec.md`.
- Delete affordance in the mockup is a small always-visible trash icon at the
  end of each row. A confirmation dialog is required before removal (not
  drawn in the mockup — implement per the spec).
