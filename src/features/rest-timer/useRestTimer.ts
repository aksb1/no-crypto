import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RestTimerState {
  endsAt: number | null
  duration: number
  visible: boolean
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
  hide: () => void
  show: () => void
}

export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      duration: 90,
      visible: false,
      start: (seconds) => set({ endsAt: Date.now() + seconds * 1000, duration: seconds, visible: true }),
      add: (seconds) => {
        const current = get().endsAt
        set({ endsAt: Math.max(Date.now(), current ?? Date.now()) + seconds * 1000, visible: true })
      },
      stop: () => set({ endsAt: null, visible: false }),
      hide: () => set({ visible: false }),
      show: () => set({ visible: true }),
    }),
    { name: 'forma-rest-timer' },
  ),
)
