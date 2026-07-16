import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareFilename, shareSessionImage } from './shareCard'

const blob = () => new Blob(['png'], { type: 'image/png' })

function stubNavigator(over: Partial<Navigator>) {
  for (const [k, v] of Object.entries(over)) {
    Object.defineProperty(navigator, k, { value: v, configurable: true, writable: true })
  }
}

/** jsdom implements neither `URL.createObjectURL` nor a real anchor download,
 *  so both are defined (not spied) for the duration of a test. */
function stubDownload() {
  const click = vi.fn()
  const revoke = vi.fn()
  const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement
  vi.spyOn(document, 'createElement').mockReturnValue(anchor)
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => 'blob:fake',
    configurable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true })
  return { anchor, click, revoke }
}

afterEach(() => {
  vi.restoreAllMocks()
  stubNavigator({ share: undefined, canShare: undefined })
})

describe('shareFilename', () => {
  it('slugifies the day name and stamps the date', () => {
    expect(shareFilename('Dia 1', new Date(2026, 6, 16).getTime())).toBe(
      'myonegym-dia-1-2026-07-16.png',
    )
  })

  it('strips accents and punctuation', () => {
    expect(shareFilename('Peito & Tríceps!', new Date(2026, 0, 5).getTime())).toBe(
      'myonegym-peito-triceps-2026-01-05.png',
    )
  })

  it('falls back when the name has nothing usable', () => {
    expect(shareFilename('***', new Date(2026, 0, 5).getTime())).toBe(
      'myonegym-treino-2026-01-05.png',
    )
  })
})

describe('shareSessionImage', () => {
  it('shares via the platform sheet when files are supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ canShare: () => true, share })

    expect(await shareSessionImage(blob(), 'a.png', 'Dia 1')).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
    const file = share.mock.calls[0][0].files[0] as File
    expect(file.name).toBe('a.png')
    expect(file.type).toBe('image/png')
  })

  it('falls back to a download when sharing files is unsupported', async () => {
    const { anchor, click, revoke } = stubDownload()
    stubNavigator({ canShare: undefined, share: undefined })

    expect(await shareSessionImage(blob(), 'a.png', 'Dia 1')).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
    expect(anchor.download).toBe('a.png')
    expect(revoke).toHaveBeenCalledWith('blob:fake')
  })

  it('falls back to a download when canShare rejects the file', async () => {
    const { click } = stubDownload()
    const share = vi.fn()
    stubNavigator({ canShare: () => false, share })

    expect(await shareSessionImage(blob(), 'a.png', 'Dia 1')).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledOnce()
  })

  it('treats a dismissed share sheet as a non-event', async () => {
    const err = new Error('cancelled')
    err.name = 'AbortError'
    stubNavigator({ canShare: () => true, share: vi.fn().mockRejectedValue(err) })

    expect(await shareSessionImage(blob(), 'a.png', 'Dia 1')).toBe('cancelled')
  })

  it('propagates a genuine share failure', async () => {
    stubNavigator({ canShare: () => true, share: vi.fn().mockRejectedValue(new Error('boom')) })

    await expect(shareSessionImage(blob(), 'a.png', 'Dia 1')).rejects.toThrow('boom')
  })
})
