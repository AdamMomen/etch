// Types
export type {
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
} from './types'

// Constants
export {
  PARTICIPANT_COLORS,
  type ParticipantColor,
  MAX_STROKE_POINTS,
  MAX_PARTICIPANTS,
  TOKEN_EXPIRY_SECONDS,
} from './constants'

// Test Utilities
export {
  createMockStroke,
  createMockPoint,
  createMockParticipant,
  createMockHost,
  createMockViewer,
  createMockSharer,
} from './test-utils'
