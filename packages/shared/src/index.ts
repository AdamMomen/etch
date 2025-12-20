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
  // Annotation message types (Story 4.7, 4.8)
  StrokeUpdateMessage,
  StrokeCompleteMessage,
  StrokeDeleteMessage,
  ClearAllMessage,
  StateRequestMessage,
  StateSnapshotMessage,
  AnnotationMessage,
} from './types'

// Annotation constants and utilities (Story 4.7, 4.8)
export {
  ANNOTATION_MESSAGE_TYPES,
  ANNOTATION_TOPIC,
  isStrokeUpdateMessage,
  isStrokeCompleteMessage,
  isStrokeDeleteMessage,
  isClearAllMessage,
  isStateRequestMessage,
  isStateSnapshotMessage,
  isValidAnnotationMessage,
  encodeAnnotationMessage,
  decodeAnnotationMessage,
} from './types'

// Constants
export {
  PARTICIPANT_COLORS,
  type ParticipantColor,
  getParticipantColor,
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
