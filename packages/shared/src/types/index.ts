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

// Annotation DataTrack message types (Story 4.7, 4.8)
export type {
  StrokeUpdateMessage,
  StrokeCompleteMessage,
  StrokeDeleteMessage,
  ClearAllMessage,
  StateRequestMessage,
  StateSnapshotMessage,
  AnnotationMessage,
} from './annotation'

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
} from './annotation'

// Screen share DataTrack message types (instant stop notification)
export type {
  ScreenShareStopMessage,
  ScreenShareMessage,
} from './screenShare'

export {
  SCREEN_SHARE_MESSAGE_TYPES,
  SCREEN_SHARE_TOPIC,
  isScreenShareStopMessage,
  isValidScreenShareMessage,
  encodeScreenShareMessage,
  decodeScreenShareMessage,
} from './screenShare'
