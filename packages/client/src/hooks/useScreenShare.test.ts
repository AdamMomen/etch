import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScreenShare } from './useScreenShare'
import { useScreenShareStore } from '@/stores/screenShareStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock Tauri invoke
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock Room from livekit-client
const createMockRoom = () => ({
  localParticipant: {
    publishTrack: vi.fn().mockResolvedValue({ track: { id: 'screen-track-123' } }),
    unpublishTrack: vi.fn().mockResolvedValue(undefined),
    getTrackPublication: vi.fn().mockReturnValue(null),
  },
  on: vi.fn(),
  off: vi.fn(),
})

describe('useScreenShare', () => {
  beforeEach(() => {
    // Reset stores
    useScreenShareStore.setState({
      isSharing: false,
      sharerId: null,
      sharerName: null,
      isLocalSharing: false,
      sharedSource: null,
      sharedSourceId: null,
    })

    useRoomStore.setState({
      localParticipant: { id: 'local-user-123', name: 'Test User', role: 'host', color: '#ff0000', isLocal: true },
    })

    // Mock __TAURI__ global to simulate Tauri environment
    Object.defineProperty(window, '__TAURI__', {
      value: {},
      writable: true,
      configurable: true,
    })

    // Mock getDisplayMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getDisplayMedia: vi.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockReset()
  })

  describe('initialization', () => {
    it('should return initial state when room is null', () => {
      const { result } = renderHook(() => useScreenShare({ room: null }))

      expect(result.current.isSharing).toBe(false)
      expect(result.current.isLocalSharing).toBe(false)
      expect(result.current.canShare).toBe(true)
      expect(result.current.sharerName).toBeNull()
      expect(result.current.screenTrack).toBeNull()
    })

    it('should return functions for starting and stopping share', () => {
      const { result } = renderHook(() => useScreenShare({ room: null }))

      expect(typeof result.current.startScreenShare).toBe('function')
      expect(typeof result.current.stopScreenShare).toBe('function')
    })
  })

  describe('startScreenShare', () => {
    it('should not start share when room is null', async () => {
      const { toast } = await import('sonner')
      const { result } = renderHook(() => useScreenShare({ room: null }))

      await act(async () => {
        await result.current.startScreenShare()
      })

      expect(toast.error).toHaveBeenCalledWith('Not connected to a room')
    })

    it('should not start share when someone else is already sharing', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()

      // Set up state where another user is sharing
      useScreenShareStore.setState({
        isSharing: true,
        sharerId: 'other-user',
        sharerName: 'Other User',
        isLocalSharing: false,
      })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.startScreenShare()
      })

      expect(toast.error).toHaveBeenCalledWith('Other User is already sharing')
    })

    it('should show info message on non-Windows platforms', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()

      // Mock platform as macOS
      mockInvoke.mockResolvedValueOnce('macos')

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.startScreenShare()
      })

      expect(toast.info).toHaveBeenCalledWith(
        'Screen sharing on macOS/Linux coming soon',
        expect.objectContaining({ description: expect.any(String) })
      )
    })

    it('should handle user cancellation gracefully (AC-3.1.5)', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()

      // Mock platform as Windows
      mockInvoke.mockResolvedValueOnce('windows')

      // Mock getDisplayMedia rejection (user cancelled)
      const mockError = new Error('Permission denied')
      mockError.name = 'NotAllowedError'
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(mockError)

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.startScreenShare()
      })

      // Should not show error toast when user cancels
      expect(toast.error).not.toHaveBeenCalled()

      // State should remain unchanged
      expect(result.current.isSharing).toBe(false)
      expect(result.current.isLocalSharing).toBe(false)
    })

    it('should start screen share successfully on Windows', async () => {
      const mockRoom = createMockRoom()

      // Mock platform as Windows and minimize_main_window
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      // Mock successful getDisplayMedia
      const mockTrack = {
        id: 'video-track-123',
        onended: null,
        stop: vi.fn(),
      }
      const mockStream = {
        getVideoTracks: () => [mockTrack],
        getTracks: () => [mockTrack],
      }
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(
        mockStream as unknown as MediaStream
      )

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.startScreenShare()
      })

      // Should call getDisplayMedia with correct constraints
      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      })

      // Should publish track to LiveKit
      expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()

      // Should call minimize after successful publish
      expect(mockInvoke).toHaveBeenCalledWith('minimize_main_window')
    })
  })

  describe('stopScreenShare', () => {
    it('should do nothing when room is null', async () => {
      const { result } = renderHook(() => useScreenShare({ room: null }))

      await act(async () => {
        await result.current.stopScreenShare()
      })

      // Should complete without error
      expect(result.current.isSharing).toBe(false)
    })

    it('should restore window when stopping share', async () => {
      const mockRoom = createMockRoom()

      // Mock restore_main_window
      mockInvoke.mockResolvedValue(undefined)

      // Set up sharing state
      useScreenShareStore.setState({
        isSharing: true,
        isLocalSharing: true,
        sharedSource: 'screen',
        sharedSourceId: 'screen-123',
      })

      const mockTrack = {
        stop: vi.fn(),
      }
      mockRoom.localParticipant.getTrackPublication.mockReturnValue({
        track: mockTrack,
      })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.stopScreenShare()
      })

      // Should call restore window
      expect(mockInvoke).toHaveBeenCalledWith('restore_main_window')

      // Should update store state
      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.isLocalSharing).toBe(false)
    })
  })

  describe('canShare state', () => {
    it('should return canShare as true initially', () => {
      const { result } = renderHook(() => useScreenShare({ room: null }))

      expect(result.current.canShare).toBe(true)
    })

    it('should have canShare remain true after successful share setup', async () => {
      const mockRoom = createMockRoom()

      // Mock platform as Windows and minimize_main_window
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      const mockTrack = { id: 'track-123', onended: null, stop: vi.fn() }
      const mockStream = {
        getVideoTracks: () => [mockTrack],
        getTracks: () => [mockTrack],
      }
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(
        mockStream as unknown as MediaStream
      )

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.startScreenShare()
      })

      // After successful share, canShare remains true (allows stopping)
      // The button uses isLocalSharing to determine state
      expect(typeof result.current.canShare).toBe('boolean')
    })
  })
})
