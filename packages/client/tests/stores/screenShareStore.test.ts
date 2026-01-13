import { describe, it, expect, beforeEach } from 'vitest'
import { useScreenShareStore } from '@/stores/screenShareStore'

describe('screenShareStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useScreenShareStore.setState({
      isSharing: false,
      sharerId: null,
      sharerName: null,
      isLocalSharing: false,
      sharedSource: null,
      sharedSourceId: null,
    })
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.sharerId).toBeNull()
      expect(state.sharerName).toBeNull()
      expect(state.isLocalSharing).toBe(false)
      expect(state.sharedSource).toBeNull()
      expect(state.sharedSourceId).toBeNull()
    })
  })

  describe('startSharing', () => {
    it('should set local sharing state for screen share', () => {
      const { startSharing } = useScreenShareStore.getState()

      startSharing('screen', 'screen-123')

      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(true)
      expect(state.isLocalSharing).toBe(true)
      expect(state.sharedSource).toBe('screen')
      expect(state.sharedSourceId).toBe('screen-123')
    })

    it('should set local sharing state for window share', () => {
      const { startSharing } = useScreenShareStore.getState()

      startSharing('window', 'window-456')

      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(true)
      expect(state.isLocalSharing).toBe(true)
      expect(state.sharedSource).toBe('window')
      expect(state.sharedSourceId).toBe('window-456')
    })
  })

  describe('stopSharing', () => {
    it('should reset all state to initial values', () => {
      // First, start sharing
      const { startSharing, stopSharing } = useScreenShareStore.getState()
      startSharing('screen', 'screen-123')

      // Verify sharing is active
      expect(useScreenShareStore.getState().isSharing).toBe(true)

      // Stop sharing
      stopSharing()

      // Verify all state is reset
      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.sharerId).toBeNull()
      expect(state.sharerName).toBeNull()
      expect(state.isLocalSharing).toBe(false)
      expect(state.sharedSource).toBeNull()
      expect(state.sharedSourceId).toBeNull()
    })

    it('should reset state after remote sharer stops', () => {
      const { setRemoteSharer, stopSharing } = useScreenShareStore.getState()

      // Set remote sharer
      setRemoteSharer('user-123', 'John Doe')
      expect(useScreenShareStore.getState().isSharing).toBe(true)

      // Stop sharing
      stopSharing()

      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.sharerId).toBeNull()
      expect(state.sharerName).toBeNull()
    })
  })

  describe('setRemoteSharer', () => {
    it('should set remote sharer with id and name', () => {
      const { setRemoteSharer } = useScreenShareStore.getState()

      setRemoteSharer('user-123', 'John Doe')

      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(true)
      expect(state.sharerId).toBe('user-123')
      expect(state.sharerName).toBe('John Doe')
      expect(state.isLocalSharing).toBe(false)
    })

    it('should clear remote sharer when passed null', () => {
      const { setRemoteSharer } = useScreenShareStore.getState()

      // First set a remote sharer
      setRemoteSharer('user-123', 'John Doe')
      expect(useScreenShareStore.getState().isSharing).toBe(true)

      // Clear remote sharer
      setRemoteSharer(null, null)

      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(false)
      expect(state.sharerId).toBeNull()
      expect(state.sharerName).toBeNull()
      expect(state.isLocalSharing).toBe(false)
    })

    it('should not set isLocalSharing when setting remote sharer', () => {
      const { setRemoteSharer } = useScreenShareStore.getState()

      setRemoteSharer('user-123', 'John Doe')

      const state = useScreenShareStore.getState()
      expect(state.isLocalSharing).toBe(false)
    })
  })

  describe('state transitions', () => {
    it('should handle transition from local sharing to stopped', () => {
      const { startSharing, stopSharing } = useScreenShareStore.getState()

      startSharing('screen', 'screen-123')
      expect(useScreenShareStore.getState().isLocalSharing).toBe(true)

      stopSharing()
      expect(useScreenShareStore.getState().isLocalSharing).toBe(false)
      expect(useScreenShareStore.getState().isSharing).toBe(false)
    })

    it('should handle transition from remote sharer to local sharer', () => {
      const { setRemoteSharer, startSharing } = useScreenShareStore.getState()

      // Remote user starts sharing
      setRemoteSharer('user-123', 'John Doe')
      expect(useScreenShareStore.getState().isLocalSharing).toBe(false)

      // Local user takes over (this would only happen after remote stops in real app)
      startSharing('window', 'window-456')

      const state = useScreenShareStore.getState()
      expect(state.isSharing).toBe(true)
      expect(state.isLocalSharing).toBe(true)
      expect(state.sharedSource).toBe('window')
    })
  })
})
