/**
 * Available roles for meeting participants.
 * - host: Full control over the meeting
 * - sharer: Can share screen
 * - annotator: Can create annotations
 * - viewer: Can only view, no annotation permissions
 */
export type Role = 'host' | 'sharer' | 'annotator' | 'viewer'

/**
 * Represents a participant in a meeting room.
 */
export interface Participant {
  /** Unique identifier for the participant */
  id: string
  /** Display name of the participant */
  name: string
  /** Current role in the meeting */
  role: Role
  /** Hex color string assigned to this participant for annotations */
  color: string
  /** Whether this is the local user */
  isLocal: boolean
  /** Whether the participant is currently speaking (audio detected) */
  isSpeaking?: boolean
  /** Whether the participant has video enabled */
  hasVideo?: boolean
}

/**
 * Represents the current state of a meeting room.
 */
export interface RoomState {
  /** Unique identifier for the room */
  id: string
  /** List of all participants in the room */
  participants: Participant[]
  /** Whether screen sharing is currently active */
  isScreenSharing: boolean
  /** ID of the participant currently sharing screen, null if not sharing */
  sharerId: string | null
  /** Whether annotations are enabled for the room */
  annotationsEnabled: boolean
}
