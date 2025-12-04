import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Room, VideoPresets } from 'livekit-client'
import { useVideo } from './useVideo'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock livekit-client
vi.mock('livekit-client', async () => {
  const actual = await vi.importActual('livekit-client')
  return {
    ...actual,
    Room: vi.fn(),
    Track: {
      Source: {
        Camera: 'camera',
      },
    },
    VideoPresets: {
      h720: { width: 1280, height: 720 },
    },
  }
})

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('useVideo', () => {
  const mockSetCameraEnabled = vi.fn()
  const mockGetTrackPublication = vi.fn()
  let mockRoom: Partial<Room>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRoom = {
      localParticipant: {
        setCameraEnabled: mockSetCameraEnabled,
        isCameraEnabled: false,
        getTrackPublication: mockGetTrackPublication,
      } as unknown as Room['localParticipant'],
    }

    // Reset stores
    useSettingsStore.setState({
      isVideoOff: true,
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
      isVideoOff: true,
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
    it('returns isVideoOff from settingsStore', () => {
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      expect(result.current.isVideoOff).toBe(true)
    })

    it('returns isPublishing based on room state', () => {
      (mockRoom.localParticipant as { isCameraEnabled: boolean }).isCameraEnabled = true
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      expect(result.current.isPublishing).toBe(true)
    })

    it('returns videoTrack as null initially', () => {
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      expect(result.current.videoTrack).toBe(null)
    })
  })

  describe('toggleVideo', () => {
    it('calls setCameraEnabled(true) when video is off', async () => {
      mockSetCameraEnabled.mockResolvedValue(undefined)
      mockGetTrackPublication.mockReturnValue(null)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.toggleVideo()
      })

      expect(mockSetCameraEnabled).toHaveBeenCalledWith(true, {
        resolution: VideoPresets.h720,
        facingMode: 'user',
      })
    })

    it('calls setCameraEnabled(false) when video is on', async () => {
      useSettingsStore.setState({ isVideoOff: false })
      mockSetCameraEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.toggleVideo()
      })

      expect(mockSetCameraEnabled).toHaveBeenCalledWith(false)
    })

    it('updates isVideoOff state in store after toggle', async () => {
      mockSetCameraEnabled.mockResolvedValue(undefined)
      mockGetTrackPublication.mockReturnValue(null)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      expect(useSettingsStore.getState().isVideoOff).toBe(true)

      await act(async () => {
        await result.current.toggleVideo()
      })

      expect(useSettingsStore.getState().isVideoOff).toBe(false)
    })

    it('provides optimistic UI update before async completes (AC-2.8.4)', async () => {
      // Create a delayed promise to test optimistic update
      let resolvePromise: (value?: unknown) => void
      mockSetCameraEnabled.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )
      mockGetTrackPublication.mockReturnValue(null)

      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      // Start the toggle but don't await
      act(() => {
        result.current.toggleVideo()
      })

      // isVideoOff should be updated immediately (optimistic)
      expect(useSettingsStore.getState().isVideoOff).toBe(false)

      // Resolve the promise
      await act(async () => {
        resolvePromise()
      })
    })
  })

  describe('enableCamera', () => {
    it('does nothing when room is null', async () => {
      const { result } = renderHook(() => useVideo({ room: null }))

      await act(async () => {
        await result.current.enableCamera()
      })

      expect(mockSetCameraEnabled).not.toHaveBeenCalled()
    })

    it('sets isVideoOff to false on success', async () => {
      mockSetCameraEnabled.mockResolvedValue(undefined)
      mockGetTrackPublication.mockReturnValue(null)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableCamera()
      })

      expect(useSettingsStore.getState().isVideoOff).toBe(false)
    })

    it('uses 720p resolution by default (AC-2.8.8)', async () => {
      mockSetCameraEnabled.mockResolvedValue(undefined)
      mockGetTrackPublication.mockReturnValue(null)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableCamera()
      })

      expect(mockSetCameraEnabled).toHaveBeenCalledWith(true, {
        resolution: VideoPresets.h720,
        facingMode: 'user',
      })
    })

    it('updates participant hasVideo state in roomStore', async () => {
      mockSetCameraEnabled.mockResolvedValue(undefined)
      mockGetTrackPublication.mockReturnValue(null)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableCamera()
      })

      await waitFor(() => {
        expect(useRoomStore.getState().localParticipant?.hasVideo).toBe(true)
      })
    })
  })

  describe('disableCamera', () => {
    it('does nothing when room is null', async () => {
      useSettingsStore.setState({ isVideoOff: false })
      const { result } = renderHook(() => useVideo({ room: null }))

      await act(async () => {
        await result.current.disableCamera()
      })

      expect(mockSetCameraEnabled).not.toHaveBeenCalled()
    })

    it('sets isVideoOff to true on success', async () => {
      useSettingsStore.setState({ isVideoOff: false })
      mockSetCameraEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.disableCamera()
      })

      expect(useSettingsStore.getState().isVideoOff).toBe(true)
    })

    it('updates participant hasVideo state in roomStore', async () => {
      useSettingsStore.setState({ isVideoOff: false })
      useRoomStore.setState({
        localParticipant: {
          id: 'local-user',
          name: 'Test User',
          role: 'host',
          color: '#f97316',
          isLocal: true,
          hasVideo: true,
        },
        remoteParticipants: [],
      })
      mockSetCameraEnabled.mockResolvedValue(undefined)
      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.disableCamera()
      })

      await waitFor(() => {
        expect(useRoomStore.getState().localParticipant?.hasVideo).toBe(false)
      })
    })
  })

  describe('permission denied handling (AC-2.8.6)', () => {
    it('shows toast on NotAllowedError', async () => {
      const { toast } = await import('sonner')
      const notAllowedError = new Error('Permission denied')
      notAllowedError.name = 'NotAllowedError'
      mockSetCameraEnabled.mockRejectedValue(notAllowedError)

      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableCamera()
      })

      expect(toast.error).toHaveBeenCalledWith(
        'Camera access denied. Check system settings.'
      )
    })

    it('reverts to video off state on permission denied', async () => {
      const notAllowedError = new Error('Permission denied')
      notAllowedError.name = 'NotAllowedError'
      mockSetCameraEnabled.mockRejectedValue(notAllowedError)

      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableCamera()
      })

      expect(useSettingsStore.getState().isVideoOff).toBe(true)
    })

    it('shows generic error toast for other errors', async () => {
      const { toast } = await import('sonner')
      mockSetCameraEnabled.mockRejectedValue(new Error('Unknown error'))

      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableCamera()
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to enable camera')
    })
  })

  describe('video track', () => {
    it('sets videoTrack when camera is enabled', async () => {
      const mockTrack = { attach: vi.fn(), detach: vi.fn() }
      mockSetCameraEnabled.mockResolvedValue(undefined)
      mockGetTrackPublication.mockReturnValue({ track: mockTrack })

      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.enableCamera()
      })

      expect(result.current.videoTrack).toBe(mockTrack)
    })

    it('clears videoTrack when camera is disabled', async () => {
      useSettingsStore.setState({ isVideoOff: false })
      mockSetCameraEnabled.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVideo({ room: mockRoom as Room }))

      await act(async () => {
        await result.current.disableCamera()
      })

      expect(result.current.videoTrack).toBe(null)
    })
  })
})
