import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  /** Device-local; NOT part of the JSON backup (see data-portability spec). */
  hasSeenExamplePrompt: boolean
  markPromptSeen: () => void
  /** Re-arms the first-launch prompt (used by "Resetar app"). */
  resetPromptSeen: () => void
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenExamplePrompt: false,
      markPromptSeen: () => set({ hasSeenExamplePrompt: true }),
      resetPromptSeen: () => set({ hasSeenExamplePrompt: false }),
    }),
    { name: 'myonegym.onboarding' },
  ),
)
