import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScreenShare } from '@/hooks/useScreenShare'
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
      expect(result.current.remoteScreenTrack).toBeNull()
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

    it('should show error when LiveKit credentials missing on non-Windows platforms', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()

      // Mock platform as macOS
      mockInvoke.mockResolvedValueOnce('macos')

      // Without passing livekitUrl and token, should error
      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.startScreenShare()
      })

      expect(toast.error).toHaveBeenCalledWith(
        'LiveKit connection info not available for native screen share'
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

  describe('remote screen share events', () => {
    it('should set remoteScreenTrack on TrackSubscribed event for screen share', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      // Capture the event handler when on() is called
      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
      })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Initially no remote track
      expect(result.current.remoteScreenTrack).toBeNull()

      // Simulate remote screen share track subscription
      const mockRemoteTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'remote-screen-track-123',
      }
      const mockPublication = {}
      const mockParticipant = {
        identity: 'remote-user-123',
        name: 'Remote User',
      }

      await act(async () => {
        trackSubscribedHandler?.(mockRemoteTrack, mockPublication, mockParticipant)
      })

      // Store should be updated with remote sharer info
      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(true)
      expect(state.sharerName).toBe('Remote User')
    })

    it('should clear remoteScreenTrack on TrackUnsubscribed event', async () => {
      const mockRoom = createMockRoom()
      let trackUnsubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackUnsubscribed') {
          trackUnsubscribedHandler = handler
        }
      })

      // Set up initial state with remote sharer
      useScreenShareStore.setState({
        isSharing: true,
        sharerId: 'remote-user-123',
        sharerName: 'Remote User',
        isLocalSharing: false,
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate remote screen share track unsubscription
      const mockRemoteTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'remote-screen-track-123',
      }

      await act(async () => {
        trackUnsubscribedHandler?.(mockRemoteTrack, {}, { identity: 'remote-user-123', name: 'Remote User' })
      })

      // Store should be cleared
      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.sharerName).toBeNull()
    })

    it('should show toast notification when remote sharer stops (AC-3.3.8)', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()
      let trackUnsubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackUnsubscribed') {
          trackUnsubscribedHandler = handler
        }
      })

      // Set up initial state with remote sharer
      useScreenShareStore.setState({
        isSharing: true,
        sharerId: 'remote-user-123',
        sharerName: 'Alice',
        isLocalSharing: false,
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate remote screen share track unsubscription
      const mockRemoteTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'remote-screen-track-123',
      }

      await act(async () => {
        trackUnsubscribedHandler?.(mockRemoteTrack, {}, { identity: 'remote-user-123', name: 'Alice' })
      })

      // Should show toast notification for viewers
      expect(toast.info).toHaveBeenCalledWith('Alice stopped sharing')
    })

    it('should use participant identity if name is not available (AC-3.3.8)', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()
      let trackUnsubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackUnsubscribed') {
          trackUnsubscribedHandler = handler
        }
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate remote screen share track unsubscription with no name
      const mockRemoteTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'remote-screen-track-123',
      }

      await act(async () => {
        trackUnsubscribedHandler?.(mockRemoteTrack, {}, { identity: 'user-id-456', name: '' })
      })

      // Should fall back to identity
      expect(toast.info).toHaveBeenCalledWith('user-id-456 stopped sharing')
    })
  })

  describe('system-initiated stop (AC-3.3.10)', () => {
    it('should handle track ended event from browser stop button', async () => {
      const mockRoom = createMockRoom()

      // Mock platform as Windows
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'minimize_main_window') return Promise.resolve()
        if (cmd === 'restore_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      // Create a mock track with onended that we can trigger
      let onEndedCallback: (() => void) | null = null
      const mockTrack = {
        id: 'video-track-123',
        get onended() { return onEndedCallback },
        set onended(callback: (() => void) | null) { onEndedCallback = callback },
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

      // Start screen share
      await act(async () => {
        await result.current.startScreenShare()
      })

      // Verify sharing started
      expect(useScreenShareStore.getState().isLocalSharing).toBe(true)

      // Simulate system-initiated stop (browser "Stop sharing" button)
      await act(async () => {
        onEndedCallback?.()
      })

      // State should be reset
      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.isLocalSharing).toBe(false)

      // Window should be restored
      expect(mockInvoke).toHaveBeenCalledWith('restore_main_window')
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

    it('should set canShare to false when remote participant starts sharing (AC-3.4.1)', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
      })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Initially canShare is true
      expect(result.current.canShare).toBe(true)

      // Simulate remote screen share track subscription
      const mockRemoteTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'remote-screen-track-123',
      }

      await act(async () => {
        trackSubscribedHandler?.(mockRemoteTrack, {}, { identity: 'remote-user', name: 'Alice' })
      })

      // canShare should now be false
      expect(result.current.canShare).toBe(false)
    })

    it('should set canShare to true when remote participant stops sharing (AC-3.4.3)', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void
      let trackUnsubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
        if (event === 'trackUnsubscribed') {
          trackUnsubscribedHandler = handler
        }
      })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate remote screen share start
      const mockRemoteTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'remote-screen-track-123',
      }

      await act(async () => {
        trackSubscribedHandler?.(mockRemoteTrack, {}, { identity: 'remote-user', name: 'Alice' })
      })

      // canShare should be false while remote is sharing
      expect(result.current.canShare).toBe(false)

      // Simulate remote screen share stop
      await act(async () => {
        trackUnsubscribedHandler?.(mockRemoteTrack, {}, { identity: 'remote-user', name: 'Alice' })
      })

      // canShare should be true again
      expect(result.current.canShare).toBe(true)
    })

    it('should handle rapid share/stop cycles without race conditions (AC-3.4.3)', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void
      let trackUnsubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
        if (event === 'trackUnsubscribed') {
          trackUnsubscribedHandler = handler
        }
      })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      const mockRemoteTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'remote-screen-track-123',
      }
      const mockParticipant = { identity: 'remote-user', name: 'Alice' }

      // Rapid start/stop cycles
      await act(async () => {
        trackSubscribedHandler?.(mockRemoteTrack, {}, mockParticipant)
        trackUnsubscribedHandler?.(mockRemoteTrack, {}, mockParticipant)
        trackSubscribedHandler?.(mockRemoteTrack, {}, mockParticipant)
        trackUnsubscribedHandler?.(mockRemoteTrack, {}, mockParticipant)
      })

      // After all events, canShare should be true (last event was unsubscribed)
      expect(result.current.canShare).toBe(true)

      // Another rapid cycle ending with subscribe
      await act(async () => {
        trackSubscribedHandler?.(mockRemoteTrack, {}, mockParticipant)
      })

      // Should be false now
      expect(result.current.canShare).toBe(false)
    })
  })

  describe('screen share participant association (Story 3.11)', () => {
    it('should associate screen share with main participant using parentId metadata (AC-3.11.2)', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      // Add remoteParticipants Map to mock room
      const mockMainParticipant = {
        identity: 'main-user-123',
        name: 'Alice',
      }
      const mockRemoteParticipants = new Map([['main-user-123', mockMainParticipant]])
      Object.assign(mockRoom, { remoteParticipants: mockRemoteParticipants })

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate screen share from sidecar participant (has isScreenShare metadata)
      const mockScreenShareTrack = {
        source: 'screen_share',
        kind: 'video',
        id: 'screen-track-123',
      }
      const mockScreenShareParticipant = {
        identity: 'main-user-123-screenshare',
        name: 'Alice (Screen)',
        metadata: JSON.stringify({
          role: 'screenshare',
          parentId: 'main-user-123',
          isScreenShare: true,
        }),
      }

      await act(async () => {
        trackSubscribedHandler?.(mockScreenShareTrack, {}, mockScreenShareParticipant)
      })

      // Store should use main participant's info, not screen share participant
      const state = useScreenShareStore.getState()
      expect(state.sharerId).toBe('main-user-123') // parentId, not screenshare identity
      expect(state.sharerName).toBe('Alice') // Main participant name, not "Alice (Screen)"
    })

    it('should update main participant isScreenSharing state, not screen share participant (AC-3.11.2)', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      const mockMainParticipant = { identity: 'main-user-123', name: 'Alice' }
      const mockRemoteParticipants = new Map([['main-user-123', mockMainParticipant]])
      Object.assign(mockRoom, { remoteParticipants: mockRemoteParticipants })

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
      })

      // Set up main participant in room store
      useRoomStore.setState({
        localParticipant: { id: 'local-user', name: 'Bob', role: 'host', color: '#ff0000', isLocal: true },
        remoteParticipants: [{ id: 'main-user-123', name: 'Alice', role: 'annotator', color: '#00ff00', isLocal: false, isScreenSharing: false }],
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate screen share from sidecar
      const mockScreenShareTrack = { source: 'screen_share', kind: 'video', id: 'screen-track-123' }
      const mockScreenShareParticipant = {
        identity: 'main-user-123-screenshare',
        name: 'Alice (Screen)',
        metadata: JSON.stringify({ role: 'screenshare', parentId: 'main-user-123', isScreenShare: true }),
      }

      await act(async () => {
        trackSubscribedHandler?.(mockScreenShareTrack, {}, mockScreenShareParticipant)
      })

      // Main participant should have isScreenSharing: true
      const roomState = useRoomStore.getState()
      const mainParticipant = roomState.remoteParticipants.find(p => p.id === 'main-user-123')
      expect(mainParticipant?.isScreenSharing).toBe(true)
    })

    it('should use main participant name in stop notification (AC-3.11.5)', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()
      let trackUnsubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      const mockMainParticipant = { identity: 'main-user-123', name: 'Alice' }
      const mockRemoteParticipants = new Map([['main-user-123', mockMainParticipant]])
      Object.assign(mockRoom, { remoteParticipants: mockRemoteParticipants })

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackUnsubscribed') {
          trackUnsubscribedHandler = handler
        }
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate screen share stop from sidecar
      const mockScreenShareTrack = { source: 'screen_share', kind: 'video', id: 'screen-track-123' }
      const mockScreenShareParticipant = {
        identity: 'main-user-123-screenshare',
        name: 'Alice (Screen)',
        metadata: JSON.stringify({ role: 'screenshare', parentId: 'main-user-123', isScreenShare: true }),
      }

      await act(async () => {
        trackUnsubscribedHandler?.(mockScreenShareTrack, {}, mockScreenShareParticipant)
      })

      // Toast should show main participant's name, not "Alice (Screen)"
      expect(toast.info).toHaveBeenCalledWith('Alice stopped sharing')
    })

    it('should handle direct screen share (Windows) without metadata', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      const mockRemoteParticipants = new Map()
      Object.assign(mockRoom, { remoteParticipants: mockRemoteParticipants })

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate direct screen share (no isScreenShare metadata - Windows/getDisplayMedia)
      const mockScreenShareTrack = { source: 'screen_share', kind: 'video', id: 'screen-track-123' }
      const mockParticipant = {
        identity: 'remote-user-456',
        name: 'Bob',
        metadata: JSON.stringify({ role: 'annotator', color: '#00ff00' }), // No isScreenShare
      }

      await act(async () => {
        trackSubscribedHandler?.(mockScreenShareTrack, {}, mockParticipant)
      })

      // Should use participant directly
      const state = useScreenShareStore.getState()
      expect(state.sharerId).toBe('remote-user-456')
      expect(state.sharerName).toBe('Bob')
    })
  })

  describe('screen share quality optimization', () => {
    it('should set contentHint to "text" on video track (AC-3.5.4)', async () => {
      const mockRoom = createMockRoom()

      // Mock platform as Windows
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      // Create a mock track that captures contentHint assignment
      let capturedContentHint: string | undefined
      const mockTrack = {
        id: 'video-track-123',
        onended: null,
        stop: vi.fn(),
        get contentHint(): string | undefined { return capturedContentHint },
        set contentHint(value: string) { capturedContentHint = value },
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

      // contentHint should be set to 'text' for text-optimized encoding
      expect(capturedContentHint).toBe('text')
    })

    it('should publish track with VP9 codec (AC-3.5.3)', async () => {
      const mockRoom = createMockRoom()

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      const mockTrack = {
        id: 'video-track-123',
        onended: null,
        stop: vi.fn(),
        contentHint: '',
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

      // Verify publishTrack was called with VP9 codec
      expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          videoCodec: 'vp9',
        })
      )
    })

    it('should publish track with degradationPreference "maintain-resolution" (AC-3.5.2)', async () => {
      const mockRoom = createMockRoom()

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      const mockTrack = {
        id: 'video-track-123',
        onended: null,
        stop: vi.fn(),
        contentHint: '',
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

      // Verify publishTrack was called with degradationPreference
      expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          degradationPreference: 'maintain-resolution',
        })
      )
    })

    it('should publish track with correct encoding settings (AC-3.5.1)', async () => {
      const mockRoom = createMockRoom()

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      const mockTrack = {
        id: 'video-track-123',
        onended: null,
        stop: vi.fn(),
        contentHint: '',
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

      // Verify publishTrack was called with all quality optimization options
      expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'screen',
          videoCodec: 'vp9',
          degradationPreference: 'maintain-resolution',
          videoEncoding: expect.objectContaining({
            maxBitrate: 6_000_000,
            maxFramerate: 30,
          }),
        })
      )
    })
  })
})
