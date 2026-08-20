/**
 * How an external media URL should be presented — a warm-up's, or an exercise
 * video's. The two ask the same question of the same kind of address.
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
export type EmbedMediaKind = 'image' | 'video' | 'embed'

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
export function embedMediaKind(url: string): EmbedMediaKind {
  const path = pathOf(url.trim())
  if (VIDEO_RE.test(path)) return 'video'
  if (embedUrl(url)) return 'embed'
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
export function embedUrl(url: string): string | null {
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
  // instagram.com/{reel|p|tv}/{code} — the /embed endpoint is the one meant to
  // be framed; the post page itself is not. It takes no time parameters, which
  // is why `supportsTimeRange` says no for it.
  m = clean.match(/^https?:\/\/(?:www\.)?instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i)
  if (m) return `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed`

  return null
}

/**
 * True when the provider honours a start/end time on its embed.
 *
 * **The single place that decides**, consulted by the form and by the player
 * alike, so a screen can never offer a field the player will ignore — the same
 * principle that already makes validation and rendering read one classification
 * of a URL.
 *
 * YouTube takes `start`/`end`. Instagram's embed exposes no time parameter at
 * all: there is no way to ask it for a stretch. Vimeo is left out because the
 * player URL's `#t=` is a fragment the app does not currently build.
 */
export function supportsTimeRange(url: string): boolean {
  return YOUTUBE_HOST_RE.test(url.trim())
}

const YOUTUBE_HOST_RE =
  /^https?:\/\/(?:(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/|youtu\.be\/)/i

/**
 * `embedUrl` with the user's own start/end applied, where the provider takes
 * them. Falls back to the plain embed everywhere else — including a video that
 * carries a range the current URL cannot honour, which is kept on the record on
 * purpose (see `ExerciseVideo`).
 */
export function embedUrlWithRange(
  url: string,
  opts: { startSec?: number; endSec?: number; loop?: boolean; autoplay?: boolean } = {},
): string | null {
  const base = embedUrl(url)
  if (!base) return null

  // Only YouTube takes any of this. Instagram's embed exposes no parameters —
  // and needs none for the loop: a reel repeats on its own.
  if (!supportsTimeRange(url)) return base

  const u = new URL(base)
  // An explicit start replaces whatever the shared address carried — the user
  // typed the more specific thing.
  if (opts.startSec !== undefined) u.searchParams.set('start', String(opts.startSec))
  if (opts.endSec !== undefined) u.searchParams.set('end', String(opts.endSec))
  if (opts.loop) {
    // NOT `loop=1&playlist=<id>`. That repeats the *video*: it restarts at zero
    // and drops the trim, because `start`/`end` apply to the first pass only —
    // so a segment looped that way plays the whole thing from the top on the
    // second lap. `enablejsapi=1` lets the player be driven back to the start of
    // the segment instead; see `lib/youtubeLoop`.
    u.searchParams.set('enablejsapi', '1')
  }
  if (opts.autoplay) {
    // `mute=1` is not a preference, it is the price: browsers refuse to
    // autoplay audible media, and an unmuted request is simply declined —
    // leaving a video that was supposed to start doing nothing at all.
    u.searchParams.set('autoplay', '1')
    u.searchParams.set('mute', '1')
  }
  return u.toString()
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
  const clean = url.trim()
  return (
    /^https?:\/\/(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/shorts\//i.test(clean) ||
    // A reel is vertical by definition of the format, so the URL does say so.
    // A /p/ or /tv/ post does not, and is left to the default.
    /^https?:\/\/(?:www\.)?instagram\.com\/reels?\//i.test(clean)
  )
}

/** Keep a start time if the original URL carried one — "assista a partir de
 *  1:30" is usually the whole point of the link. */
function youtube(id: string, original: string): string {
  const t = original.match(/[?&](?:t|start)=(\d+)/)
  const base = `https://www.youtube-nocookie.com/embed/${id}`
  return t ? `${base}?start=${t[1]}` : base
}

/** True for a URL this app is willing to store as external media. */
export function isValidEmbedUrl(url: string): boolean {
  return HTTP_RE.test(url.trim())
}

/**
 * The host a link points at, for the card that says where the tap will go —
 * "youtube.com" is the whole reason the user recognises it. Falls back to the
 * raw URL if it cannot be parsed, which is better than showing nothing.
 */
export function embedLinkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
