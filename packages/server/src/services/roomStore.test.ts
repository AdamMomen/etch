import { describe, it, expect, beforeEach } from 'vitest'
import {
  createRoom,
  getRoom,
  deleteRoom,
  addParticipant,
  removeParticipant,
  getParticipantCount,
  clearRooms,
  getRoomCount,
} from './roomStore'
import { PARTICIPANT_COLORS } from '@nameless/shared'

describe('roomStore', () => {
  beforeEach(() => {
    // Clear all rooms before each test
    clearRooms()
  })

  describe('createRoom', () => {
    it('should create a room with the correct fields', () => {
      const hostId = 'host-123'
      const hostName = 'BMad'

      const room = createRoom(hostId, hostName)

      expect(room.id).toMatch(/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/)
      expect(room.hostId).toBe(hostId)
      expect(room.createdAt).toBeGreaterThan(0)
      expect(room.participants).toBeInstanceOf(Map)
      expect(room.participants.size).toBe(1)
    })

    it('should create room with provided room ID', () => {
      const roomId = 'abc-def-ghj'
      const room = createRoom('host-id', 'Host', roomId)

      expect(room.id).toBe(roomId)
    })

    it('should add host as first participant with correct properties', () => {
      const hostId = 'host-123'
      const hostName = 'BMad'

      const room = createRoom(hostId, hostName)
      const hostParticipant = room.participants.get(hostId)

      expect(hostParticipant).toBeDefined()
      expect(hostParticipant?.id).toBe(hostId)
      expect(hostParticipant?.name).toBe(hostName)
      expect(hostParticipant?.role).toBe('host')
      expect(hostParticipant?.color).toBe(PARTICIPANT_COLORS[0]) // Orange
      expect(hostParticipant?.joinedAt).toBeGreaterThan(0)
    })

    it('should store room in memory', () => {
      const room = createRoom('host-id', 'Host')

      const retrieved = getRoom(room.id)
      expect(retrieved).toBe(room)
    })
  })

  describe('getRoom', () => {
    it('should return room when it exists', () => {
      const room = createRoom('host-id', 'Host')

      const retrieved = getRoom(room.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(room.id)
    })

    it('should return undefined for non-existent room', () => {
      const retrieved = getRoom('non-existent-id')

      expect(retrieved).toBeUndefined()
    })
  })

  describe('deleteRoom', () => {
    it('should delete an existing room', () => {
      const room = createRoom('host-id', 'Host')

      const deleted = deleteRoom(room.id)

      expect(deleted).toBe(true)
      expect(getRoom(room.id)).toBeUndefined()
    })

    it('should return false for non-existent room', () => {
      const deleted = deleteRoom('non-existent-id')

      expect(deleted).toBe(false)
    })
  })

  describe('addParticipant', () => {
    it('should add participant to existing room', () => {
      const room = createRoom('host-id', 'Host')
      const participantId = 'participant-123'
      const participantName = 'Alice'

      const participant = addParticipant(room.id, participantId, participantName)

      expect(participant).toBeDefined()
      expect(participant?.id).toBe(participantId)
      expect(participant?.name).toBe(participantName)
      expect(participant?.role).toBe('annotator') // Default role
      expect(participant?.joinedAt).toBeGreaterThan(0)
    })

    it('should assign correct color to participant', () => {
      const room = createRoom('host-id', 'Host')

      // Host has color[0], second participant should get color[1]
      const participant = addParticipant(room.id, 'p1', 'Alice')

      expect(participant?.color).toBe(PARTICIPANT_COLORS[1])
    })

    it('should cycle colors when exceeding color palette', () => {
      const room = createRoom('host-id', 'Host')

      // Add participants until we cycle
      for (let i = 0; i < PARTICIPANT_COLORS.length; i++) {
        addParticipant(room.id, `p${i}`, `Participant ${i}`)
      }

      // Next participant should cycle back to first color
      const cycledParticipant = addParticipant(room.id, 'pX', 'Extra')

      // After PARTICIPANT_COLORS.length + 1 (host) participants, we're at index 0 again
      const expectedColorIndex =
        (PARTICIPANT_COLORS.length + 1) % PARTICIPANT_COLORS.length
      expect(cycledParticipant?.color).toBe(PARTICIPANT_COLORS[expectedColorIndex])
    })

    it('should return undefined for non-existent room', () => {
      const participant = addParticipant('non-existent', 'p1', 'Alice')

      expect(participant).toBeUndefined()
    })

    it('should accept custom role', () => {
      const room = createRoom('host-id', 'Host')

      const viewer = addParticipant(room.id, 'p1', 'Viewer', 'viewer')

      expect(viewer?.role).toBe('viewer')
    })
  })

  describe('removeParticipant', () => {
    it('should remove participant from room', () => {
      const room = createRoom('host-id', 'Host')
      addParticipant(room.id, 'p1', 'Alice')

      const removed = removeParticipant(room.id, 'p1')

      expect(removed).toBe(true)
      expect(room.participants.get('p1')).toBeUndefined()
    })

    it('should return false for non-existent participant', () => {
      const room = createRoom('host-id', 'Host')

      const removed = removeParticipant(room.id, 'non-existent')

      expect(removed).toBe(false)
    })

    it('should return false for non-existent room', () => {
      const removed = removeParticipant('non-existent', 'p1')

      expect(removed).toBe(false)
    })
  })

  describe('getParticipantCount', () => {
    it('should return correct count', () => {
      const room = createRoom('host-id', 'Host')
      addParticipant(room.id, 'p1', 'Alice')
      addParticipant(room.id, 'p2', 'Bob')

      expect(getParticipantCount(room.id)).toBe(3) // Host + 2 participants
    })

    it('should return 0 for non-existent room', () => {
      expect(getParticipantCount('non-existent')).toBe(0)
    })
  })

  describe('clearRooms', () => {
    it('should remove all rooms', () => {
      createRoom('host-1', 'Host 1')
      createRoom('host-2', 'Host 2')

      expect(getRoomCount()).toBe(2)

      clearRooms()

      expect(getRoomCount()).toBe(0)
    })
  })
})
