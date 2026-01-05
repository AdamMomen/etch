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
  // Screen share message types
  ScreenShareStopMessage,
  ScreenShareMessage,
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

// Screen share constants and utilities
export {
  SCREEN_SHARE_MESSAGE_TYPES,
  SCREEN_SHARE_TOPIC,
  isScreenShareStopMessage,
  isValidScreenShareMessage,
  encodeScreenShareMessage,
  decodeScreenShareMessage,
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

// Permission utilities (Story 5.1)
export {
  canAnnotate,
  canDeleteStroke,
  canClearAll,
  canModerateUsers,
  canToggleRoomAnnotations,
} from './permissions'

// Test Utilities
export {
  createMockStroke,
  createMockPoint,
  createMockParticipant,
  createMockHost,
  createMockViewer,
  createMockSharer,
} from './test-utils'
