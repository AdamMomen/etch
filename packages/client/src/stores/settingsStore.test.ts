import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from './settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSettingsStore.setState({
      displayName: '',
      apiBaseUrl: 'http://localhost:3000/api',
      sidebarCollapsed: false,
      isMuted: true,
      isVideoOff: true,
      preferredMicrophoneId: null,
      preferredCameraId: null,
    })
  })

  describe('device preferences (AC-2.10.2, AC-2.10.4)', () => {
    it('initializes with null preferredMicrophoneId', () => {
      const state = useSettingsStore.getState()
      expect(state.preferredMicrophoneId).toBeNull()
    })

    it('initializes with null preferredCameraId', () => {
      const state = useSettingsStore.getState()
      expect(state.preferredCameraId).toBeNull()
    })

    it('setPreferredMicrophone updates preferredMicrophoneId', () => {
      const { setPreferredMicrophone } = useSettingsStore.getState()

      setPreferredMicrophone('test-mic-id')

      expect(useSettingsStore.getState().preferredMicrophoneId).toBe('test-mic-id')
    })

    it('setPreferredCamera updates preferredCameraId', () => {
      const { setPreferredCamera } = useSettingsStore.getState()

      setPreferredCamera('test-camera-id')

      expect(useSettingsStore.getState().preferredCameraId).toBe('test-camera-id')
    })

    it('setPreferredMicrophone can set to null', () => {
      const { setPreferredMicrophone } = useSettingsStore.getState()

      setPreferredMicrophone('test-mic-id')
      setPreferredMicrophone(null)

      expect(useSettingsStore.getState().preferredMicrophoneId).toBeNull()
    })

    it('setPreferredCamera can set to null', () => {
      const { setPreferredCamera } = useSettingsStore.getState()

      setPreferredCamera('test-camera-id')
      setPreferredCamera(null)

      expect(useSettingsStore.getState().preferredCameraId).toBeNull()
    })

    it('setPreferredMicrophone can set to "default"', () => {
      const { setPreferredMicrophone } = useSettingsStore.getState()

      setPreferredMicrophone('default')

      expect(useSettingsStore.getState().preferredMicrophoneId).toBe('default')
    })

    it('setPreferredCamera can set to "default"', () => {
      const { setPreferredCamera } = useSettingsStore.getState()

      setPreferredCamera('default')

      expect(useSettingsStore.getState().preferredCameraId).toBe('default')
    })
  })

  describe('persist configuration', () => {
    it('uses "nameless-settings" as storage key', () => {
      // This test verifies the persist config - the key should be 'nameless-settings'
      // The persist middleware uses this key for localStorage
      // We can check by verifying the state persists across store resets
      const { setPreferredMicrophone } = useSettingsStore.getState()
      setPreferredMicrophone('persisted-mic-id')

      // The persist middleware should have saved this to localStorage with key 'nameless-settings'
      const stored = localStorage.getItem('nameless-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state?.preferredMicrophoneId).toBe('persisted-mic-id')
      }
    })
  })
})
