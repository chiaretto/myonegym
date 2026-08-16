/**
 * How a warm-up's URL should be presented.
 *
 * Deliberately **derived from the URL**, never stored on the record. A `kind`
 * column would be a second source of truth about the same string, free to drift
 * from it — and there is no durability argument for one here: unlike
 * `Session.kind`, which is snapshotted because history must not change
 * retroactively, nothing about a warm-up is rewritten if this classification
 * ever gets smarter. The URL is the fact; this is a reading of it.
 *
 * The same function backs validation and rendering, so the two can never
 * disagree about what a URL is.
 */
export type WarmupMediaKind = 'image' | 'video' | 'embed'

const HTTP_RE = /^https?:\/\/.+/i
/** Extension tests run against the path only — a query string must not decide
 *  the kind, and `…/a.mp4?token=x` is still a video. Only video needs a test:
 *  image is what everything else falls back to. */
const VIDEO_RE = /\.(mp4|webm)$/i

/** The URL's path, lowercased, with query and fragment stripped. */
function pathOf(url: string): string {
  const withoutFragment = url.split('#')[0]
  return withoutFragment.split('?')[0]
}

/**
 * Classify a warm-up URL: video, embeddable provider, or **image**.
 *
 * Image is the default, not a fourth "unknown" case. Plenty of real image URLs
 * carry no extension — a CDN path, `?format=jpg`, a signed asset — and treating
 * those as something-else pushed the user out of the app for a picture that
 * would have rendered fine. Guessing image is the useful guess.
 *
 * When the guess is wrong the `<img>` simply fails, and the viewer's failure
 * state already offers to open the address outside the app. That path is the
 * safety net, so nothing is lost by defaulting optimistically.
 */
export function warmupMediaKind(url: string): WarmupMediaKind {
  const path = pathOf(url.trim())
  if (VIDEO_RE.test(path)) return 'video'
  if (warmupEmbedUrl(url)) return 'embed'
  return 'image'
}

/**
 * The player URL for a provider that can be embedded, or `null` when the URL is
 * not one. A watch page is not a player: `youtube.com/watch?v=ID` in an iframe
 * is refused, `youtube.com/embed/ID` is not.
 *
 * YouTube goes through **youtube-nocookie.com**, the privacy-enhanced host
 * Google publishes for exactly this: it holds back the tracking cookies until
 * playback starts. It does not make the embed private — the provider still sees
 * the request and the viewer's address — but it is strictly less than the
 * default, for the same markup.
 */
export function warmupEmbedUrl(url: string): string | null {
  const clean = url.trim()
  let m: RegExpMatchArray | null

  // youtube.com/watch?v=ID
  m = clean.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/i)
  if (m) return youtube(m[1], clean)
  // youtu.be/ID
  m = clean.match(/^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/i)
  if (m) return youtube(m[1], clean)
  // youtube.com/shorts/ID and /embed/ID
  m = clean.match(/^https?:\/\/(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})/i)
  if (m) return youtube(m[1], clean)
  // vimeo.com/123456789 and player.vimeo.com/video/123456789
  m = clean.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i)
  if (m) return `https://player.vimeo.com/video/${m[1]}`
  m = clean.match(/^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i)
  if (m) return `https://player.vimeo.com/video/${m[1]}`

  return null
}

/**
 * True when the URL says the video is **vertical** — a YouTube Short.
 *
 * Only `/shorts/` is treated as portrait, because only it actually says so. A
 * Short shared as `youtu.be/ID` or `watch?v=ID` is indistinguishable from a
 * landscape video at this level, and guessing portrait for those would
 * pillarbox every ordinary video into a thin strip. Providers do not tell us
 * the aspect ratio without an API call, and this app does not make one.
 */
export function isPortraitEmbed(url: string): boolean {
  return /^https?:\/\/(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/shorts\//i.test(url.trim())
}

/** Keep a start time if the original URL carried one — "assista a partir de
 *  1:30" is usually the whole point of the link. */
function youtube(id: string, original: string): string {
  const t = original.match(/[?&](?:t|start)=(\d+)/)
  const base = `https://www.youtube-nocookie.com/embed/${id}`
  return t ? `${base}?start=${t[1]}` : base
}

/** True for a URL this app is willing to store as a warm-up. */
export function isValidWarmupUrl(url: string): boolean {
  return HTTP_RE.test(url.trim())
}

/**
 * The host a link points at, for the card that says where the tap will go —
 * "youtube.com" is the whole reason the user recognises it. Falls back to the
 * raw URL if it cannot be parsed, which is better than showing nothing.
 */
export function warmupLinkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
