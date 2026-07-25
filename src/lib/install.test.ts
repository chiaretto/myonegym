import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectPlatform,
  initInstall,
  isStandalone,
  useInstall,
  type BeforeInstallPromptEvent,
} from './install'

let teardown: () => void

/** jsdom's Navigator has neither `maxTouchPoints` nor the iOS-only
 *  `standalone`, so they are defined as own properties and removed after. */
const stubbedNavigatorProps: string[] = []
function stubNavigator(prop: 'maxTouchPoints' | 'standalone', value: number | boolean) {
  Object.defineProperty(navigator, prop, { value, configurable: true })
  stubbedNavigatorProps.push(prop)
}

/** A stand-in for the Chromium event: prompt() resolves, userChoice reports. */
function makePromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
  Object.assign(event, {
    platforms: ['web'],
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
  return event
}

beforeEach(() => {
  teardown = initInstall()
})

afterEach(() => {
  teardown()
  vi.unstubAllGlobals()
  for (const prop of stubbedNavigatorProps.splice(0)) {
    Reflect.deleteProperty(navigator, prop)
  }
})

describe('detectPlatform', () => {
  it('recognises Android', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120')).toBe('android')
  })

  it('recognises iPhone and iPad', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605')).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 17_0) Safari/605')).toBe('ios')
  })

  it('recognises an iPad reporting itself as a Mac', () => {
    // iPadOS 13+ sends a desktop UA; only maxTouchPoints separates it.
    stubNavigator('maxTouchPoints', 5)
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605')).toBe('ios')
  })

  it('treats a real desktop as neither', () => {
    stubNavigator('maxTouchPoints', 0)
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605')).toBe(
      'other',
    )
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe('other')
  })
})

describe('isStandalone', () => {
  it('is false in a normal browser tab', () => {
    expect(isStandalone()).toBe(false)
  })

  it('follows the display-mode media query', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === '(display-mode: standalone)',
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }))
    expect(isStandalone()).toBe(true)
  })

  it('follows navigator.standalone on iOS', () => {
    stubNavigator('standalone', true)
    expect(isStandalone()).toBe(true)
  })
})

describe('install state', () => {
  it('starts with nothing to install', () => {
    expect(useInstall.getState().canInstall).toBe(false)
    expect(useInstall.getState().isInstalled).toBe(false)
  })

  it('captures beforeinstallprompt and suppresses the browser default', () => {
    const event = makePromptEvent()
    const prevented = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    expect(prevented).toHaveBeenCalled()
    expect(useInstall.getState().canInstall).toBe(true)
  })

  it('stays available for a screen opened long after the event fired', () => {
    window.dispatchEvent(makePromptEvent())
    // Nothing re-fires; the parked event is what keeps this true.
    expect(useInstall.getState().canInstall).toBe(true)
  })

  it('prompts on demand and reports acceptance', async () => {
    const event = makePromptEvent('accepted')
    window.dispatchEvent(event)

    await expect(useInstall.getState().promptInstall()).resolves.toBe('accepted')

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(useInstall.getState().isInstalled).toBe(true)
  })

  it('reports dismissal without claiming the app was installed', async () => {
    window.dispatchEvent(makePromptEvent('dismissed'))

    await expect(useInstall.getState().promptInstall()).resolves.toBe('dismissed')

    expect(useInstall.getState().isInstalled).toBe(false)
  })

  it('spends the event exactly once', async () => {
    const event = makePromptEvent()
    window.dispatchEvent(event)

    await useInstall.getState().promptInstall()
    // A second prompt() on the same event throws in the browser, so the state
    // must stop offering it.
    expect(useInstall.getState().canInstall).toBe(false)
    await expect(useInstall.getState().promptInstall()).resolves.toBe('unavailable')
    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it('does nothing when no browser prompt was ever offered', async () => {
    await expect(useInstall.getState().promptInstall()).resolves.toBe('unavailable')
  })

  it('marks installed when the browser reports appinstalled', () => {
    window.dispatchEvent(makePromptEvent())
    window.dispatchEvent(new Event('appinstalled'))

    expect(useInstall.getState().isInstalled).toBe(true)
    expect(useInstall.getState().canInstall).toBe(false)
  })

  it('starts out installed when launched from the home screen', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === '(display-mode: standalone)',
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }))
    teardown()
    teardown = initInstall()

    expect(useInstall.getState().isInstalled).toBe(true)
  })

  it('does not persist anything — installability is per session', () => {
    window.dispatchEvent(makePromptEvent())
    window.dispatchEvent(new Event('appinstalled'))

    expect(
      Object.keys(localStorage).filter((k) => k.toLowerCase().includes('install')),
    ).toHaveLength(0)
  })
})
