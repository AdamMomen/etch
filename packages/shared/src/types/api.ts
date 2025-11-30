import type { Role } from './room'

/**
 * Request body for creating a new room.
 */
export interface CreateRoomRequest {
  /** Display name of the host creating the room */
  hostName: string
}

/**
 * Response when a room is successfully created.
 */
export interface CreateRoomResponse {
  /** Unique identifier for the created room */
  roomId: string
  /** JWT token for authenticating with LiveKit */
  token: string
  /** WebSocket URL for LiveKit connection */
  livekitUrl: string
}

/**
 * Request body for joining an existing room.
 */
export interface JoinRoomRequest {
  /** Display name of the participant joining */
  participantName: string
  /** Optional role for the participant (defaults to viewer) */
  role?: Role
}

/**
 * Response when successfully joining a room.
 */
export interface JoinRoomResponse {
  /** JWT token for authenticating with LiveKit */
  token: string
  /** WebSocket URL for LiveKit connection */
  livekitUrl: string
}

/**
 * Standard error response format for API errors.
 */
export interface ApiError {
  error: {
    /** Error code in SCREAMING_SNAKE_CASE */
    code: string
    /** Human-readable error message */
    message: string
  }
}

/**
 * Response from the health check endpoint.
 */
export interface HealthResponse {
  /** Status indicator */
  status: 'ok'
  /** Unix timestamp in milliseconds */
  timestamp: number
}
