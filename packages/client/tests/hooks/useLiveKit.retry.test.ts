import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLiveKit } from '@/hooks/useLiveKit'
import { useRoomStore } from '@/stores/roomStore'
import { useSettingsStore } from '@/stores/settingsStore'
import * as api from '@/lib/api'
import { toast } from 'sonner'

// Mock API functions
vi.mock('@/lib/api', () => ({
  validateRoomExists: vi.fn(),
  createRoom: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock LiveKit Room class
vi.mock('livekit-client', () => {
  const mockRoom = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    localParticipant: {
      identity: 'test-user',
      name: 'Test User',
      metadata: JSON.stringify({ role: 'host', color: '#ff0000' }),
      setMicrophoneEnabled: vi.fn(),
      setCameraEnabled: vi.fn(),
      publishData: vi.fn(),
    },
    remoteParticipants: new Map(),
  }

  return {
    Room: vi.fn(() => mockRoom),
    RoomEvent: {
      ConnectionStateChanged: 'connectionStateChanged',
      ParticipantConnected: 'participantConnected',
      ParticipantDisconnected: 'participantDisconnected',
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
      ActiveSpeakersChanged: 'activeSpeakersChanged',
      ParticipantMetadataChanged: 'participantMetadataChanged',
      DataReceived: 'dataReceived',
    },
    ConnectionState: {
      Disconnected: 'disconnected',
      Connecting: 'connecting',
      Connected: 'connected',
    },
    Track: {
      Kind: {
        Video: 'video',
        Audio: 'audio',
      },
      Source: {
        Camera: 'camera',
        Microphone: 'microphone',
      },
    },
    DataPacket_Kind: {
      RELIABLE: 'reliable',
    },
  }
})

describe('useLiveKit - Retry Functionality (Story 2-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default store states
    useRoomStore.setState({
      currentRoom: {
        roomId: 'test-room-123',
        token: 'test-token',
        screenShareToken: 'test-screen-share-token',
        livekitUrl: 'wss://test-livekit.example.com',
      },
      isConnecting: false,
      isConnected: false,
      connectionError: null,
      localParticipant: null,
      remoteParticipants: [],
    })

    useSettingsStore.setState({
      displayName: 'Test User',
      apiBaseUrl: 'http://localhost:3000/api',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('AC-2.16.1: Retry detects room state', () => {
    it('checks if room exists before retry attempt', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(true)

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(api.validateRoomExists).toHaveBeenCalledWith('test-room-123')
      })
    })

    it('differentiates between existing and closed rooms', async () => {
      // First test: room exists
      vi.mocked(api.validateRoomExists).mockResolvedValue(true)

      const { result, rerender } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(api.validateRoomExists).toHaveBeenCalled()
        expect(toast.info).toHaveBeenCalledWith('Rejoining room...')
      })

      vi.clearAllMocks()

      // Second test: room closed
      vi.mocked(api.validateRoomExists).mockResolvedValue(false)
      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-456',
        token: 'new-token',
        screenShareToken: 'new-screen-share-token',
        livekitUrl: 'wss://test-livekit.example.com',
      })

      rerender()
      await result.current.retry()

      await waitFor(() => {
        expect(api.validateRoomExists).toHaveBeenCalled()
        expect(toast.info).toHaveBeenCalledWith('Room closed. Creating new room...')
      })
    })
  })

  describe('AC-2.16.2: Creates new room when previous room closed', () => {
    it('creates new room with user display name when room is closed', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(false)
      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-456',
        token: 'new-token',
        screenShareToken: 'new-screen-share-token',
        livekitUrl: 'wss://test-livekit.example.com',
      })

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(api.createRoom).toHaveBeenCalledWith('Test User')
      })
    })

    it('updates room store with new room credentials', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(false)
      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-456',
        token: 'new-token',
        screenShareToken: 'new-screen-share-token',
        livekitUrl: 'wss://new-livekit.example.com',
      })

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        const roomState = useRoomStore.getState()
        expect(roomState.currentRoom).toEqual({
          roomId: 'new-room-456',
          token: 'new-token',
          screenShareToken: 'new-screen-share-token',
          livekitUrl: 'wss://new-livekit.example.com',
        })
      })
    })

    it('uses default name if displayName is not set', async () => {
      useSettingsStore.setState({ displayName: '' })

      vi.mocked(api.validateRoomExists).mockResolvedValue(false)
      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-456',
        token: 'new-token',
        screenShareToken: 'new-screen-share-token',
        livekitUrl: 'wss://test-livekit.example.com',
      })

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(api.createRoom).toHaveBeenCalledWith('User')
      })
    })

    it('shows success message after new room created', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(false)
      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-456',
        token: 'new-token',
        screenShareToken: 'new-screen-share-token',
        livekitUrl: 'wss://test-livekit.example.com',
      })

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('New room created')
      })
    })
  })

  describe('AC-2.16.3: Rejoins existing room successfully', () => {
    it('attempts to rejoin when room exists', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(true)

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Rejoining room...')
      })

      // Should not create a new room
      expect(api.createRoom).not.toHaveBeenCalled()
    })

    it('does not modify room credentials when rejoining', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(true)

      const originalRoom = useRoomStore.getState().currentRoom

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        const roomState = useRoomStore.getState()
        // Room should remain unchanged when rejoining
        expect(roomState.currentRoom).toEqual(originalRoom)
      })
    })
  })

  describe('AC-2.16.4: UI feedback during retry process', () => {
    it('sets isRetrying to true during retry', async () => {
      vi.mocked(api.validateRoomExists).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      )

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      // Start retry (don't await yet)
      const retryPromise = result.current.retry()

      // Wait for isRetrying to become true
      await waitFor(() => {
        expect(result.current.isRetrying).toBe(true)
      })

      // Wait for retry to complete
      await retryPromise

      await waitFor(() => {
        expect(result.current.isRetrying).toBe(false)
      })
    })

    it('resets isRetrying to false after successful retry', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(true)

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(result.current.isRetrying).toBe(false)
      })
    })

    it('resets isRetrying to false after retry error', async () => {
      vi.mocked(api.validateRoomExists).mockRejectedValue(
        new Error('Network error')
      )

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(result.current.isRetrying).toBe(false)
      })
    })

    it('shows appropriate toast messages during retry flow', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(false)
      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-456',
        token: 'new-token',
        screenShareToken: 'new-screen-share-token',
        livekitUrl: 'wss://test-livekit.example.com',
      })

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        // Should show creating message
        expect(toast.info).toHaveBeenCalledWith('Room closed. Creating new room...')
        // Should show success message
        expect(toast.success).toHaveBeenCalledWith('New room created')
      })
    })
  })

  describe('Error handling', () => {
    it('handles validation network errors gracefully', async () => {
      vi.mocked(api.validateRoomExists).mockRejectedValue(
        new Error('Cannot connect to server')
      )

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Cannot connect to server')
        expect(result.current.isRetrying).toBe(false)
      })
    })

    it('handles room creation errors gracefully', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(false)
      vi.mocked(api.createRoom).mockRejectedValue(new Error('Server error'))

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error')
        expect(result.current.isRetrying).toBe(false)
      })
    })

    it('handles missing room ID gracefully', async () => {
      // Clear room from store
      useRoomStore.setState({ currentRoom: null })

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('No room ID found')
        expect(result.current.isRetrying).toBe(false)
      })

      // Validation should not be called
      expect(api.validateRoomExists).not.toHaveBeenCalled()
    })
  })

  describe('Multiple retry attempts', () => {
    it('allows multiple retry attempts', async () => {
      vi.mocked(api.validateRoomExists).mockResolvedValue(true)

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      // First retry
      await result.current.retry()

      await waitFor(() => {
        expect(api.validateRoomExists).toHaveBeenCalledTimes(1)
      })

      // Second retry
      await result.current.retry()

      await waitFor(() => {
        expect(api.validateRoomExists).toHaveBeenCalledTimes(2)
      })
    })

    it('handles alternating room states correctly', async () => {
      // First retry: room exists
      vi.mocked(api.validateRoomExists).mockResolvedValueOnce(true)

      const { result } = renderHook(() =>
        useLiveKit({
          token: 'test-token',
          livekitUrl: 'wss://test-livekit.example.com',
        })
      )

      await result.current.retry()

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Rejoining room...')
      })

      vi.clearAllMocks()

      // Second retry: room closed
      vi.mocked(api.validateRoomExists).mockResolvedValueOnce(false)
      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-456',
        token: 'new-token',
        screenShareToken: 'new-screen-share-token',
        livekitUrl: 'wss://test-livekit.example.com',
      })

      await result.current.retry()

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Room closed. Creating new room...')
      })
    })
  })
})
