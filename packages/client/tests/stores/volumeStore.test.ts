import { describe, it, expect, beforeEach } from 'vitest'
import { useVolumeStore } from '@/stores/volumeStore'

describe('volumeStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useVolumeStore.getState().resetVolumes()
  })

  describe('AC-2.11.6: Session Persistence', () => {
    it('returns default volume of 1.0 (100%) for new participants', () => {
      const volume = useVolumeStore.getState().getVolume('participant-1')
      expect(volume).toBe(1.0)
    })

    it('stores volume for specific participant', () => {
      useVolumeStore.getState().setVolume('participant-1', 0.5)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(0.5)
    })

    it('maintains separate volumes for different participants', () => {
      useVolumeStore.getState().setVolume('participant-1', 0.5)
      useVolumeStore.getState().setVolume('participant-2', 1.5)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(0.5)
      expect(useVolumeStore.getState().getVolume('participant-2')).toBe(1.5)
    })

    it('persists volume during session', () => {
      useVolumeStore.getState().setVolume('participant-1', 0.75)

      // Multiple reads should return same value
      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(0.75)
      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(0.75)
    })

    it('resets all volumes on resetVolumes (for room disconnect)', () => {
      useVolumeStore.getState().setVolume('participant-1', 0.5)
      useVolumeStore.getState().setVolume('participant-2', 1.5)

      useVolumeStore.getState().resetVolumes()

      // Should return default values after reset
      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(1.0)
      expect(useVolumeStore.getState().getVolume('participant-2')).toBe(1.0)
    })
  })

  describe('volume range clamping', () => {
    it('clamps volume at minimum of 0 (0%)', () => {
      useVolumeStore.getState().setVolume('participant-1', -1)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(0)
    })

    it('clamps volume at maximum of 2.0 (200%)', () => {
      useVolumeStore.getState().setVolume('participant-1', 3)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(2)
    })

    it('allows volume at exactly 0 (muted)', () => {
      useVolumeStore.getState().setVolume('participant-1', 0)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(0)
    })

    it('allows volume at exactly 2.0 (200%)', () => {
      useVolumeStore.getState().setVolume('participant-1', 2)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(2)
    })

    it('allows volume at exactly 1.0 (100%)', () => {
      useVolumeStore.getState().setVolume('participant-1', 1)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(1)
    })
  })

  describe('AC-2.11.4: Mute via Volume', () => {
    it('supports muting by setting volume to 0', () => {
      useVolumeStore.getState().setVolume('participant-1', 0)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(0)
    })
  })

  describe('AC-2.11.5: Volume Boost', () => {
    it('supports boosting volume above 100%', () => {
      useVolumeStore.getState().setVolume('participant-1', 1.5)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(1.5)
    })

    it('supports maximum boost of 200%', () => {
      useVolumeStore.getState().setVolume('participant-1', 2.0)

      expect(useVolumeStore.getState().getVolume('participant-1')).toBe(2.0)
    })
  })

  describe('store structure', () => {
    it('has volumes record initially empty', () => {
      const { volumes } = useVolumeStore.getState()
      expect(volumes).toEqual({})
    })

    it('stores volume in volumes record keyed by participantId', () => {
      useVolumeStore.getState().setVolume('participant-1', 0.5)

      const { volumes } = useVolumeStore.getState()
      expect(volumes['participant-1']).toBe(0.5)
    })
  })
})
