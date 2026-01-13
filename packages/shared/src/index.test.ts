import { describe, it, expect } from 'vitest'
import {
  PARTICIPANT_COLORS,
  MAX_STROKE_POINTS,
  MAX_PARTICIPANTS,
  TOKEN_EXPIRY_SECONDS,
} from './index'

// Type imports to verify they compile correctly
import type {
  Point,
  Stroke,
  Role,
  Participant,
  RoomState,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ApiError,
  HealthResponse,
  ParticipantColor,
} from './index'

describe('@etch/shared exports', () => {
  describe('constants', () => {
    it('should export PARTICIPANT_COLORS', () => {
      expect(PARTICIPANT_COLORS).toBeDefined()
      expect(Array.isArray(PARTICIPANT_COLORS)).toBe(true)
    })

    it('should export MAX_STROKE_POINTS', () => {
      expect(MAX_STROKE_POINTS).toBeDefined()
      expect(typeof MAX_STROKE_POINTS).toBe('number')
    })

    it('should export MAX_PARTICIPANTS', () => {
      expect(MAX_PARTICIPANTS).toBeDefined()
      expect(typeof MAX_PARTICIPANTS).toBe('number')
    })

    it('should export TOKEN_EXPIRY_SECONDS', () => {
      expect(TOKEN_EXPIRY_SECONDS).toBeDefined()
      expect(typeof TOKEN_EXPIRY_SECONDS).toBe('number')
    })
  })

  describe('types compile correctly', () => {
    it('should allow creating valid Point objects', () => {
      const point: Point = { x: 0.5, y: 0.5 }
      expect(point.x).toBe(0.5)
      expect(point.y).toBe(0.5)
    })

    it('should allow creating Point with pressure', () => {
      const point: Point = { x: 0.5, y: 0.5, pressure: 0.8 }
      expect(point.pressure).toBe(0.8)
    })

    it('should allow creating valid Stroke objects', () => {
      const stroke: Stroke = {
        id: 'stroke-1',
        participantId: 'user-1',
        tool: 'pen',
        color: '#f97316',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        createdAt: Date.now(),
        isComplete: false,
      }
      expect(stroke.id).toBe('stroke-1')
      expect(stroke.tool).toBe('pen')
    })

    it('should allow valid Role values', () => {
      const roles: Role[] = ['host', 'sharer', 'annotator', 'viewer']
      expect(roles).toHaveLength(4)
    })

    it('should allow creating valid Participant objects', () => {
      const participant: Participant = {
        id: 'user-1',
        name: 'Test User',
        role: 'annotator',
        color: '#f97316',
        isLocal: true,
      }
      expect(participant.name).toBe('Test User')
    })

    it('should allow creating valid RoomState objects', () => {
      const roomState: RoomState = {
        id: 'room-1',
        participants: [],
        isScreenSharing: false,
        sharerId: null,
        annotationsEnabled: true,
      }
      expect(roomState.annotationsEnabled).toBe(true)
    })

    it('should allow creating valid API request/response objects', () => {
      const createReq: CreateRoomRequest = { hostName: 'Host' }
      const createRes: CreateRoomResponse = {
        roomId: 'room-1',
        token: 'jwt-token',
        screenShareToken: 'screenshare-jwt-token',
        livekitUrl: 'wss://livekit.example.com',
      }
      const joinReq: JoinRoomRequest = {
        participantName: 'User',
        role: 'annotator',
      }
      const joinRes: JoinRoomResponse = {
        token: 'jwt-token',
        screenShareToken: 'screenshare-jwt-token',
        livekitUrl: 'wss://livekit.example.com',
      }

      expect(createReq.hostName).toBe('Host')
      expect(createRes.roomId).toBe('room-1')
      expect(joinReq.role).toBe('annotator')
      expect(joinRes.token).toBe('jwt-token')
    })

    it('should allow creating valid ApiError objects', () => {
      const error: ApiError = {
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'The room does not exist',
        },
      }
      expect(error.error.code).toBe('ROOM_NOT_FOUND')
    })

    it('should allow creating valid HealthResponse objects', () => {
      const health: HealthResponse = {
        status: 'ok',
        timestamp: Date.now(),
      }
      expect(health.status).toBe('ok')
    })

    it('should type ParticipantColor correctly', () => {
      const color: ParticipantColor = '#f97316'
      expect(PARTICIPANT_COLORS).toContain(color)
    })
  })
})
