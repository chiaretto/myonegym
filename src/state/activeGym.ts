import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../db/db'
import { listGyms } from '../db/repos'

interface ActiveGymState {
  activeGymId: number | null
  setActiveGym: (id: number | null) => void
  /**
   * Ensure the stored active gym still exists; fall back to the first gym, or
   * null when there are none. Call after loads and after deleting a gym.
   */
  reconcile: () => Promise<void>
}

export const useActiveGym = create<ActiveGymState>()(
  persist(
    (set, get) => ({
      activeGymId: null,
      setActiveGym: (id) => set({ activeGymId: id }),
      reconcile: async () => {
        const gyms = await listGyms(db)
        const current = get().activeGymId
        const stillValid = current != null && gyms.some((g) => g.id === current)
        if (stillValid) return
        set({ activeGymId: gyms[0]?.id ?? null })
      },
    }),
    { name: 'myonegym.activeGym' },
  ),
)
