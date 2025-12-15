import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createRoom, getRoom, addParticipant } from '../services/roomStore'
import { generateToken, generateScreenShareToken, getLiveKitUrl } from '../services/livekit'
import { log } from '../middleware/logger'
import type {
  CreateRoomResponse,
  JoinRoomResponse,
  ApiError,
} from '@nameless/shared'

/**
 * Zod schema for room creation request.
 * Validates hostName is present and within length limits.
 */
const createRoomSchema = z.object({
  hostName: z
    .string({
      required_error: 'hostName is required',
      invalid_type_error: 'hostName must be a string',
    })
    .min(1, 'hostName is required')
    .max(50, 'hostName must be at most 50 characters'),
})

const roomsRouter = new Hono()

/**
 * POST /rooms - Create a new meeting room
 *
 * Creates a new room with the requester as host.
 * Returns the room ID, LiveKit token, and URL for connection.
 */
roomsRouter.post(
  '/',
  zValidator('json', createRoomSchema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.errors[0]
      const errorResponse: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
        },
      }
      return c.json(errorResponse, 400)
    }
  }),
  async (c) => {
    try {
      const { hostName } = c.req.valid('json')

      // Generate unique participant ID for the host
      const hostId = crypto.randomUUID()

      // Create the room
      const room = createRoom(hostId, hostName)

      // Get the host participant to get their color
      const hostParticipant = room.participants.get(hostId)
      if (!hostParticipant) {
        throw new Error('Host participant not found after room creation')
      }

      // Generate LiveKit tokens for the host
      const [token, screenShareToken] = await Promise.all([
        generateToken(
          room.id,
          hostId,
          hostName,
          'host',
          hostParticipant.color
        ),
        generateScreenShareToken(room.id, hostId, hostName),
      ])

      // Get LiveKit URL
      const livekitUrl = getLiveKitUrl()

      log({
        level: 'info',
        timestamp: new Date().toISOString(),
        message: 'Room created',
        roomId: room.id,
        participantId: hostId,
      })

      const response: CreateRoomResponse = {
        roomId: room.id,
        token,
        screenShareToken,
        livekitUrl,
      }

      return c.json(response, 201)
    } catch (error) {
      log({
        level: 'error',
        timestamp: new Date().toISOString(),
        message: 'Failed to create room',
        error: error instanceof Error ? error.message : String(error),
      })

      const errorResponse: ApiError = {
        error: {
          code: 'ROOM_CREATE_FAILED',
          message: 'Failed to create room',
        },
      }
      return c.json(errorResponse, 500)
    }
  }
)

/**
 * Zod schema for room join request.
 * Validates participantName is present and within length limits.
 */
const joinRoomSchema = z.object({
  participantName: z
    .string({
      required_error: 'participantName is required',
      invalid_type_error: 'participantName must be a string',
    })
    .min(1, 'participantName is required')
    .max(50, 'participantName must be at most 50 characters'),
  role: z.enum(['annotator', 'viewer']).optional(),
})

/**
 * POST /rooms/:roomId/join - Join an existing meeting room
 *
 * Joins an existing room as a participant.
 * Returns the LiveKit token and URL for connection.
 */
roomsRouter.post(
  '/:roomId/join',
  zValidator('json', joinRoomSchema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.errors[0]
      const errorResponse: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
        },
      }
      return c.json(errorResponse, 400)
    }
  }),
  async (c) => {
    try {
      const roomId = c.req.param('roomId')
      const { participantName, role } = c.req.valid('json')

      // Check if room exists
      const room = getRoom(roomId)
      if (!room) {
        const errorResponse: ApiError = {
          error: {
            code: 'ROOM_NOT_FOUND',
            message: 'The requested room does not exist or has ended',
          },
        }
        return c.json(errorResponse, 404)
      }

      // Generate unique participant ID
      const participantId = crypto.randomUUID()

      // Add participant to room (defaults to 'annotator' role)
      const participant = addParticipant(
        roomId,
        participantId,
        participantName,
        role ?? 'annotator'
      )

      if (!participant) {
        throw new Error('Failed to add participant to room')
      }

      // Generate LiveKit tokens for the participant
      const [token, screenShareToken] = await Promise.all([
        generateToken(
          roomId,
          participantId,
          participantName,
          participant.role,
          participant.color
        ),
        generateScreenShareToken(roomId, participantId, participantName),
      ])

      // Get LiveKit URL
      const livekitUrl = getLiveKitUrl()

      log({
        level: 'info',
        timestamp: new Date().toISOString(),
        message: 'Participant joined room',
        roomId,
        participantId,
      })

      const response: JoinRoomResponse = {
        token,
        screenShareToken,
        livekitUrl,
      }

      return c.json(response, 200)
    } catch (error) {
      log({
        level: 'error',
        timestamp: new Date().toISOString(),
        message: 'Failed to join room',
        error: error instanceof Error ? error.message : String(error),
      })

      const errorResponse: ApiError = {
        error: {
          code: 'JOIN_FAILED',
          message: 'Failed to join room',
        },
      }
      return c.json(errorResponse, 500)
    }
  }
)

export { roomsRouter }
