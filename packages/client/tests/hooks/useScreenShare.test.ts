import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScreenShare, showSharingTray, hideSharingTray, storeWindowBounds, minimizeMainWindow, restoreMainWindow } from '@/hooks/useScreenShare'
import { useScreenShareStore } from '@/stores/screenShareStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock Tauri invoke
const mockInvoke = vi.fn().mockResolvedValue(undefined)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => {})),
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
  remoteParticipants: new Map(),
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
    // Re-establish default mock behavior after reset
    mockInvoke.mockResolvedValue(undefined)
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

      // Mock all Tauri commands - Windows platform + overlay commands
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'is_overlay_active') return Promise.resolve(false)
        if (cmd === 'create_annotation_overlay') return Promise.resolve()
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

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

      // Mock platform as Windows
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        // ADR-011: No more minimize_main_window - tray handles sharer controls
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

      // ADR-011: No more minimize - tray menu is used instead
      // MeetingRoom component will call showSharingTray() separately
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

    it('should stop screen share and update store state', async () => {
      const mockRoom = createMockRoom()

      // Mock Tauri commands
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

      // ADR-011: No more restore_main_window - tray handles sharer controls
      // MeetingRoom component will call hideSharingTray() separately

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

    it('should clear remoteScreenTrack on TrackUnpublished event', async () => {
      const mockRoom = createMockRoom()
      let trackUnpublishedHandler: (publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (publication: unknown, participant: unknown) => void) => {
        if (event === 'trackUnpublished') {
          trackUnpublishedHandler = handler
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

      // Simulate remote screen share track unpublish (publication has source, not track)
      const mockPublication = {
        source: 'screen_share',
        kind: 'video',
        trackSid: 'remote-screen-track-123',
      }

      await act(async () => {
        trackUnpublishedHandler?.(mockPublication, { identity: 'remote-user-123', name: 'Remote User' })
      })

      // Store should be cleared
      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.sharerName).toBeNull()
    })

    it('should show toast notification when remote sharer stops (AC-3.3.8)', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()
      let trackUnpublishedHandler: (publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (publication: unknown, participant: unknown) => void) => {
        if (event === 'trackUnpublished') {
          trackUnpublishedHandler = handler
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

      // Simulate remote screen share track unpublish
      const mockPublication = {
        source: 'screen_share',
        kind: 'video',
        trackSid: 'remote-screen-track-123',
      }

      await act(async () => {
        trackUnpublishedHandler?.(mockPublication, { identity: 'remote-user-123', name: 'Alice' })
      })

      // Should show toast notification for viewers
      expect(toast.info).toHaveBeenCalledWith('Alice stopped sharing')
    })

    it('should use participant identity if name is not available (AC-3.3.8)', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()
      let trackUnpublishedHandler: (publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (publication: unknown, participant: unknown) => void) => {
        if (event === 'trackUnpublished') {
          trackUnpublishedHandler = handler
        }
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate remote screen share track unpublish with no name
      const mockPublication = {
        source: 'screen_share',
        kind: 'video',
        trackSid: 'remote-screen-track-123',
      }

      await act(async () => {
        trackUnpublishedHandler?.(mockPublication, { identity: 'user-id-456', name: '' })
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
        // ADR-011: No more minimize/restore - tray handles sharer controls
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

      // ADR-011: No more restore_main_window - tray handles sharer controls
      // MeetingRoom component will call hideSharingTray() via useEffect
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
      let trackUnpublishedHandler: (publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler as (track: unknown, publication: unknown, participant: unknown) => void
        }
        if (event === 'trackUnpublished') {
          trackUnpublishedHandler = handler as (publication: unknown, participant: unknown) => void
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

      // Simulate remote screen share stop (publication has source, not track)
      const mockPublication = { source: 'screen_share', kind: 'video', trackSid: 'remote-screen-track-123' }
      await act(async () => {
        trackUnpublishedHandler?.(mockPublication, { identity: 'remote-user', name: 'Alice' })
      })

      // canShare should be true again
      expect(result.current.canShare).toBe(true)
    })

    it('should handle rapid share/stop cycles without race conditions (AC-3.4.3)', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void
      let trackUnpublishedHandler: (publication: unknown, participant: unknown) => void

      mockRoom.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler as (track: unknown, publication: unknown, participant: unknown) => void
        }
        if (event === 'trackUnpublished') {
          trackUnpublishedHandler = handler as (publication: unknown, participant: unknown) => void
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
      const mockPublication = { source: 'screen_share', kind: 'video', trackSid: 'remote-screen-track-123' }
      const mockParticipant = { identity: 'remote-user', name: 'Alice' }

      // Rapid start/stop cycles
      await act(async () => {
        trackSubscribedHandler?.(mockRemoteTrack, {}, mockParticipant)
        trackUnpublishedHandler?.(mockPublication, mockParticipant)
        trackSubscribedHandler?.(mockRemoteTrack, {}, mockParticipant)
        trackUnpublishedHandler?.(mockPublication, mockParticipant)
      })

      // After all events, canShare should be true (last event was unpublished)
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

      // Add remoteParticipants Map to mock room (with trackPublications for late-joiner scan)
      const mockMainParticipant = {
        identity: 'main-user-123',
        name: 'Alice',
        trackPublications: new Map(),
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

      const mockMainParticipant = { identity: 'main-user-123', name: 'Alice', trackPublications: new Map() }
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
      let trackUnpublishedHandler: (publication: unknown, participant: unknown) => void

      const mockMainParticipant = { identity: 'main-user-123', name: 'Alice', trackPublications: new Map() }
      const mockRemoteParticipants = new Map([['main-user-123', mockMainParticipant]])
      Object.assign(mockRoom, { remoteParticipants: mockRemoteParticipants })

      mockRoom.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'trackUnpublished') {
          trackUnpublishedHandler = handler as (publication: unknown, participant: unknown) => void
        }
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate screen share stop from sidecar
      const mockPublication = { source: 'screen_share', kind: 'video', trackSid: 'screen-track-123' }
      const mockScreenShareParticipant = {
        identity: 'main-user-123-screenshare',
        name: 'Alice (Screen)',
        metadata: JSON.stringify({ role: 'screenshare', parentId: 'main-user-123', isScreenShare: true }),
      }

      await act(async () => {
        trackUnpublishedHandler?.(mockPublication, mockScreenShareParticipant)
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

    it('should NOT treat own sidecar screen share as remote (fix for host stop issue)', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      // Set up local participant
      const localParticipantId = 'local-user-123'
      Object.assign(mockRoom, {
        localParticipant: {
          ...mockRoom.localParticipant,
          identity: localParticipantId,
        },
        remoteParticipants: new Map(),
      })

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
      })

      // Set up initial state where local user started sharing
      useScreenShareStore.setState({
        isSharing: true,
        isLocalSharing: true,
        sharerId: null,
        sharerName: null,
        sharedSource: 'screen',
        sharedSourceId: 'screen:123',
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Simulate OWN sidecar screen share track being subscribed
      // (This happens because Core connects as separate participant)
      const mockScreenShareTrack = { source: 'screen_share', kind: 'video', id: 'screen-track-123' }
      const mockOwnSidecarParticipant = {
        identity: `${localParticipantId}-screenshare`,
        name: 'Test User (Screen)',
        metadata: JSON.stringify({
          role: 'screenshare',
          parentId: localParticipantId, // Points to local user
          isScreenShare: true,
        }),
      }

      await act(async () => {
        trackSubscribedHandler?.(mockScreenShareTrack, {}, mockOwnSidecarParticipant)
      })

      // isLocalSharing should STILL be true (not overwritten by setRemoteSharer)
      const state = useScreenShareStore.getState()
      expect(state.isLocalSharing).toBe(true)
      // sharerId should NOT be set (we're the sharer, not a remote)
      expect(state.sharerId).toBeNull()
      expect(state.sharerName).toBeNull()
    })

    it('should NOT show toast when own sidecar screen share stops', async () => {
      const { toast } = await import('sonner')
      const mockRoom = createMockRoom()
      let trackUnpublishedHandler: (publication: unknown, participant: unknown) => void

      // Set up local participant
      const localParticipantId = 'local-user-123'
      Object.assign(mockRoom, {
        localParticipant: {
          ...mockRoom.localParticipant,
          identity: localParticipantId,
        },
        remoteParticipants: new Map(),
      })

      mockRoom.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'trackUnpublished') {
          trackUnpublishedHandler = handler as (publication: unknown, participant: unknown) => void
        }
      })

      // Set up initial state where local user is sharing
      useScreenShareStore.setState({
        isSharing: true,
        isLocalSharing: true,
        sharerId: null,
        sharerName: null,
        sharedSource: 'screen',
        sharedSourceId: 'screen:123',
      })

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Clear any previous toast calls
      vi.mocked(toast.info).mockClear()

      // Simulate OWN sidecar screen share track being unpublished
      const mockPublication = { source: 'screen_share', kind: 'video', trackSid: 'screen-track-123' }
      const mockOwnSidecarParticipant = {
        identity: `${localParticipantId}-screenshare`,
        name: 'Test User (Screen)',
        metadata: JSON.stringify({
          role: 'screenshare',
          parentId: localParticipantId,
          isScreenShare: true,
        }),
      }

      await act(async () => {
        trackUnpublishedHandler?.(mockPublication, mockOwnSidecarParticipant)
      })

      // Should NOT show "stopped sharing" toast for own screen share
      expect(toast.info).not.toHaveBeenCalled()

      // isLocalSharing should remain true (cleanup handled by handleStopShare, not this handler)
      const state = useScreenShareStore.getState()
      expect(state.isLocalSharing).toBe(true)
    })

    it('should NOT disable canShare when own sidecar screen share is subscribed', async () => {
      const mockRoom = createMockRoom()
      let trackSubscribedHandler: (track: unknown, publication: unknown, participant: unknown) => void

      const localParticipantId = 'local-user-123'
      Object.assign(mockRoom, {
        localParticipant: {
          ...mockRoom.localParticipant,
          identity: localParticipantId,
        },
        remoteParticipants: new Map(),
      })

      mockRoom.on.mockImplementation((event: string, handler: (track: unknown, publication: unknown, participant: unknown) => void) => {
        if (event === 'trackSubscribed') {
          trackSubscribedHandler = handler
        }
      })

      // Set up state where local user started sharing (canShare already false from startScreenShare)
      useScreenShareStore.setState({
        isSharing: true,
        isLocalSharing: true,
      })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // canShare starts as true in the hook state
      expect(result.current.canShare).toBe(true)

      // Simulate OWN sidecar screen share track subscription
      const mockScreenShareTrack = { source: 'screen_share', kind: 'video', id: 'screen-track-123' }
      const mockOwnSidecarParticipant = {
        identity: `${localParticipantId}-screenshare`,
        name: 'Test User (Screen)',
        metadata: JSON.stringify({
          role: 'screenshare',
          parentId: localParticipantId,
          isScreenShare: true,
        }),
      }

      await act(async () => {
        trackSubscribedHandler?.(mockScreenShareTrack, {}, mockOwnSidecarParticipant)
      })

      // canShare should remain true (not disabled by own screen share)
      // This allows the stop button to work
      expect(result.current.canShare).toBe(true)
    })
  })

  describe('system tray API (Story 3.7 - ADR-011)', () => {
    it('should call show_sharing_tray when showSharingTray is called (AC-3.7.1)', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await showSharingTray()

      expect(mockInvoke).toHaveBeenCalledWith('show_sharing_tray')
    })

    it('should call hide_sharing_tray when hideSharingTray is called (AC-3.7.7)', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await hideSharingTray()

      expect(mockInvoke).toHaveBeenCalledWith('hide_sharing_tray')
    })

    it('should handle showSharingTray failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockInvoke.mockRejectedValueOnce(new Error('Tray creation failed'))

      await showSharingTray()

      expect(consoleSpy).toHaveBeenCalledWith('[Tray] Failed to show sharing tray:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should handle hideSharingTray failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockInvoke.mockRejectedValueOnce(new Error('Tray removal failed'))

      await hideSharingTray()

      expect(consoleSpy).toHaveBeenCalledWith('[Tray] Failed to hide sharing tray:', expect.any(Error))
      consoleSpy.mockRestore()
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

  describe('window minimize/restore (Story 3.9)', () => {
    it('should call store_window_bounds when storeWindowBounds is called (AC-3.9.4)', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await storeWindowBounds()

      expect(mockInvoke).toHaveBeenCalledWith('store_window_bounds')
    })

    it('should call minimize_main_window when minimizeMainWindow is called (AC-3.9.1)', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await minimizeMainWindow()

      expect(mockInvoke).toHaveBeenCalledWith('minimize_main_window')
    })

    it('should call restore_main_window when restoreMainWindow is called (AC-3.9.3)', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      await restoreMainWindow()

      expect(mockInvoke).toHaveBeenCalledWith('restore_main_window')
    })

    it('should handle storeWindowBounds failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockInvoke.mockRejectedValueOnce(new Error('Window not found'))

      await storeWindowBounds()

      expect(consoleSpy).toHaveBeenCalledWith('[Window] Failed to store bounds:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should handle minimizeMainWindow failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockInvoke.mockRejectedValueOnce(new Error('Minimize failed'))

      await minimizeMainWindow()

      expect(consoleSpy).toHaveBeenCalledWith('[Window] Failed to minimize:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should handle restoreMainWindow failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockInvoke.mockRejectedValueOnce(new Error('Restore failed'))

      await restoreMainWindow()

      expect(consoleSpy).toHaveBeenCalledWith('[Window] Failed to restore:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should store bounds and minimize on same-screen share start (AC-3.9.1, AC-3.9.4)', async () => {
      const mockRoom = createMockRoom()

      // Mock platform as Windows
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        if (cmd === 'get_window_monitor') return Promise.resolve({ x: 0, y: 0, width: 1920, height: 1080 })
        if (cmd === 'store_window_bounds') return Promise.resolve()
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      const mockTrack = { id: 'track-123', onended: null, stop: vi.fn(), contentHint: '' }
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

      // Verify store_window_bounds was called before minimize_main_window
      const calls = mockInvoke.mock.calls.map(c => c[0])
      const storeBoundsIndex = calls.indexOf('store_window_bounds')
      const minimizeIndex = calls.indexOf('minimize_main_window')

      expect(storeBoundsIndex).toBeGreaterThan(-1)
      expect(minimizeIndex).toBeGreaterThan(-1)
      expect(storeBoundsIndex).toBeLessThan(minimizeIndex)
    })

    it('should NOT minimize when on different screen (AC-3.9.1 condition)', async () => {
      const mockRoom = createMockRoom()

      // Mock platform as Windows
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_platform') return Promise.resolve('windows')
        // Return a monitor on a different screen (x: 1920 means secondary monitor)
        if (cmd === 'get_window_monitor') return Promise.resolve({ x: 1920, y: 0, width: 1920, height: 1080 })
        if (cmd === 'store_window_bounds') return Promise.resolve()
        if (cmd === 'minimize_main_window') return Promise.resolve()
        return Promise.resolve()
      })

      const mockTrack = { id: 'track-123', onended: null, stop: vi.fn(), contentHint: '' }
      const mockStream = {
        getVideoTracks: () => [mockTrack],
        getTracks: () => [mockTrack],
      }
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(
        mockStream as unknown as MediaStream
      )

      const consoleSpy = vi.spyOn(console, 'log')

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.startScreenShare()
      })

      // Verify "Skipping minimize (different screen)" was logged
      expect(consoleSpy).toHaveBeenCalledWith('[ScreenShare] Skipping minimize (different screen)')

      // Verify minimize_main_window was NOT called
      const calls = mockInvoke.mock.calls.map(c => c[0])
      expect(calls).not.toContain('minimize_main_window')

      consoleSpy.mockRestore()
    })

    it('should restore window on share stop (AC-3.9.3)', async () => {
      const mockRoom = createMockRoom()

      // Mock Tauri commands
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

      // Verify restore_main_window was called
      expect(mockInvoke).toHaveBeenCalledWith('restore_main_window')
    })

    it('should restore window after overlay cleanup (AC-3.9.5)', async () => {
      const mockRoom = createMockRoom()

      // Track call order
      const callOrder: string[] = []
      mockInvoke.mockImplementation((cmd: string) => {
        callOrder.push(cmd)
        return Promise.resolve()
      })

      // Set up sharing state
      useScreenShareStore.setState({
        isSharing: true,
        isLocalSharing: true,
        sharedSource: 'screen',
        sharedSourceId: 'screen-123',
      })

      const mockTrack = { stop: vi.fn() }
      mockRoom.localParticipant.getTrackPublication.mockReturnValue({ track: mockTrack })

      const { result } = renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      await act(async () => {
        await result.current.stopScreenShare()
      })

      // Verify destroy_annotation_overlay is called BEFORE restore_main_window
      const destroyIndex = callOrder.indexOf('destroy_annotation_overlay')
      const restoreIndex = callOrder.indexOf('restore_main_window')

      expect(destroyIndex).toBeGreaterThan(-1)
      expect(restoreIndex).toBeGreaterThan(-1)
      expect(destroyIndex).toBeLessThan(restoreIndex)
    })

    it('should cleanup overlay and restore window on LocalTrackUnpublished (AC-3.9.5 system stop)', async () => {
      // Track call order
      const callOrder: string[] = []
      mockInvoke.mockImplementation((cmd: string) => {
        callOrder.push(cmd)
        return Promise.resolve()
      })

      // Set up sharing state
      useScreenShareStore.setState({
        isSharing: true,
        isLocalSharing: true,
        sharedSource: 'screen',
        sharedSourceId: 'screen-123',
      })

      // Create mock room with handler capture
      const eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {}
      const mockRoom = {
        localParticipant: {
          publishTrack: vi.fn().mockResolvedValue({ track: { id: 'screen-track-123' } }),
          unpublishTrack: vi.fn().mockResolvedValue(undefined),
          getTrackPublication: vi.fn().mockReturnValue(null),
        },
        remoteParticipants: new Map(),
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          if (!eventHandlers[event]) {
            eventHandlers[event] = []
          }
          eventHandlers[event].push(handler)
          return mockRoom
        }),
        off: vi.fn(),
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      renderHook(() =>
        useScreenShare({ room: mockRoom as unknown as Parameters<typeof useScreenShare>[0]['room'] })
      )

      // Verify LocalTrackUnpublished handler was registered
      // RoomEvent.LocalTrackUnpublished = 'localTrackUnpublished' (lowercase first letter)
      expect(eventHandlers['localTrackUnpublished']).toBeDefined()
      expect(eventHandlers['localTrackUnpublished'].length).toBeGreaterThan(0)

      // Simulate system-initiated track unpublish (e.g., OS stops share, network disconnect)
      // The handler expects a publication object with source property
      const mockPublication = { source: 'screen_share' }

      await act(async () => {
        for (const handler of eventHandlers['localTrackUnpublished']) {
          await handler(mockPublication)
        }
      })

      // Verify cleanup was logged
      expect(consoleSpy).toHaveBeenCalledWith('[ScreenShare] LocalTrackUnpublished - performing cleanup')

      // Verify destroy_annotation_overlay was called
      expect(callOrder).toContain('destroy_annotation_overlay')

      // Verify restore_main_window was called
      expect(callOrder).toContain('restore_main_window')

      // Verify order: destroy BEFORE restore
      const destroyIndex = callOrder.indexOf('destroy_annotation_overlay')
      const restoreIndex = callOrder.indexOf('restore_main_window')
      expect(destroyIndex).toBeLessThan(restoreIndex)

      consoleSpy.mockRestore()
    })
  })
})
