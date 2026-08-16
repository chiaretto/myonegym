import { describe, expect, it } from 'vitest'
import {
  isPortraitEmbed,
  isValidWarmupUrl,
  warmupEmbedUrl,
  warmupLinkLabel,
  warmupMediaKind,
} from './warmupMedia'

describe('warmupMediaKind', () => {
  it.each(['https://x.com/a.png', 'https://x.com/a.jpg', 'https://x.com/a.jpeg',
           'https://x.com/a.webp', 'https://x.com/a.gif'])('%s is an image', (url) => {
    expect(warmupMediaKind(url)).toBe('image')
  })

  it.each(['https://x.com/a.mp4', 'https://x.com/a.webm'])('%s is a video', (url) => {
    expect(warmupMediaKind(url)).toBe('video')
  })

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
    'https://player.vimeo.com/video/123456789',
  ])('%s is an embed', (url) => {
    expect(warmupMediaKind(url)).toBe('embed')
  })

  it.each([
    // No extension, no known provider: tried as an image, because plenty of
    // real image URLs look exactly like this.
    'https://cdn.x.com/abc123',
    'https://x.com/foto?format=jpg&w=800',
    'https://x.com/artigo',
    'https://x.com/guia.pdf',
    // A YouTube URL with no usable id is not a player either.
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/feed/subscriptions',
  ])('%s falls back to image', (url) => {
    expect(warmupMediaKind(url)).toBe('image')
  })

  it('ignores the query string and the fragment', () => {
    // A signed media URL carries a token; it is still a video.
    expect(warmupMediaKind('https://x.com/a.mp4?token=abc&t=1')).toBe('video')
    expect(warmupMediaKind('https://x.com/a.gif#top')).toBe('image')
    // And a query that merely mentions an extension must not make it a video.
    expect(warmupMediaKind('https://x.com/watch?file=a.mp4')).toBe('image')
  })

  it('is case-insensitive on the extension', () => {
    expect(warmupMediaKind('https://x.com/A.PNG')).toBe('image')
    expect(warmupMediaKind('https://x.com/A.MP4')).toBe('video')
  })

  it('tolerates surrounding whitespace', () => {
    expect(warmupMediaKind('  https://x.com/a.png  ')).toBe('image')
  })
})

describe('isValidWarmupUrl', () => {
  it('accepts http and https', () => {
    expect(isValidWarmupUrl('http://x.com/a.png')).toBe(true)
    expect(isValidWarmupUrl('https://x.com/qualquer-coisa')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidWarmupUrl('')).toBe(false)
    expect(isValidWarmupUrl('x.com/a.png')).toBe(false)
    expect(isValidWarmupUrl('ftp://x.com/a.png')).toBe(false)
    // No javascript: or data: — the viewer renders these into the page.
    expect(isValidWarmupUrl('javascript:alert(1)')).toBe(false)
    expect(isValidWarmupUrl('data:text/html,<script>')).toBe(false)
  })
})

describe('warmupLinkLabel', () => {
  it('names the destination the user is about to leave for', () => {
    expect(warmupLinkLabel('https://www.youtube.com/watch?v=abc')).toBe('youtube.com')
    expect(warmupLinkLabel('https://vimeo.com/123')).toBe('vimeo.com')
  })

  it('falls back to the raw URL when it cannot be parsed', () => {
    expect(warmupLinkLabel('not a url')).toBe('not a url')
  })
})

describe('warmupEmbedUrl', () => {
  it('turns a watch page into a player URL', () => {
    // The watch page refuses to be framed; the player URL is the whole point.
    expect(warmupEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(warmupEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(warmupEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('uses the no-cookie host, not the default one', () => {
    // Strictly less tracking for the same markup — see the function's comment.
    const url = warmupEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')!
    expect(url).toContain('youtube-nocookie.com')
    expect(url).not.toContain('//www.youtube.com')
  })

  it('keeps a start time, which is usually why the link was shared', () => {
    expect(warmupEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=90')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90',
    )
    expect(warmupEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42',
    )
  })

  it('handles a v= that is not the first parameter', () => {
    expect(warmupEmbedUrl('https://www.youtube.com/watch?list=PL1&v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('maps Vimeo to its player host', () => {
    expect(warmupEmbedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
    expect(warmupEmbedUrl('https://player.vimeo.com/video/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
  })

  it('returns null for anything without a published embed URL', () => {
    // Most sites send X-Frame-Options: DENY, so guessing an iframe would render
    // a blank box the user cannot explain.
    expect(warmupEmbedUrl('https://x.com/artigo')).toBeNull()
    expect(warmupEmbedUrl('https://www.instagram.com/p/abc')).toBeNull()
    expect(warmupEmbedUrl('https://x.com/a.png')).toBeNull()
    expect(warmupEmbedUrl('https://vimeo.com/canal/nome')).toBeNull()
  })
})

describe('isPortraitEmbed', () => {
  it('is true for a Shorts URL, which is the one that says it is vertical', () => {
    expect(isPortraitEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true)
    expect(isPortraitEmbed('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(true)
    expect(isPortraitEmbed('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true)
  })

  it('is false for everything that does not say so', () => {
    // A Short shared as youtu.be is indistinguishable from a landscape video at
    // this level; guessing portrait would pillarbox every ordinary video.
    expect(isPortraitEmbed('https://youtu.be/dQw4w9WgXcQ')).toBe(false)
    expect(isPortraitEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false)
    expect(isPortraitEmbed('https://vimeo.com/123456789')).toBe(false)
    expect(isPortraitEmbed('https://x.com/a.mp4')).toBe(false)
  })

  it('still resolves a Short to a normal player URL', () => {
    // Orientation is a display concern; the src is unchanged by it.
    expect(warmupEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })
})
