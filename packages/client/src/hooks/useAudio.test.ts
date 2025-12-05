import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Room, ParticipantEvent } from 'livekit-client'
import { useAudio } from './useAudio'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock livekit-client
vi.mock('livekit-client', async () => {
  const actual = await vi.importActual('livekit-client')
  return {
    ...actual,
    Room: vi.fn(),
    ParticipantEvent: {
      IsSpeakingChanged: 'participantIsSpeakingChanged',
    },
  }
})

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}))

describe('useAudio', () => {
  const mockSetMicrophoneEnabled = vi.fn()
  const mockOn = vi.fn()
  const mockOff = vi.fn()
  let mockRoom: Partial<Room>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRoom = {
      localParticipant: {
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        isMicrophoneEnabled: false,
        on: mockOn,
        off: mockOff,
      } as unknown as Room['localParticipant'],
    }

    // Reset stores
    useSettingsStore.setState({
      isMuted: true,
      displayName: 'Test User',
      apiBaseUrl: 'http://localhost:3000/api',
      sidebarCollapsed: false,
    })

    useRoomStore.setState({
      localParticipant: {
        id: 'local-user',
        name: 'Test User',
        role: 'host',
        color: '#f97316',
        isLocal: true,
      },
      remoteParticipants: [],
    })
  })

  afterEach(() => {
    useSettingsStore.setState({
      isMuted: true,
      displayName: '',
      apiBaseUrl: 'http://localhost:3000/api',
      sidebarCollapsed: false,
    })
    useRoomStore.setState({
      localParticipant: null,
      remoteParticipants: [],
    })
  })

  describe('initial state', () => {
    it('returns isMuted from settingsStore', () => {
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      expect(result.current.isMuted).toBe(true)
    })

    it('returns isPublishing based on room state', () => {
      (mockRoom.localParticipant as { isMicrophoneEnabled: boolean }).isMicrophoneEnabled = true
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      expect(result.current.isPublishing).toBe(true)
    })

    it('returns isSpeaking as false initially', () => {
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      expect(result.current.isSpeaking).toBe(false)
    })
  })

  describe('toggleMute', () => {
    it('calls setMicrophoneEnabled(true) when muted', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.toggleMute()
      })

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true)
    })

    it('calls setMicrophoneEnabled(false) when unmuted', async () => {
      useSettingsStore.setState({ isMuted: false })
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.toggleMute()
      })

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(false)
    })

    it('updates isMuted state in store after toggle', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      expect(useSettingsStore.getState().isMuted).toBe(true)

      await act(async () => {
        await result.current.toggleMute()
      })

      expect(useSettingsStore.getState().isMuted).toBe(false)
    })

    it('provides optimistic UI update before async completes', async () => {
      // Create a delayed promise to test optimistic update
      let resolvePromise: (value?: unknown) => void
      mockSetMicrophoneEnabled.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      // Start the toggle but don't await
      act(() => {
        result.current.toggleMute()
      })

      // isMuted should be updated immediately (optimistic)
      expect(useSettingsStore.getState().isMuted).toBe(false)

      // Resolve the promise
      await act(async () => {
        resolvePromise()
      })
    })
  })

  describe('enableMicrophone', () => {
    it('does nothing when room is null', async () => {
      const { result } = renderHook(() => useAudio({ room: null }))

      await act(async () => {
        await result.current.enableMicrophone()
      })

      expect(mockSetMicrophoneEnabled).not.toHaveBeenCalled()
    })

    it('sets isMuted to false on success', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableMicrophone()
      })

      expect(useSettingsStore.getState().isMuted).toBe(false)
    })
  })

  describe('disableMicrophone', () => {
    it('does nothing when room is null', async () => {
      useSettingsStore.setState({ isMuted: false })
      const { result } = renderHook(() => useAudio({ room: null }))

      await act(async () => {
        await result.current.disableMicrophone()
      })

      expect(mockSetMicrophoneEnabled).not.toHaveBeenCalled()
    })

    it('sets isMuted to true on success', async () => {
      useSettingsStore.setState({ isMuted: false })
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.disableMicrophone()
      })

      expect(useSettingsStore.getState().isMuted).toBe(true)
    })
  })

  describe('permission denied handling (AC-2.7.6)', () => {
    it('shows toast on NotAllowedError', async () => {
      const { toast } = await import('sonner')
      const notAllowedError = new Error('Permission denied')
      notAllowedError.name = 'NotAllowedError'
      mockSetMicrophoneEnabled.mockRejectedValue(notAllowedError)

      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableMicrophone()
      })

      expect(toast.error).toHaveBeenCalledWith(
        'Microphone access denied. Check system settings.'
      )
    })

    it('reverts to muted state on permission denied', async () => {
      const notAllowedError = new Error('Permission denied')
      notAllowedError.name = 'NotAllowedError'
      mockSetMicrophoneEnabled.mockRejectedValue(notAllowedError)

      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableMicrophone()
      })

      expect(useSettingsStore.getState().isMuted).toBe(true)
    })
  })

  describe('speaking indicator (AC-2.7.7)', () => {
    it('subscribes to IsSpeakingChanged event on mount', () => {
      renderHook(() => useAudio({ room: mockRoom as Room }))

      expect(mockOn).toHaveBeenCalledWith(
        ParticipantEvent.IsSpeakingChanged,
        expect.any(Function)
      )
    })

    it('unsubscribes from IsSpeakingChanged event on unmount', () => {
      const { unmount } = renderHook(() => useAudio({ room: mockRoom as Room }))

      unmount()

      expect(mockOff).toHaveBeenCalledWith(
        ParticipantEvent.IsSpeakingChanged,
        expect.any(Function)
      )
    })

    it('updates isSpeaking when event fires', async () => {
      let speakingHandler: (speaking: boolean) => void

      mockOn.mockImplementation((event, handler) => {
        if (event === ParticipantEvent.IsSpeakingChanged) {
          speakingHandler = handler
        }
      })

      const { result } = renderHook(() => useAudio({ room: mockRoom as Room }))

      expect(result.current.isSpeaking).toBe(false)

      // Simulate speaking event
      act(() => {
        speakingHandler(true)
      })

      await waitFor(() => {
        expect(result.current.isSpeaking).toBe(true)
      })
    })

    it('updates participant speaking state in roomStore', async () => {
      let speakingHandler: (speaking: boolean) => void

      mockOn.mockImplementation((event, handler) => {
        if (event === ParticipantEvent.IsSpeakingChanged) {
          speakingHandler = handler
        }
      })

      renderHook(() => useAudio({ room: mockRoom as Room }))

      // Simulate speaking event
      act(() => {
        speakingHandler(true)
      })

      await waitFor(() => {
        const state = useRoomStore.getState()
        expect(state.localParticipant?.isSpeaking).toBe(true)
      })
    })
  })

  describe('device disconnection handling (AC-2.10.5)', () => {
    it('falls back to default when current device is disconnected', async () => {
      const { toast } = await import('sonner')
      let deviceChangeCallback: (() => void) | null = null
      const mockEnumerateDevices = vi.fn()
      const mockSwitchActiveDevice = vi.fn().mockResolvedValue(true)

      // Setup mock room with switchActiveDevice
      const roomWithSwitch = {
        ...mockRoom,
        switchActiveDevice: mockSwitchActiveDevice,
      }

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          enumerateDevices: mockEnumerateDevices,
          addEventListener: vi.fn((event, callback) => {
            if (event === 'devicechange') {
              deviceChangeCallback = callback
            }
          }),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      })

      // Reset settings with a selected device
      useSettingsStore.setState({
        isMuted: true,
        preferredMicrophoneId: 'external-mic',
      })

      // Device disconnection - external-mic is NOT in the list
      mockEnumerateDevices.mockResolvedValue([
        { deviceId: 'default', kind: 'audioinput', label: 'Default' },
      ])

      renderHook(() => useAudio({ room: roomWithSwitch as unknown as Room }))

      // Trigger devicechange
      await act(async () => {
        deviceChangeCallback?.()
      })

      await waitFor(() => {
        expect(mockSwitchActiveDevice).toHaveBeenCalledWith('audioinput', 'default')
        expect(toast.warning).toHaveBeenCalledWith(
          'Device disconnected, switched to System Default'
        )
      })

      // Cleanup
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      })
    })

    it('does not fall back if current device still exists', async () => {
      const { toast } = await import('sonner')
      vi.clearAllMocks()

      let deviceChangeCallback: (() => void) | null = null
      const mockEnumerateDevices = vi.fn()
      const mockSwitchActiveDevice = vi.fn().mockResolvedValue(true)

      // Setup mock room with switchActiveDevice
      const roomWithSwitch = {
        ...mockRoom,
        switchActiveDevice: mockSwitchActiveDevice,
      }

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          enumerateDevices: mockEnumerateDevices,
          addEventListener: vi.fn((event, callback) => {
            if (event === 'devicechange') {
              deviceChangeCallback = callback
            }
          }),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      })

      // Reset settings with a selected device
      useSettingsStore.setState({
        isMuted: true,
        preferredMicrophoneId: 'external-mic',
      })

      // Devices still include external-mic
      mockEnumerateDevices.mockResolvedValue([
        { deviceId: 'default', kind: 'audioinput', label: 'Default' },
        { deviceId: 'external-mic', kind: 'audioinput', label: 'External Mic' },
      ])

      renderHook(() => useAudio({ room: roomWithSwitch as unknown as Room }))

      // Trigger devicechange
      await act(async () => {
        deviceChangeCallback?.()
      })

      // Wait a bit for any async operations, then check
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(mockSwitchActiveDevice).not.toHaveBeenCalled()
      expect(toast.warning).not.toHaveBeenCalled()

      // Cleanup
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      })
    })

    it('does not monitor devicechange when using default device', () => {
      const mockAddEventListener = vi.fn()

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          enumerateDevices: vi.fn(),
          addEventListener: mockAddEventListener,
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      })

      useSettingsStore.setState({ preferredMicrophoneId: 'default' })

      renderHook(() => useAudio({ room: mockRoom as Room }))

      // Should not add listener when already on default
      expect(mockAddEventListener).not.toHaveBeenCalled()

      // Cleanup
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      })
    })
  })
})
