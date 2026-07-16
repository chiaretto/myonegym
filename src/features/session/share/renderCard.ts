import type { ShareCard, ShareRow } from './shareModel'

/**
 * Canvas painter for the shared session card.
 *
 * Everything here is in **fixed design units** and scaled by `SCALE` on output —
 * the card must never read `--font-scale` (see the app-foundation typography
 * spec). A shared image is a fixed design, not a responsive screen, so it looks
 * the same no matter how the user set up Aparência.
 *
 * The tokens below are copied from `tokens.css` (Momentum, dark-only). They are
 * kept in one block so the drift from `session.css` stays cheap to fix — the
 * card is deliberately *similar to* the session detail, not a mirror of it.
 */
const C = {
  bg: '#0b0b0e', // --surface-0
  row: '#151519', // --surface-1
  chip: '#1d1d23', // --surface-2
  text: '#f4f4f6', // --text-primary
  dim: '#8b8b95', // --text-secondary
  muted: '#5f5f68', // --text-muted
  accent: '#ff5a36', // --accent
  accent2: '#ff7a52', // --accent-2 / --text-accent
  accentTint: 'rgba(255, 90, 54, 0.15)', // --bg-accent
  onAccent: '#160a06', // --on-accent
  border: 'rgba(255, 255, 255, 0.07)', // --border
} as const

const TITLE = "700 30px 'Sora', sans-serif"
const NAME = "600 16px 'Manrope', sans-serif"
const META = "500 13px 'Manrope', sans-serif"
const CAT = "500 12px 'Manrope', sans-serif"
const BADGE = "700 14px 'Manrope', sans-serif"
const UNIT = "600 11px 'Manrope', sans-serif"
const MARK = "700 12px 'JetBrains Mono', monospace"

const SCALE = 2 // 540 design units → 1080px PNG
const W = 540
const PAD = 28
const ROW_H = 64
const ROW_GAP = 6
const THUMB = 48
const CHECK = 24
/**
 * The screen dims and strikes through *done* entries — crossing an item off a
 * checklist reads as progress there. On a shared image that inverts: the work
 * you did would look cancelled and the exercises you skipped would look like the
 * highlight. So the card emphasises the opposite way — done stays full strength,
 * skipped recedes.
 */
const SKIPPED_ALPHA = 0.45

/** Rounded rect via arcTo — `ctx.roundRect` needs Safari 16.4+, too new to rely on. */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

function fillRRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  rrect(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

/** Truncate to `max` width with an ellipsis. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= max) lo = mid
    else hi = mid - 1
  }
  return `${text.slice(0, lo)}…`
}

/**
 * Load an exercise's media for the canvas.
 *
 * Media URLs are arbitrary and remote. Without `crossOrigin` a successful load
 * would **taint** the canvas and make `toBlob` throw `SecurityError`, killing the
 * whole share — not just the thumbnail. So: request CORS, and treat *any*
 * problem (no CORS headers, 404, offline, slow) as "no image". Never rejects.
 */
function loadImage(url: string, timeoutMs = 4000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = (v: HTMLImageElement | null) => {
      clearTimeout(timer)
      img.onload = img.onerror = null
      resolve(v)
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    img.onload = () => done(img.naturalWidth > 0 ? img : null)
    img.onerror = () => done(null)
    img.src = url
  })
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  ctx.save()
  rrect(ctx, x, y, size, size, 12)
  ctx.clip()
  const ar = img.naturalWidth / img.naturalHeight
  const [dw, dh] = ar > 1 ? [size * ar, size] : [size, size / ar]
  ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh)
  ctx.restore()
}

/** The "no media" placeholder — a vector echo of the `photo` glyph `Media` uses.
 *  Drawn by hand because `@tabler/icons-webfont` glyphs are unreliable on canvas. */
function drawPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  fillRRect(ctx, x, y, size, size, 12, C.chip)
  const cx = x + size / 2
  const cy = y + size / 2
  ctx.strokeStyle = C.muted
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.arc(cx - 5, cy - 5, 3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - 10, cy + 7)
  ctx.lineTo(cx - 2, cy - 1)
  ctx.lineTo(cx + 5, cy + 6)
  ctx.lineTo(cx + 9, cy + 2)
  ctx.stroke()
}

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, done: boolean) {
  if (done) {
    fillRRect(ctx, x, y, size, size, 8, C.accent)
    ctx.strokeStyle = C.onAccent
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x + size * 0.27, y + size * 0.52)
    ctx.lineTo(x + size * 0.43, y + size * 0.68)
    ctx.lineTo(x + size * 0.74, y + size * 0.34)
    ctx.stroke()
  } else {
    rrect(ctx, x + 0.75, y + 0.75, size - 1.5, size - 1.5, 8)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)' // --border-strong
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

/** A pill; returns its width so callers can right-align it. */
function drawBadge(ctx: CanvasRenderingContext2D, text: string, right: number, cy: number): number {
  // "22,5 KG" — the unit renders smaller and dimmer, like `.used-weight .unit`.
  const sp = text.lastIndexOf(' ')
  const value = sp === -1 ? text : text.slice(0, sp)
  const unit = sp === -1 ? '' : text.slice(sp + 1)

  ctx.font = BADGE
  const vw = ctx.measureText(value).width
  ctx.font = UNIT
  const uw = unit ? ctx.measureText(unit).width + 4 : 0

  const w = vw + uw + 22
  const h = 30
  const x = right - w
  fillRRect(ctx, x, cy - h / 2, w, h, 999, C.chip)

  ctx.textBaseline = 'middle'
  ctx.font = BADGE
  ctx.fillStyle = C.text
  ctx.fillText(value, x + 11, cy + 0.5)
  if (unit) {
    ctx.font = UNIT
    ctx.fillStyle = C.dim
    ctx.fillText(unit, x + 11 + vw + 4, cy + 1)
  }
  return w
}

function cardHeight(card: ShareCard): number {
  const rows = card.rows.length
  let h = PAD + 34 + 12 + 20
  if (card.durationLabel) h += 8 + 18
  h += 20
  h += rows * ROW_H + Math.max(0, rows - 1) * ROW_GAP
  h += 18 + 18 + PAD
  return h
}

/**
 * Paints `card` and resolves the PNG. Media loads in parallel first, then the
 * whole card is painted in one pass.
 */
export async function renderCard(card: ShareCard): Promise<Blob> {
  // Canvas silently falls back to a system font if it paints before the webfonts
  // are ready. Sora/Manrope/JetBrains Mono ship locally via @fontsource.
  await document.fonts?.ready

  const media = await Promise.all(card.rows.map((r) => (r.mediaUrl ? loadImage(r.mediaUrl) : null)))

  const h = cardHeight(card)
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = h * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível.')
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, h)

  let y = PAD

  // ── Header ────────────────────────────────────────────────────────────────
  ctx.font = TITLE
  ctx.fillStyle = C.text
  ctx.fillText(ellipsize(ctx, card.title, W - PAD * 2), PAD, y + 26)
  y += 34 + 12

  let x = PAD
  if (card.gymName) {
    ctx.font = META
    const label = ellipsize(ctx, card.gymName, 220)
    const w = ctx.measureText(label).width + 22
    fillRRect(ctx, x, y, w, 22, 999, C.accentTint)
    ctx.fillStyle = C.accent2
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + 11, y + 12)
    ctx.textBaseline = 'alphabetic'
    x += w + 10
  }
  ctx.font = META
  ctx.fillStyle = C.dim
  ctx.textBaseline = 'middle'
  ctx.fillText(card.dateLabel, x, y + 12)
  ctx.textBaseline = 'alphabetic'
  y += 20

  if (card.durationLabel) {
    y += 8
    ctx.font = META
    ctx.fillStyle = C.dim
    ctx.fillText(`Duração ${card.durationLabel}`, PAD, y + 13)
    y += 18
  }
  y += 20

  // ── Rows ──────────────────────────────────────────────────────────────────
  card.rows.forEach((row, i) => {
    drawRow(ctx, row, media[i], y)
    y += ROW_H + (i < card.rows.length - 1 ? ROW_GAP : 0)
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 18
  ctx.font = META
  ctx.fillStyle = C.dim
  ctx.textBaseline = 'middle'
  ctx.fillText(card.doneLabel, PAD, y + 9)
  ctx.font = MARK
  ctx.fillStyle = C.muted
  ctx.textAlign = 'right'
  ctx.fillText('MyOneGym', W - PAD, y + 9)
  ctx.textAlign = 'left'

  return toBlob(canvas)
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  row: ShareRow,
  img: HTMLImageElement | null,
  y: number,
) {
  ctx.save()
  if (!row.done) ctx.globalAlpha = SKIPPED_ALPHA

  fillRRect(ctx, PAD, y, W - PAD * 2, ROW_H, 16, C.row)

  const cy = y + ROW_H / 2
  drawCheck(ctx, PAD + 10, cy - CHECK / 2, CHECK, row.done)

  const tx = PAD + 10 + CHECK + 10
  if (img) drawCover(ctx, img, tx, cy - THUMB / 2, THUMB)
  else drawPlaceholder(ctx, tx, cy - THUMB / 2, THUMB)

  let right = W - PAD - 12
  if (row.weight) right -= drawBadge(ctx, row.weight, right, cy) + 12

  const nx = tx + THUMB + 12
  const avail = right - nx
  ctx.textBaseline = 'alphabetic'
  ctx.font = NAME
  ctx.fillStyle = C.text
  const name = ellipsize(ctx, row.name, avail)
  const ny = row.category ? cy - 2 : cy + 5
  ctx.fillText(name, nx, ny)

  if (row.category) {
    ctx.font = CAT
    ctx.fillStyle = C.dim
    ctx.fillText(ellipsize(ctx, row.category, avail), nx, cy + 16)
  }

  ctx.restore()
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem.'))),
      'image/png',
    )
  })
}
