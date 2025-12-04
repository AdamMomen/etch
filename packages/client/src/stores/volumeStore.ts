import { create } from 'zustand'

/**
 * Volume state management for per-participant volume control.
 * Session-only storage (NOT persisted to localStorage).
 * Volume values: 0.0 (muted) to 2.0 (200% boost)
 * Default: 1.0 (100%)
 */
interface VolumeState {
  /** Map of participantId -> volume (0.0 to 2.0) */
  volumes: Record<string, number>

  /** Set volume for a specific participant */
  setVolume: (participantId: string, volume: number) => void

  /** Get volume for a specific participant (defaults to 1.0) */
  getVolume: (participantId: string) => number

  /** Reset all volumes (call on room disconnect) */
  resetVolumes: () => void
}

export const useVolumeStore = create<VolumeState>((set, get) => ({
  volumes: {},

  setVolume: (participantId, volume) =>
    set((state) => ({
      volumes: {
        ...state.volumes,
        [participantId]: Math.max(0, Math.min(2, volume)), // Clamp to 0-2
      },
    })),

  getVolume: (participantId) => get().volumes[participantId] ?? 1.0,

  resetVolumes: () => set({ volumes: {} }),
}))
