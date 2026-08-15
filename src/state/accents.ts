/**
 * The accent colours the user can choose in Settings → Aparência.
 *
 * WHY A CURATED LIST AND NOT A FREE COLOUR PICKER
 *
 * The whole palette is calibrated around one accent: accent TEXT has to clear
 * 4.5:1 on --surface-0, white has to stay legible on the solid fill, and the
 * danger amber (#ffa94d) was placed a deliberate distance away in hue *and*
 * lightness so "Excluir" never reads as an ordinary brand action. An arbitrary
 * colour breaks all three at once, and normalising a warm hue to this lightness
 * produces an olive that looks nothing like the colour the user tapped.
 *
 * HOW EACH COLOUR IS BUILT
 *
 * Every entry is the default red with its **hue rotated**, holding two things
 * fixed:
 *   · relative luminance = 0.1983 (the red's) — this is what carries the
 *     contrast guarantees, since contrast is a function of luminance alone;
 *   · OKLCH chroma <= 0.225 (the red's) — so no option is more vivid than the
 *     brand colour.
 *
 * `accent2` — the bottom stop of the 180° gradient — is `0.79 x accent` per
 * channel, the same factor that relates #ec2c2e to #ba2324.
 *
 * Applied to the red's own hue the rule reproduces #ec2c2e / #ba2324 exactly,
 * which is the evidence that it is the rule the identity was already using.
 *
 * The warm band (orange through olive) is deliberately absent: sRGB cannot be
 * vivid there at this luminance, and it is where the danger amber lives.
 *
 * All of the above is re-derived and asserted in `accents.test.ts` — adding a
 * colour that violates it fails the suite rather than shipping.
 */
export interface Accent {
  id: AccentId
  /** pt-BR label, shown in Aparência and read by screen readers. */
  name: string
  /** --accent */
  accent: string
  /** --accent-2 (gradient bottom stop) */
  accent2: string
  /** --accent-rgb: the channels of `accent`, for the rgba() tints to derive. */
  rgb: string
}

export type AccentId =
  | 'red'
  | 'raspberry'
  | 'pink'
  | 'fuchsia'
  | 'magenta'
  | 'amethyst'
  | 'purple'
  | 'indigo'
  | 'violet'
  | 'royal'
  | 'blue'
  | 'petrol'
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'green'

/** Ordered as a walk around the hue circle from the brand red, so the grid
 *  reads as a spectrum rather than a bag of colours. */
export const ACCENTS: readonly Accent[] = [
  { id: 'red', name: 'Vermelho', accent: '#ec2c2e', accent2: '#ba2324', rgb: '236, 44, 46' },
  { id: 'raspberry', name: 'Framboesa', accent: '#e9286a', accent2: '#b82054', rgb: '233, 40, 106' },
  { id: 'pink', name: 'Rosa', accent: '#de3097', accent2: '#af2677', rgb: '222, 48, 151' },
  { id: 'fuchsia', name: 'Fúcsia', accent: '#d239b2', accent2: '#a62d8d', rgb: '210, 57, 178' },
  { id: 'magenta', name: 'Magenta', accent: '#c342cc', accent2: '#9a34a1', rgb: '195, 66, 204' },
  { id: 'amethyst', name: 'Ametista', accent: '#ac4ee5', accent2: '#883eb5', rgb: '172, 78, 229' },
  { id: 'purple', name: 'Roxo', accent: '#9159f8', accent2: '#7346c4', rgb: '145, 89, 248' },
  { id: 'indigo', name: 'Índigo', accent: '#7861ff', accent2: '#5f4dc9', rgb: '120, 97, 255' },
  { id: 'violet', name: 'Violeta', accent: '#576bff', accent2: '#4555c9', rgb: '87, 107, 255' },
  { id: 'royal', name: 'Azul-royal', accent: '#0076fc', accent2: '#005dc7', rgb: '0, 118, 252' },
  { id: 'blue', name: 'Azul', accent: '#007ed8', accent2: '#0064ab', rgb: '0, 126, 216' },
  { id: 'petrol', name: 'Azul-petróleo', accent: '#0084b6', accent2: '#006890', rgb: '0, 132, 182' },
  { id: 'cyan', name: 'Ciano', accent: '#008894', accent2: '#006b75', rgb: '0, 136, 148' },
  { id: 'teal', name: 'Verde-água', accent: '#008c70', accent2: '#006f58', rgb: '0, 140, 112' },
  { id: 'emerald', name: 'Esmeralda', accent: '#008e55', accent2: '#007043', rgb: '0, 142, 85' },
  { id: 'green', name: 'Verde', accent: '#008f37', accent2: '#00712b', rgb: '0, 143, 55' },
] as const

/** The shipped brand colour. Must match the --accent block in tokens.css, or
 *  the app paints in one colour and then jumps to the other on startup. */
export const DEFAULT_ACCENT_ID: AccentId = 'red'

export const DEFAULT_ACCENT: Accent = ACCENTS[0]

/** Resolve a stored id. Anything unrecognised — tampered storage, or a colour
 *  dropped from the list in a later version — falls back to the default rather
 *  than leaving the app with no accent at all. */
export function resolveAccent(id: string | null | undefined): Accent {
  return ACCENTS.find((a) => a.id === id) ?? DEFAULT_ACCENT
}

export function isAccentId(id: unknown): id is AccentId {
  return typeof id === 'string' && ACCENTS.some((a) => a.id === id)
}
