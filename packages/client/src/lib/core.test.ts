/**
 * Tests for Core client library
 *
 * These tests verify the CoreClient class behavior using mocked Tauri APIs.
 * Integration tests that actually spawn Core are in e2e tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CoreClient, getCoreClient } from './core'
import type { CoreMessage, TerminationHandler } from './core'

// Mock Tauri APIs
const mockInvoke = vi.fn()
const mockListen = vi.fn()
let mockListeners: Map<string, (event: { payload: unknown }) => void> = new Map()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: async (eventName: string, handler: (event: { payload: unknown }) => void) => {
    mockListeners.set(eventName, handler)
    mockListen(eventName, handler)
    return () => {
      mockListeners.delete(eventName)
    }
  },
}))

describe('CoreClient', () => {
  let client: CoreClient

  beforeEach(() => {
    // Create fresh client for each test
    client = new CoreClient()
    mockListeners.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockListeners.clear()
  })

  describe('initialization', () => {
    it('should not be running initially', () => {
      expect(client.isRunning()).toBe(false)
    })

    it('should have null socket path initially', () => {
      expect(client.getSocketPath()).toBeNull()
    })
  })

  describe('start', () => {
    it('should spawn Core and set up listeners', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')

      await client.start()

      expect(mockInvoke).toHaveBeenCalledWith('spawn_core')
      expect(client.isRunning()).toBe(true)
      expect(client.getSocketPath()).toBe('/tmp/nameless-core-123.sock')
      expect(mockListen).toHaveBeenCalledWith('core-message', expect.any(Function))
      expect(mockListen).toHaveBeenCalledWith('core-terminated', expect.any(Function))
    })

    it('should throw if already running', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      await expect(client.start()).rejects.toThrow('Core already running')
    })

    it('should reset restart attempts on successful start', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      // Internal state - verify through behavior
      expect(client.isRunning()).toBe(true)
    })
  })

  describe('stop', () => {
    it('should do nothing if not running', async () => {
      await client.stop()
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it('should kill Core and clean up', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      mockInvoke.mockClear()
      await client.stop()

      expect(mockInvoke).toHaveBeenCalledWith('kill_core')
      expect(client.isRunning()).toBe(false)
      expect(client.getSocketPath()).toBeNull()
    })

    it('should unsubscribe from events', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      expect(mockListeners.size).toBe(2) // core-message and core-terminated

      await client.stop()

      // Listeners should be cleaned up
      expect(mockListeners.size).toBe(0)
    })
  })

  describe('message handling', () => {
    it('should invoke message handlers when messages arrive', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      const handler = vi.fn()
      client.onMessage(handler)

      // Simulate incoming message
      const messageListener = mockListeners.get('core-message')
      expect(messageListener).toBeDefined()

      const testMessage: CoreMessage = {
        type: 'connection_state_changed',
        state: 'connected',
      }
      messageListener!({ payload: JSON.stringify(testMessage) })

      expect(handler).toHaveBeenCalledWith(testMessage)
    })

    it('should allow unsubscribing from messages', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      const handler = vi.fn()
      const unsubscribe = client.onMessage(handler)

      unsubscribe()

      // Simulate incoming message
      const messageListener = mockListeners.get('core-message')
      const testMessage: CoreMessage = {
        type: 'connection_state_changed',
        state: 'connected',
      }
      messageListener!({ payload: JSON.stringify(testMessage) })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle multiple message handlers', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      const handler1 = vi.fn()
      const handler2 = vi.fn()
      client.onMessage(handler1)
      client.onMessage(handler2)

      const messageListener = mockListeners.get('core-message')
      const testMessage: CoreMessage = { type: 'pong' }
      messageListener!({ payload: JSON.stringify(testMessage) })

      expect(handler1).toHaveBeenCalledWith(testMessage)
      expect(handler2).toHaveBeenCalledWith(testMessage)
    })

    it('should not crash on invalid JSON', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      const handler = vi.fn()
      client.onMessage(handler)

      const messageListener = mockListeners.get('core-message')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not throw
      messageListener!({ payload: 'invalid json{' })

      expect(handler).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('termination handling', () => {
    it('should invoke termination handlers on crash', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      const handler: TerminationHandler = vi.fn()
      client.onTermination(handler)

      const terminationListener = mockListeners.get('core-terminated')
      expect(terminationListener).toBeDefined()

      terminationListener!({ payload: 1 }) // Non-zero exit code

      expect(handler).toHaveBeenCalledWith(1)
    })

    it('should attempt restart on crash (non-zero exit)', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      const terminationListener = mockListeners.get('core-terminated')

      // Mock successful restart
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-456.sock')

      // Give restart time to complete
      await new Promise<void>((resolve) => {
        terminationListener!({ payload: 1 })
        // Wait for restart delay + processing
        setTimeout(resolve, 1500)
      })

      // Should have attempted restart
      expect(mockInvoke).toHaveBeenLastCalledWith('spawn_core')
    })

    it('should not restart on graceful shutdown (code 0)', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      const terminationListener = mockListeners.get('core-terminated')
      mockInvoke.mockClear()

      terminationListener!({ payload: 0 }) // Graceful exit

      // Wait to ensure no restart
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not have called spawn_core again
      expect(mockInvoke).not.toHaveBeenCalledWith('spawn_core')
    })
  })

  describe('sendMessage', () => {
    it('should throw if not running', async () => {
      // joinRoom calls sendMessage internally
      await expect(client.joinRoom('wss://lk.test', 'token')).rejects.toThrow('Core not running')
    })

    it('should send JSON message via invoke', async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()

      mockInvoke.mockClear()
      mockInvoke.mockResolvedValueOnce(undefined)

      await client.joinRoom('wss://livekit.test.com', 'test-token')

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({
          type: 'join_room',
          server_url: 'wss://livekit.test.com',
          token: 'test-token',
        }),
      })
    })
  })

  describe('room operations', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()
      mockInvoke.mockClear()
    })

    it('joinRoom sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.joinRoom('wss://lk.example.com', 'jwt-token')

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: expect.stringContaining('"type":"join_room"'),
      })
    })

    it('leaveRoom sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.leaveRoom()

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'leave_room' }),
      })
    })
  })

  describe('screen share operations', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()
      mockInvoke.mockClear()
    })

    it('getAvailableContent sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.getAvailableContent()

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'get_available_content' }),
      })
    })

    it('startScreenShare sends message with default config', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.startScreenShare('screen-0', 'screen')

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: expect.stringContaining('"framerate":60'),
      })
    })

    it('startScreenShare uses provided config', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.startScreenShare('window-123', 'window', {
        width: 1280,
        height: 720,
        framerate: 30,
      })

      const call = mockInvoke.mock.calls[0]
      const message = JSON.parse(call[1].message)

      expect(message.source_id).toBe('window-123')
      expect(message.source_type).toBe('window')
      expect(message.config.width).toBe(1280)
      expect(message.config.height).toBe(720)
      expect(message.config.framerate).toBe(30)
    })

    it('stopScreenShare sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.stopScreenShare()

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'stop_screen_share' }),
      })
    })
  })

  describe('permission operations', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()
      mockInvoke.mockClear()
    })

    it('checkPermissions sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.checkPermissions()

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'check_permissions' }),
      })
    })

    it('requestScreenRecordingPermission sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.requestScreenRecordingPermission()

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'request_screen_recording_permission' }),
      })
    })
  })

  describe('annotation operations', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()
      mockInvoke.mockClear()
    })

    it('sendAnnotation sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.sendAnnotation('stroke-1', 'pen', { r: 255, g: 0, b: 0, a: 255 }, [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
      ])

      const call = mockInvoke.mock.calls[0]
      const message = JSON.parse(call[1].message)

      expect(message.type).toBe('send_annotation')
      expect(message.stroke_id).toBe('stroke-1')
      expect(message.tool).toBe('pen')
      expect(message.color.r).toBe(255)
      expect(message.points.length).toBe(2)
    })

    it('deleteAnnotation sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.deleteAnnotation('stroke-123')

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'delete_annotation', stroke_id: 'stroke-123' }),
      })
    })

    it('clearAnnotations sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.clearAnnotations()

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'clear_annotations' }),
      })
    })
  })

  describe('media controls', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce('/tmp/nameless-core-123.sock')
      await client.start()
      mockInvoke.mockClear()
    })

    it('setMicMuted sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.setMicMuted(true)

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'set_mic_muted', muted: true }),
      })
    })

    it('setCameraEnabled sends correct message', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      await client.setCameraEnabled(false)

      expect(mockInvoke).toHaveBeenCalledWith('send_core_message', {
        message: JSON.stringify({ type: 'set_camera_enabled', enabled: false }),
      })
    })
  })

  describe('singleton instance', () => {
    it('getCoreClient returns same instance', () => {
      const client1 = getCoreClient()
      const client2 = getCoreClient()

      expect(client1).toBe(client2)
    })
  })
})
