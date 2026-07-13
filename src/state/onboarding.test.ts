import { beforeEach, describe, expect, it } from 'vitest'
import { useOnboarding } from './onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboarding.setState({ hasSeenExamplePrompt: false })
})

describe('useOnboarding store', () => {
  it('defaults to not-yet-asked', () => {
    expect(useOnboarding.getState().hasSeenExamplePrompt).toBe(false)
  })

  it('markPromptSeen flips the flag and persists it', () => {
    useOnboarding.getState().markPromptSeen()
    expect(useOnboarding.getState().hasSeenExamplePrompt).toBe(true)
    expect(JSON.parse(localStorage.getItem('myonegym.onboarding')!).state.hasSeenExamplePrompt).toBe(
      true,
    )
  })

  it('resetPromptSeen re-arms the flag', () => {
    useOnboarding.getState().markPromptSeen()
    useOnboarding.getState().resetPromptSeen()
    expect(useOnboarding.getState().hasSeenExamplePrompt).toBe(false)
  })
})
