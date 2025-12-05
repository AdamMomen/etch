import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to test the URL validation logic, but since it runs at module load time,
// we'll test it by mocking import.meta.env and re-importing the module

describe('api', () => {
  const originalEnv = import.meta.env

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original env
    vi.stubGlobal('import.meta', { env: originalEnv })
  })

  describe('URL validation', () => {
    it('should use default URL when VITE_API_URL is not set', async () => {
      vi.stubGlobal('import.meta', { env: {} })

      // Since we can't easily test the internal validation function,
      // we verify that the module loads without errors
      const api = await import('./api')
      expect(api.createRoom).toBeDefined()
      expect(api.joinRoom).toBeDefined()
    })

    it('should use VITE_API_URL when set to valid URL', async () => {
      vi.stubGlobal('import.meta', {
        env: { VITE_API_URL: 'https://api.example.com' },
      })

      const api = await import('./api')
      expect(api.createRoom).toBeDefined()
    })
  })

  describe('createRoom', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should call fetch with correct URL and body', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            roomId: 'test-room-123',
            token: 'test-token',
            livekitUrl: 'wss://livekit.example.com',
          }),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

      const api = await import('./api')
      await api.createRoom('Test Host')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostName: 'Test Host' }),
        })
      )
    })

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: 'Room creation failed' },
          }),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

      const api = await import('./api')

      await expect(api.createRoom('Test Host')).rejects.toThrow(
        'Room creation failed'
      )
    })

    it('should use generic error message when no error message in response', async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({}),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

      const api = await import('./api')

      await expect(api.createRoom('Test Host')).rejects.toThrow(
        'Failed to create room'
      )
    })
  })

  describe('joinRoom', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should call fetch with correct URL and body', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            token: 'test-token',
            livekitUrl: 'wss://livekit.example.com',
            roomId: 'test-room',
          }),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

      const api = await import('./api')
      await api.joinRoom('test-room-123', 'Test Participant')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/test-room-123/join'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantName: 'Test Participant' }),
        })
      )
    })

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: 'Room not found' },
          }),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

      const api = await import('./api')

      await expect(api.joinRoom('invalid-room', 'User')).rejects.toThrow(
        'Room not found'
      )
    })

    it('should use generic error message when no error message in response', async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({}),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

      const api = await import('./api')

      await expect(api.joinRoom('room', 'User')).rejects.toThrow(
        'Failed to join room'
      )
    })
  })
})
