import { describe, expect, it } from 'vitest'
import {
  embedLinkLabel,
  embedMediaKind,
  embedUrl,
  embedUrlWithRange,
  isPortraitEmbed,
  isValidEmbedUrl,
  supportsTimeRange,
} from './embedMedia'

describe('embedMediaKind', () => {
  it.each(['https://x.com/a.png', 'https://x.com/a.jpg', 'https://x.com/a.jpeg',
           'https://x.com/a.webp', 'https://x.com/a.gif'])('%s is an image', (url) => {
    expect(embedMediaKind(url)).toBe('image')
  })

  it.each(['https://x.com/a.mp4', 'https://x.com/a.webm'])('%s is a video', (url) => {
    expect(embedMediaKind(url)).toBe('video')
  })

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
    'https://player.vimeo.com/video/123456789',
  ])('%s is an embed', (url) => {
    expect(embedMediaKind(url)).toBe('embed')
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
    expect(embedMediaKind(url)).toBe('image')
  })

  it('ignores the query string and the fragment', () => {
    // A signed media URL carries a token; it is still a video.
    expect(embedMediaKind('https://x.com/a.mp4?token=abc&t=1')).toBe('video')
    expect(embedMediaKind('https://x.com/a.gif#top')).toBe('image')
    // And a query that merely mentions an extension must not make it a video.
    expect(embedMediaKind('https://x.com/watch?file=a.mp4')).toBe('image')
  })

  it('is case-insensitive on the extension', () => {
    expect(embedMediaKind('https://x.com/A.PNG')).toBe('image')
    expect(embedMediaKind('https://x.com/A.MP4')).toBe('video')
  })

  it('tolerates surrounding whitespace', () => {
    expect(embedMediaKind('  https://x.com/a.png  ')).toBe('image')
  })
})

describe('isValidEmbedUrl', () => {
  it('accepts http and https', () => {
    expect(isValidEmbedUrl('http://x.com/a.png')).toBe(true)
    expect(isValidEmbedUrl('https://x.com/qualquer-coisa')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidEmbedUrl('')).toBe(false)
    expect(isValidEmbedUrl('x.com/a.png')).toBe(false)
    expect(isValidEmbedUrl('ftp://x.com/a.png')).toBe(false)
    // No javascript: or data: — the viewer renders these into the page.
    expect(isValidEmbedUrl('javascript:alert(1)')).toBe(false)
    expect(isValidEmbedUrl('data:text/html,<script>')).toBe(false)
  })
})

describe('embedLinkLabel', () => {
  it('names the destination the user is about to leave for', () => {
    expect(embedLinkLabel('https://www.youtube.com/watch?v=abc')).toBe('youtube.com')
    expect(embedLinkLabel('https://vimeo.com/123')).toBe('vimeo.com')
  })

  it('falls back to the raw URL when it cannot be parsed', () => {
    expect(embedLinkLabel('not a url')).toBe('not a url')
  })
})

describe('embedUrl', () => {
  it('turns a watch page into a player URL', () => {
    // The watch page refuses to be framed; the player URL is the whole point.
    expect(embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(embedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(embedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('uses the no-cookie host, not the default one', () => {
    // Strictly less tracking for the same markup — see the function's comment.
    const url = embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')!
    expect(url).toContain('youtube-nocookie.com')
    expect(url).not.toContain('//www.youtube.com')
  })

  it('keeps a start time, which is usually why the link was shared', () => {
    expect(embedUrl('https://youtu.be/dQw4w9WgXcQ?t=90')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90',
    )
    expect(embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42',
    )
  })

  it('handles a v= that is not the first parameter', () => {
    expect(embedUrl('https://www.youtube.com/watch?list=PL1&v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('maps Vimeo to its player host', () => {
    expect(embedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
    expect(embedUrl('https://player.vimeo.com/video/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
  })

  it('returns null for anything without a published embed URL', () => {
    // Most sites send X-Frame-Options: DENY, so guessing an iframe would render
    // a blank box the user cannot explain.
    expect(embedUrl('https://x.com/artigo')).toBeNull()
    expect(embedUrl('https://x.com/a.png')).toBeNull()
    expect(embedUrl('https://vimeo.com/canal/nome')).toBeNull()
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
    expect(embedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })
})

describe('instagram', () => {
  it('embeds a reel, a post and an IGTV', () => {
    expect(embedUrl('https://www.instagram.com/reel/Cabc123/')).toBe(
      'https://www.instagram.com/reel/Cabc123/embed',
    )
    expect(embedUrl('https://instagram.com/p/Cabc123')).toBe(
      'https://www.instagram.com/p/Cabc123/embed',
    )
    expect(embedUrl('https://www.instagram.com/tv/Cabc123/')).toBe(
      'https://www.instagram.com/tv/Cabc123/embed',
    )
  })

  it('normalises the plural /reels/ form to /reel/', () => {
    expect(embedUrl('https://www.instagram.com/reels/Cabc123/')).toBe(
      'https://www.instagram.com/reel/Cabc123/embed',
    )
  })

  it('classifies as embed, not image', () => {
    expect(embedMediaKind('https://www.instagram.com/reel/Cabc123/')).toBe('embed')
  })

  it('treats a reel as portrait, a post as not', () => {
    // A reel is vertical by definition of the format; a /p/ post says nothing.
    expect(isPortraitEmbed('https://www.instagram.com/reel/Cabc123/')).toBe(true)
    expect(isPortraitEmbed('https://www.instagram.com/reels/Cabc123/')).toBe(true)
    expect(isPortraitEmbed('https://www.instagram.com/p/Cabc123/')).toBe(false)
  })

  it('is not a profile or the bare host', () => {
    expect(embedUrl('https://www.instagram.com/algum_perfil/')).toBeNull()
    expect(embedUrl('https://www.instagram.com/')).toBeNull()
  })
})

describe('supportsTimeRange', () => {
  it('is true for every YouTube form', () => {
    expect(supportsTimeRange('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(supportsTimeRange('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    expect(supportsTimeRange('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true)
  })

  it('is false for Instagram — its embed takes no time parameter', () => {
    expect(supportsTimeRange('https://www.instagram.com/reel/Cabc123/')).toBe(false)
  })

  it('is false for anything else', () => {
    expect(supportsTimeRange('https://vimeo.com/123456789')).toBe(false)
    expect(supportsTimeRange('https://x.com/a.mp4')).toBe(false)
  })
})

describe('embedUrlWithRange', () => {
  const yt = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

  it('applies start and end on YouTube', () => {
    const url = new URL(embedUrlWithRange(yt, { startSec: 130, endSec: 165 })!)
    expect(url.searchParams.get('start')).toBe('130')
    expect(url.searchParams.get('end')).toBe('165')
  })

  it('applies either end alone', () => {
    expect(new URL(embedUrlWithRange(yt, { startSec: 90 })!).searchParams.get('end')).toBeNull()
    expect(new URL(embedUrlWithRange(yt, { endSec: 90 })!).searchParams.get('start')).toBeNull()
  })

  it('lets an explicit start override the one carried by the address', () => {
    // The user typed the more specific thing.
    const url = new URL(embedUrlWithRange(`${yt}&t=42`, { startSec: 130 })!)
    expect(url.searchParams.get('start')).toBe('130')
  })

  it('keeps the address start when the video declares no range', () => {
    expect(new URL(embedUrlWithRange(`${yt}&t=42`)!).searchParams.get('start')).toBe('42')
  })

  it('ignores the range on Instagram, returning the plain embed', () => {
    const ig = 'https://www.instagram.com/reel/Cabc123/'
    expect(embedUrlWithRange(ig, { startSec: 10, endSec: 20 })).toBe(
      'https://www.instagram.com/reel/Cabc123/embed',
    )
  })

  it('is null for a URL with no embed at all', () => {
    expect(embedUrlWithRange('https://x.com/artigo', { startSec: 10 })).toBeNull()
  })
})

describe('embedUrlWithRange — loop', () => {
  const yt = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

  it('opens the JS API instead of using loop=1&playlist', () => {
    // `loop=1&playlist=<id>` repeats the VIDEO: it restarts at zero and drops
    // the trim, because start/end apply to the first pass only.
    const url = new URL(embedUrlWithRange(yt, { loop: true })!)
    expect(url.searchParams.get('enablejsapi')).toBe('1')
    expect(url.searchParams.get('loop')).toBeNull()
    expect(url.searchParams.get('playlist')).toBeNull()
  })

  it('keeps the trim alongside it, so the segment is what ends', () => {
    const url = new URL(embedUrlWithRange(yt, { startSec: 130, endSec: 165, loop: true })!)
    expect(url.searchParams.get('start')).toBe('130')
    expect(url.searchParams.get('end')).toBe('165')
    expect(url.searchParams.get('enablejsapi')).toBe('1')
  })

  it('adds nothing when loop is not asked for', () => {
    expect(new URL(embedUrlWithRange(yt)!).searchParams.get('enablejsapi')).toBeNull()
  })

  it('leaves Instagram untouched — a reel repeats on its own', () => {
    expect(embedUrlWithRange('https://www.instagram.com/reel/Cabc123/', { loop: true })).toBe(
      'https://www.instagram.com/reel/Cabc123/embed',
    )
  })
})

describe('embedUrlWithRange — autoplay', () => {
  const yt = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

  it('mutes, because browsers decline an audible autoplay', () => {
    const url = new URL(embedUrlWithRange(yt, { autoplay: true })!)
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('mute')).toBe('1')
  })

  it('adds nothing when autoplay is not asked for', () => {
    const url = new URL(embedUrlWithRange(yt)!)
    expect(url.searchParams.get('autoplay')).toBeNull()
    expect(url.searchParams.get('mute')).toBeNull()
  })

  it('combines with the loop and the range', () => {
    const url = new URL(
      embedUrlWithRange(yt, { startSec: 130, endSec: 165, loop: true, autoplay: true })!,
    )
    expect([...url.searchParams.keys()].sort()).toEqual([
      'autoplay',
      'enablejsapi',
      'end',
      'mute',
      'start',
    ])
  })
})
