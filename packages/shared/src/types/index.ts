export type { Point, Stroke } from './stroke'
export type { Role, Participant, RoomState } from './room'
export type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ApiError,
  HealthResponse,
} from './api'

// Annotation DataTrack message types (Story 4.7)
export type {
  StrokeUpdateMessage,
  StrokeCompleteMessage,
  StrokeDeleteMessage,
  ClearAllMessage,
  AnnotationMessage,
} from './annotation'

export {
  ANNOTATION_MESSAGE_TYPES,
  ANNOTATION_TOPIC,
  isStrokeUpdateMessage,
  isStrokeCompleteMessage,
  isStrokeDeleteMessage,
  isClearAllMessage,
  isValidAnnotationMessage,
  encodeAnnotationMessage,
  decodeAnnotationMessage,
} from './annotation'
