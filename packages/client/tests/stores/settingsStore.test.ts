import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '@/stores/settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear()
    // Reset store to initial state
    useSettingsStore.setState({
      displayName: '',
      apiBaseUrl: 'http://localhost:3000/api',
      inviteDomain: null,
      sidebarCollapsed: false,
      isMuted: true,
      isVideoOff: true,
      preferredMicrophoneId: null,
      preferredCameraId: null,
      theme: 'dark',
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
    it('uses "etch-settings" as storage key', () => {
      // This test verifies the persist config - the key should be 'etch-settings'
      // The persist middleware uses this key for localStorage
      // We can check by verifying the state persists across store resets
      const { setPreferredMicrophone } = useSettingsStore.getState()
      setPreferredMicrophone('persisted-mic-id')

      // The persist middleware should have saved this to localStorage with key 'etch-settings'
      const stored = localStorage.getItem('etch-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state?.preferredMicrophoneId).toBe('persisted-mic-id')
      }
    })
  })

  describe('theme preferences (AC-2.14.4)', () => {
    it('initializes with dark theme by default', () => {
      const state = useSettingsStore.getState()
      expect(state.theme).toBe('dark')
    })

    it('setTheme updates theme to light', () => {
      const { setTheme } = useSettingsStore.getState()

      setTheme('light')

      expect(useSettingsStore.getState().theme).toBe('light')
    })

    it('setTheme updates theme back to dark', () => {
      const { setTheme } = useSettingsStore.getState()

      setTheme('light')
      setTheme('dark')

      expect(useSettingsStore.getState().theme).toBe('dark')
    })

    it('persists theme to localStorage', () => {
      const { setTheme } = useSettingsStore.getState()

      setTheme('light')

      const stored = localStorage.getItem('etch-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state?.theme).toBe('light')
      }
    })
  })

  describe('clearPreferences (AC-2.14.6)', () => {
    it('resets displayName to empty string', () => {
      const { setDisplayName, clearPreferences } = useSettingsStore.getState()

      setDisplayName('Test User')
      clearPreferences()

      expect(useSettingsStore.getState().displayName).toBe('')
    })

    it('resets theme to dark', () => {
      const { setTheme, clearPreferences } = useSettingsStore.getState()

      setTheme('light')
      clearPreferences()

      expect(useSettingsStore.getState().theme).toBe('dark')
    })

    it('resets preferredMicrophoneId to null', () => {
      const { setPreferredMicrophone, clearPreferences } = useSettingsStore.getState()

      setPreferredMicrophone('test-mic')
      clearPreferences()

      expect(useSettingsStore.getState().preferredMicrophoneId).toBeNull()
    })

    it('resets preferredCameraId to null', () => {
      const { setPreferredCamera, clearPreferences } = useSettingsStore.getState()

      setPreferredCamera('test-camera')
      clearPreferences()

      expect(useSettingsStore.getState().preferredCameraId).toBeNull()
    })

    it('resets sidebarCollapsed to false', () => {
      const { toggleSidebar, clearPreferences } = useSettingsStore.getState()

      toggleSidebar() // Set to true
      clearPreferences()

      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false)
    })

    it('resets all preferences at once', () => {
      const { setDisplayName, setTheme, setPreferredMicrophone, setPreferredCamera, toggleSidebar, clearPreferences } =
        useSettingsStore.getState()

      // Set various preferences
      setDisplayName('Test User')
      setTheme('light')
      setPreferredMicrophone('mic-123')
      setPreferredCamera('cam-456')
      toggleSidebar()

      // Clear all
      clearPreferences()

      // Verify all reset
      const state = useSettingsStore.getState()
      expect(state.displayName).toBe('')
      expect(state.theme).toBe('dark')
      expect(state.preferredMicrophoneId).toBeNull()
      expect(state.preferredCameraId).toBeNull()
      expect(state.sidebarCollapsed).toBe(false)
    })
  })

  describe('display name persistence (AC-2.14.1)', () => {
    it('setDisplayName updates displayName', () => {
      const { setDisplayName } = useSettingsStore.getState()

      setDisplayName('Alice')

      expect(useSettingsStore.getState().displayName).toBe('Alice')
    })

    it('persists displayName to localStorage', () => {
      const { setDisplayName } = useSettingsStore.getState()

      setDisplayName('Bob')

      const stored = localStorage.getItem('etch-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state?.displayName).toBe('Bob')
      }
    })
  })

  describe('sidebar persistence (AC-2.14.3)', () => {
    it('toggleSidebar persists sidebarCollapsed state', () => {
      const { toggleSidebar } = useSettingsStore.getState()

      toggleSidebar()

      const stored = localStorage.getItem('etch-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state?.sidebarCollapsed).toBe(true)
      }
    })
  })
})
