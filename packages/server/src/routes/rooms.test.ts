import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { app } from '../index'
import { clearRooms, getRoom } from '../services/roomStore'
import { PARTICIPANT_COLORS } from '@nameless/shared'

describe('POST /api/rooms', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Clear rooms and set up test environment
    clearRooms()
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.LIVEKIT_API_KEY = 'test-api-key'
    process.env.LIVEKIT_API_SECRET = 'test-api-secret-that-is-at-least-32-chars'
    process.env.LIVEKIT_URL = 'ws://test-livekit:7880'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('successful room creation', () => {
    it('should return 201 with roomId, token, and livekitUrl', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'BMad' }),
      })

      expect(response.status).toBe(201)

      const body = await response.json()
      expect(body.roomId).toBeDefined()
      expect(body.token).toBeDefined()
      expect(body.livekitUrl).toBe('ws://test-livekit:7880')
    })

    it('should generate room ID in xxx-xxx-xxx format', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'BMad' }),
      })

      const body = await response.json()
      expect(body.roomId).toMatch(/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/)
    })

    it('should store room in memory', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'BMad' }),
      })

      const body = await response.json()
      const room = getRoom(body.roomId)

      expect(room).toBeDefined()
      expect(room?.id).toBe(body.roomId)
      expect(room?.participants.size).toBe(1)
    })

    it('should create host participant with correct properties', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'BMad' }),
      })

      const body = await response.json()
      const room = getRoom(body.roomId)

      // Get the host participant
      const participants = Array.from(room!.participants.values())
      expect(participants.length).toBe(1)

      const host = participants[0]
      expect(host.name).toBe('BMad')
      expect(host.role).toBe('host')
      expect(host.color).toBe(PARTICIPANT_COLORS[0]) // Orange
    })

    it('should generate valid JWT token', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'BMad' }),
      })

      const body = await response.json()

      // Token should be a valid JWT (3 parts separated by dots)
      const tokenParts = body.token.split('.')
      expect(tokenParts.length).toBe(3)

      // Decode and verify payload
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      expect(payload.name).toBe('BMad')
      expect(payload.metadata).toBeDefined()

      const metadata = JSON.parse(payload.metadata)
      expect(metadata.role).toBe('host')
      expect(metadata.color).toBe(PARTICIPANT_COLORS[0])
    })

    it('should include room grants in token', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'BMad' }),
      })

      const body = await response.json()
      const payload = JSON.parse(
        Buffer.from(body.token.split('.')[1], 'base64').toString()
      )

      expect(payload.video).toBeDefined()
      expect(payload.video.room).toBe(body.roomId)
      expect(payload.video.roomJoin).toBe(true)
      expect(payload.video.canPublish).toBe(true)
      expect(payload.video.canSubscribe).toBe(true)
      expect(payload.video.canPublishData).toBe(true)
    })

    it('should accept hostName at max length (50 chars)', async () => {
      const hostName = 'a'.repeat(50)

      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName }),
      })

      expect(response.status).toBe(201)
    })
  })

  describe('validation errors', () => {
    it('should return 400 when hostName is missing', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toContain('hostName')
    })

    it('should return 400 when hostName is empty string', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: '' }),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('hostName is required')
    })

    it('should return 400 when hostName exceeds 50 characters', async () => {
      const hostName = 'a'.repeat(51)

      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName }),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toContain('50 characters')
    })

    it('should return 400 when body is not valid JSON', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })

      expect(response.status).toBe(400)
    })

    it('should return 400 when hostName is not a string', async () => {
      const response = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 123 }),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('room uniqueness', () => {
    it('should generate unique room IDs for multiple requests', async () => {
      const roomIds = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const response = await app.request('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostName: `Host ${i}` }),
        })

        const body = await response.json()
        roomIds.add(body.roomId)
      }

      expect(roomIds.size).toBe(10)
    })
  })
})

describe('POST /api/rooms/:roomId/join', () => {
  const originalEnv = process.env

  beforeEach(() => {
    clearRooms()
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.LIVEKIT_API_KEY = 'test-api-key'
    process.env.LIVEKIT_API_SECRET = 'test-api-secret-that-is-at-least-32-chars'
    process.env.LIVEKIT_URL = 'ws://test-livekit:7880'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Helper to create a room and return roomId
  async function createTestRoom(hostName = 'Host'): Promise<string> {
    const response = await app.request('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName }),
    })
    const body = await response.json()
    return body.roomId
  }

  describe('successful room join', () => {
    it('should return 200 with token and livekitUrl', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Alice' }),
      })

      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.token).toBeDefined()
      expect(body.livekitUrl).toBe('ws://test-livekit:7880')
    })

    it('should generate valid JWT token with correct claims', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Alice' }),
      })

      const body = await response.json()

      // Token should be a valid JWT (3 parts separated by dots)
      const tokenParts = body.token.split('.')
      expect(tokenParts.length).toBe(3)

      // Decode and verify payload
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      expect(payload.name).toBe('Alice')
      expect(payload.sub).toBeDefined() // identity (UUID)
      expect(payload.metadata).toBeDefined()

      const metadata = JSON.parse(payload.metadata)
      expect(metadata.role).toBe('annotator')
      expect(metadata.color).toBe(PARTICIPANT_COLORS[1]) // Second color (host has first)
    })

    it('should include room grants in token', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Alice' }),
      })

      const body = await response.json()
      const payload = JSON.parse(
        Buffer.from(body.token.split('.')[1], 'base64').toString()
      )

      expect(payload.video).toBeDefined()
      expect(payload.video.room).toBe(roomId)
      expect(payload.video.roomJoin).toBe(true)
      expect(payload.video.canPublish).toBe(true)
      expect(payload.video.canSubscribe).toBe(true)
      expect(payload.video.canPublishData).toBe(true)
    })

    it('should add participant to room store', async () => {
      const roomId = await createTestRoom()

      await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Alice' }),
      })

      const room = getRoom(roomId)
      expect(room?.participants.size).toBe(2) // Host + Alice

      const participants = Array.from(room!.participants.values())
      const alice = participants.find((p) => p.name === 'Alice')

      expect(alice).toBeDefined()
      expect(alice?.role).toBe('annotator')
      expect(alice?.color).toBe(PARTICIPANT_COLORS[1])
      expect(alice?.joinedAt).toBeGreaterThan(0)
    })

    it('should accept viewer role override', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Viewer', role: 'viewer' }),
      })

      expect(response.status).toBe(200)

      const body = await response.json()
      const payload = JSON.parse(
        Buffer.from(body.token.split('.')[1], 'base64').toString()
      )
      const metadata = JSON.parse(payload.metadata)
      expect(metadata.role).toBe('viewer')
    })

    it('should accept participantName at max length (50 chars)', async () => {
      const roomId = await createTestRoom()
      const participantName = 'a'.repeat(50)

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName }),
      })

      expect(response.status).toBe(200)
    })
  })

  describe('color assignment cycling', () => {
    it('should assign colors in order to participants', async () => {
      const roomId = await createTestRoom()

      // Join multiple participants
      for (let i = 0; i < 4; i++) {
        await app.request(`/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantName: `Participant ${i}` }),
        })
      }

      const room = getRoom(roomId)
      const participants = Array.from(room!.participants.values())

      // Host (index 0) + 4 participants (indices 1-4)
      expect(participants.length).toBe(5)

      // Check colors are assigned in order
      participants.forEach((p, index) => {
        expect(p.color).toBe(PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length])
      })
    })

    it('should cycle back to first color after exhausting palette', async () => {
      const roomId = await createTestRoom()

      // Add enough participants to cycle colors
      for (let i = 0; i < PARTICIPANT_COLORS.length; i++) {
        await app.request(`/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantName: `Participant ${i}` }),
        })
      }

      const room = getRoom(roomId)
      const participants = Array.from(room!.participants.values())

      // Last participant should have cycled color
      const lastParticipant = participants[participants.length - 1]
      const expectedColorIndex =
        (PARTICIPANT_COLORS.length) % PARTICIPANT_COLORS.length
      expect(lastParticipant.color).toBe(PARTICIPANT_COLORS[expectedColorIndex])
    })
  })

  describe('room not found', () => {
    it('should return 404 for non-existent room', async () => {
      const response = await app.request('/api/rooms/non-existent-room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Alice' }),
      })

      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error.code).toBe('ROOM_NOT_FOUND')
      expect(body.error.message).toBe(
        'The requested room does not exist or has ended'
      )
    })
  })

  describe('validation errors', () => {
    it('should return 400 when participantName is missing', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toContain('participantName')
    })

    it('should return 400 when participantName is empty string', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: '' }),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('participantName is required')
    })

    it('should return 400 when participantName exceeds 50 characters', async () => {
      const roomId = await createTestRoom()
      const participantName = 'a'.repeat(51)

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName }),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toContain('50 characters')
    })

    it('should return 400 when body is not valid JSON', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })

      expect(response.status).toBe(400)
    })

    it('should return 400 when participantName is not a string', async () => {
      const roomId = await createTestRoom()

      const response = await app.request(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 123 }),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
