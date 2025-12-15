import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateToken, generateScreenShareToken, getLiveKitConfig, getLiveKitUrl } from './livekit'
import { TOKEN_EXPIRY_SECONDS } from '@nameless/shared'

// We need to test the actual token generation to verify structure
// Token is a JWT that can be decoded to verify claims

describe('livekit service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset env vars before each test
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.LIVEKIT_API_KEY = 'test-api-key'
    process.env.LIVEKIT_API_SECRET = 'test-api-secret-that-is-at-least-32-chars'
    process.env.LIVEKIT_URL = 'ws://test-livekit:7880'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getLiveKitConfig', () => {
    it('should return config from environment variables', () => {
      const config = getLiveKitConfig()

      expect(config.apiKey).toBe('test-api-key')
      expect(config.apiSecret).toBe('test-api-secret-that-is-at-least-32-chars')
      expect(config.url).toBe('ws://test-livekit:7880')
    })

    it('should throw error when LIVEKIT_API_KEY is not set', () => {
      delete process.env.LIVEKIT_API_KEY

      expect(() => getLiveKitConfig()).toThrow(
        'LIVEKIT_API_KEY environment variable is not set'
      )
    })

    it('should throw error when LIVEKIT_API_SECRET is not set', () => {
      delete process.env.LIVEKIT_API_SECRET

      expect(() => getLiveKitConfig()).toThrow(
        'LIVEKIT_API_SECRET environment variable is not set'
      )
    })

    it('should use default URL when LIVEKIT_URL is not set', () => {
      delete process.env.LIVEKIT_URL

      const config = getLiveKitConfig()

      expect(config.url).toBe('ws://localhost:7880')
    })
  })

  describe('getLiveKitUrl', () => {
    it('should return URL from environment', () => {
      const url = getLiveKitUrl()
      expect(url).toBe('ws://test-livekit:7880')
    })

    it('should return default when not set', () => {
      delete process.env.LIVEKIT_URL

      const url = getLiveKitUrl()
      expect(url).toBe('ws://localhost:7880')
    })
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await generateToken(
        'abc-def-ghj',
        'participant-uuid-123',
        'BMad',
        'host',
        '#f97316'
      )

      // Token should be a non-empty string
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)

      // JWT format: header.payload.signature
      const parts = token.split('.')
      expect(parts.length).toBe(3)
    })

    it('should include correct identity in token', async () => {
      const participantId = 'participant-uuid-123'

      const token = await generateToken(
        'abc-def-ghj',
        participantId,
        'BMad',
        'host',
        '#f97316'
      )

      // Decode JWT payload (base64)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      expect(payload.sub).toBe(participantId)
    })

    it('should include name in token', async () => {
      const name = 'BMad'

      const token = await generateToken(
        'abc-def-ghj',
        'participant-uuid-123',
        name,
        'host',
        '#f97316'
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      expect(payload.name).toBe(name)
    })

    it('should include metadata with role and color', async () => {
      const role = 'host'
      const color = '#f97316'

      const token = await generateToken(
        'abc-def-ghj',
        'participant-uuid-123',
        'BMad',
        role,
        color
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      const metadata = JSON.parse(payload.metadata)
      expect(metadata.role).toBe(role)
      expect(metadata.color).toBe(color)
    })

    it('should include room grants', async () => {
      const roomId = 'abc-def-ghj'

      const token = await generateToken(
        roomId,
        'participant-uuid-123',
        'BMad',
        'host',
        '#f97316'
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      expect(payload.video).toBeDefined()
      expect(payload.video.room).toBe(roomId)
      expect(payload.video.roomJoin).toBe(true)
      expect(payload.video.canPublish).toBe(true)
      expect(payload.video.canSubscribe).toBe(true)
      expect(payload.video.canPublishData).toBe(true)
    })

    it('should set expiry to TOKEN_EXPIRY_SECONDS from now', async () => {
      const beforeTime = Math.floor(Date.now() / 1000)

      const token = await generateToken(
        'abc-def-ghj',
        'participant-uuid-123',
        'BMad',
        'host',
        '#f97316'
      )

      const afterTime = Math.floor(Date.now() / 1000)

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      // exp should be approximately now + TOKEN_EXPIRY_SECONDS
      const expectedExpMin = beforeTime + TOKEN_EXPIRY_SECONDS
      const expectedExpMax = afterTime + TOKEN_EXPIRY_SECONDS

      expect(payload.exp).toBeGreaterThanOrEqual(expectedExpMin)
      expect(payload.exp).toBeLessThanOrEqual(expectedExpMax)
    })

    it('should work for different roles', async () => {
      const roles = ['host', 'sharer', 'annotator', 'viewer'] as const

      for (const role of roles) {
        const token = await generateToken(
          'abc-def-ghj',
          `participant-${role}`,
          `Test ${role}`,
          role,
          '#f97316'
        )

        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        )
        const metadata = JSON.parse(payload.metadata)

        expect(metadata.role).toBe(role)
      }
    })
  })

  describe('generateScreenShareToken', () => {
    it('should generate a valid JWT token for screen share', async () => {
      const token = await generateScreenShareToken(
        'abc-def-ghj',
        'participant-uuid-123',
        'BMad'
      )

      // Token should be a non-empty string
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)

      // JWT format: header.payload.signature
      const parts = token.split('.')
      expect(parts.length).toBe(3)
    })

    it('should use separate identity for screen share (AC-3.11.3)', async () => {
      const participantId = 'participant-uuid-123'

      const token = await generateScreenShareToken(
        'abc-def-ghj',
        participantId,
        'BMad'
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      // Identity should be suffixed with -screenshare
      expect(payload.sub).toBe(`${participantId}-screenshare`)
    })

    it('should include name with (Screen) suffix', async () => {
      const name = 'BMad'

      const token = await generateScreenShareToken(
        'abc-def-ghj',
        'participant-uuid-123',
        name
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      expect(payload.name).toBe(`${name} (Screen)`)
    })

    it('should include isScreenShare: true in metadata (AC-3.11.3)', async () => {
      const token = await generateScreenShareToken(
        'abc-def-ghj',
        'participant-uuid-123',
        'BMad'
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      const metadata = JSON.parse(payload.metadata)
      expect(metadata.isScreenShare).toBe(true)
    })

    it('should include parentId pointing to main participant (AC-3.11.3)', async () => {
      const participantId = 'participant-uuid-123'

      const token = await generateScreenShareToken(
        'abc-def-ghj',
        participantId,
        'BMad'
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      const metadata = JSON.parse(payload.metadata)
      expect(metadata.parentId).toBe(participantId)
    })

    it('should have role "screenshare" in metadata', async () => {
      const token = await generateScreenShareToken(
        'abc-def-ghj',
        'participant-uuid-123',
        'BMad'
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      const metadata = JSON.parse(payload.metadata)
      expect(metadata.role).toBe('screenshare')
    })

    it('should have restricted room grants (publish only, no subscribe)', async () => {
      const roomId = 'abc-def-ghj'

      const token = await generateScreenShareToken(
        roomId,
        'participant-uuid-123',
        'BMad'
      )

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )

      expect(payload.video).toBeDefined()
      expect(payload.video.room).toBe(roomId)
      expect(payload.video.roomJoin).toBe(true)
      expect(payload.video.canPublish).toBe(true)
      expect(payload.video.canSubscribe).toBe(false) // Screen share doesn't need to subscribe
      expect(payload.video.canPublishData).toBe(false)
    })
  })
})
