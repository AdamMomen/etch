import type { Role } from '@etch/shared'
import { generateRoomId } from '../utils/roomId'
import { PARTICIPANT_COLORS } from '@etch/shared'

/**
 * Record representing a participant stored server-side.
 */
export interface ParticipantRecord {
  /** Unique identifier (UUID) */
  id: string
  /** Display name */
  name: string
  /** Role in the room */
  role: Role
  /** Assigned hex color for annotations */
  color: string
  /** Unix timestamp when participant joined */
  joinedAt: number
}

/**
 * Record representing a room stored server-side.
 */
export interface RoomRecord {
  /** Unique room ID in xxx-xxx-xxx format */
  id: string
  /** Unix timestamp when room was created */
  createdAt: number
  /** Participant ID of the room creator (host) */
  hostId: string
  /** Map of participant ID to participant record */
  participants: Map<string, ParticipantRecord>
}

/**
 * In-memory storage for rooms.
 * For MVP - no persistent database.
 */
const rooms = new Map<string, RoomRecord>()

/**
 * Creates a new room with the specified host.
 *
 * @param hostId - The unique ID of the host participant
 * @param hostName - The display name of the host
 * @param roomId - Optional room ID (auto-generated if not provided)
 * @returns The created room record
 */
export function createRoom(
  hostId: string,
  hostName: string,
  roomId?: string
): RoomRecord {
  const id = roomId ?? generateRoomId()
  const now = Date.now()

  const hostParticipant: ParticipantRecord = {
    id: hostId,
    name: hostName,
    role: 'host',
    color: PARTICIPANT_COLORS[0], // Host gets the first color (orange)
    joinedAt: now,
  }

  const room: RoomRecord = {
    id,
    createdAt: now,
    hostId,
    participants: new Map([[hostId, hostParticipant]]),
  }

  rooms.set(id, room)
  return room
}

/**
 * Retrieves a room by its ID.
 *
 * @param roomId - The room ID to look up
 * @returns The room record if found, undefined otherwise
 */
export function getRoom(roomId: string): RoomRecord | undefined {
  return rooms.get(roomId)
}

/**
 * Deletes a room by its ID.
 *
 * @param roomId - The room ID to delete
 * @returns True if the room was deleted, false if it didn't exist
 */
export function deleteRoom(roomId: string): boolean {
  return rooms.delete(roomId)
}

/**
 * Adds a participant to an existing room.
 *
 * @param roomId - The room ID to add the participant to
 * @param participantId - The unique ID of the participant
 * @param name - The display name of the participant
 * @param role - The role of the participant (defaults to 'annotator')
 * @returns The participant record if added, undefined if room doesn't exist
 */
export function addParticipant(
  roomId: string,
  participantId: string,
  name: string,
  role: Role = 'annotator'
): ParticipantRecord | undefined {
  const room = rooms.get(roomId)
  if (!room) {
    return undefined
  }

  // Assign the next available color
  const colorIndex = room.participants.size % PARTICIPANT_COLORS.length
  const color = PARTICIPANT_COLORS[colorIndex]

  const participant: ParticipantRecord = {
    id: participantId,
    name,
    role,
    color,
    joinedAt: Date.now(),
  }

  room.participants.set(participantId, participant)
  return participant
}

/**
 * Removes a participant from a room.
 *
 * @param roomId - The room ID
 * @param participantId - The participant ID to remove
 * @returns True if the participant was removed, false otherwise
 */
export function removeParticipant(
  roomId: string,
  participantId: string
): boolean {
  const room = rooms.get(roomId)
  if (!room) {
    return false
  }

  return room.participants.delete(participantId)
}

/**
 * Gets the count of participants in a room.
 *
 * @param roomId - The room ID
 * @returns The number of participants, or 0 if room doesn't exist
 */
export function getParticipantCount(roomId: string): number {
  const room = rooms.get(roomId)
  return room ? room.participants.size : 0
}

/**
 * Clears all rooms from storage.
 * Primarily used for testing.
 */
export function clearRooms(): void {
  rooms.clear()
}

/**
 * Gets the total number of rooms.
 * Primarily used for testing/debugging.
 */
export function getRoomCount(): number {
  return rooms.size
}
