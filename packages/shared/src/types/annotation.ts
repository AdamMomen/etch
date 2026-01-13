/**
 * DataTrack message types for annotation sync.
 * Used for real-time synchronization of annotations across participants.
 *
 * Per ADR-002: LiveKit DataTracks for Annotations
 * All annotation events flow through DataTracks in reliable mode.
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */

import type { Point, Stroke } from './stroke'

/**
 * Message type constants for type-safe message handling.
 * Used as discriminators in the union type.
 */
export const ANNOTATION_MESSAGE_TYPES = {
  STROKE_UPDATE: 'stroke_update',
  STROKE_COMPLETE: 'stroke_complete',
  STROKE_DELETE: 'stroke_delete',
  CLEAR_ALL: 'clear_all',
  STATE_REQUEST: 'state_request',
  STATE_SNAPSHOT: 'state_snapshot',
} as const

/**
 * DataTrack topic for annotation messages.
 * Used to filter messages in the DataReceived event handler.
 */
export const ANNOTATION_TOPIC = 'annotations'

/**
 * Incremental stroke update sent during drawing.
 * Batched every 16ms (60fps) to reduce network overhead.
 *
 * Used for: Real-time preview of in-progress remote strokes
 */
export interface StrokeUpdateMessage {
  type: typeof ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE
  /** Unique identifier for the stroke */
  strokeId: string
  /** ID of the participant drawing this stroke */
  participantId: string
  /** Drawing tool used */
  tool: 'pen' | 'highlighter'
  /** Hex color string for the stroke */
  color: string
  /** New points since last update (normalized [0,1] coordinates) */
  points: Point[]
  /** Unix timestamp in milliseconds for latency measurement */
  timestamp: number
}

/**
 * Complete stroke sent on mouse up.
 * Contains the full point array for the finalized stroke.
 *
 * Used for: Adding completed strokes to remote stores
 */
export interface StrokeCompleteMessage {
  type: typeof ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE
  /** Unique identifier for the stroke */
  strokeId: string
  /** ID of the participant who created this stroke */
  participantId: string
  /** Drawing tool used */
  tool: 'pen' | 'highlighter'
  /** Hex color string for the stroke */
  color: string
  /** Full point array for the completed stroke (normalized [0,1] coordinates) */
  points: Point[]
  /** Unix timestamp in milliseconds for latency measurement */
  timestamp: number
}

/**
 * Delete stroke message sent when eraser tool is used.
 *
 * Used for: Removing strokes from remote stores
 */
export interface StrokeDeleteMessage {
  type: typeof ANNOTATION_MESSAGE_TYPES.STROKE_DELETE
  /** ID of the stroke to delete */
  strokeId: string
  /** ID of the participant who deleted the stroke */
  deletedBy: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * Clear all strokes message (host only).
 *
 * Used for: Clearing all annotations from all participants' stores
 */
export interface ClearAllMessage {
  type: typeof ANNOTATION_MESSAGE_TYPES.CLEAR_ALL
  /** ID of the participant who cleared (must be host) */
  clearedBy: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * State request message sent by late-joining participants.
 * Requests the current annotation state from existing participants.
 *
 * Used for: Late-joiner sync - requesting current state on join
 * @see Story 4.8: Implement Late-Joiner Annotation Sync
 */
export interface StateRequestMessage {
  type: typeof ANNOTATION_MESSAGE_TYPES.STATE_REQUEST
  /** ID of the participant requesting state */
  requesterId: string
}

/**
 * State snapshot message sent in response to a state request.
 * Contains all completed strokes for the late-joiner to render.
 *
 * Used for: Late-joiner sync - responding with current state
 * @see Story 4.8: Implement Late-Joiner Annotation Sync
 */
export interface StateSnapshotMessage {
  type: typeof ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT
  /** ID of the participant who requested state (for filtering) */
  requesterId: string
  /** Array of completed strokes to sync */
  strokes: Stroke[]
  /** Unix timestamp in milliseconds for conflict resolution */
  timestamp: number
}

/**
 * Union type for all annotation messages.
 * Enables type-safe message handling with discriminated unions.
 *
 * @example
 * ```typescript
 * function handleMessage(msg: AnnotationMessage) {
 *   switch (msg.type) {
 *     case 'stroke_update':
 *       // msg is typed as StrokeUpdateMessage
 *       break
 *     case 'stroke_complete':
 *       // msg is typed as StrokeCompleteMessage
 *       break
 *   }
 * }
 * ```
 */
export type AnnotationMessage =
  | StrokeUpdateMessage
  | StrokeCompleteMessage
  | StrokeDeleteMessage
  | ClearAllMessage
  | StateRequestMessage
  | StateSnapshotMessage

/**
 * Type guard to check if a message is a StrokeUpdateMessage.
 */
export function isStrokeUpdateMessage(
  msg: AnnotationMessage
): msg is StrokeUpdateMessage {
  return msg.type === ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE
}

/**
 * Type guard to check if a message is a StrokeCompleteMessage.
 */
export function isStrokeCompleteMessage(
  msg: AnnotationMessage
): msg is StrokeCompleteMessage {
  return msg.type === ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE
}

/**
 * Type guard to check if a message is a StrokeDeleteMessage.
 */
export function isStrokeDeleteMessage(
  msg: AnnotationMessage
): msg is StrokeDeleteMessage {
  return msg.type === ANNOTATION_MESSAGE_TYPES.STROKE_DELETE
}

/**
 * Type guard to check if a message is a ClearAllMessage.
 */
export function isClearAllMessage(
  msg: AnnotationMessage
): msg is ClearAllMessage {
  return msg.type === ANNOTATION_MESSAGE_TYPES.CLEAR_ALL
}

/**
 * Type guard to check if a message is a StateRequestMessage.
 * @see Story 4.8: Implement Late-Joiner Annotation Sync
 */
export function isStateRequestMessage(
  msg: AnnotationMessage
): msg is StateRequestMessage {
  return msg.type === ANNOTATION_MESSAGE_TYPES.STATE_REQUEST
}

/**
 * Type guard to check if a message is a StateSnapshotMessage.
 * @see Story 4.8: Implement Late-Joiner Annotation Sync
 */
export function isStateSnapshotMessage(
  msg: AnnotationMessage
): msg is StateSnapshotMessage {
  return msg.type === ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT
}

/**
 * Validates that an unknown object is a valid AnnotationMessage.
 * Used for parsing incoming DataTrack messages.
 *
 * @param obj - Unknown object to validate
 * @returns True if the object is a valid AnnotationMessage
 */
export function isValidAnnotationMessage(
  obj: unknown
): obj is AnnotationMessage {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const msg = obj as Record<string, unknown>

  if (typeof msg.type !== 'string') {
    return false
  }

  switch (msg.type) {
    case ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE:
      return (
        typeof msg.strokeId === 'string' &&
        typeof msg.participantId === 'string' &&
        (msg.tool === 'pen' || msg.tool === 'highlighter') &&
        typeof msg.color === 'string' &&
        Array.isArray(msg.points) &&
        typeof msg.timestamp === 'number'
      )

    case ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE:
      return (
        typeof msg.strokeId === 'string' &&
        typeof msg.participantId === 'string' &&
        (msg.tool === 'pen' || msg.tool === 'highlighter') &&
        typeof msg.color === 'string' &&
        Array.isArray(msg.points) &&
        typeof msg.timestamp === 'number'
      )

    case ANNOTATION_MESSAGE_TYPES.STROKE_DELETE:
      return (
        typeof msg.strokeId === 'string' &&
        typeof msg.deletedBy === 'string' &&
        typeof msg.timestamp === 'number'
      )

    case ANNOTATION_MESSAGE_TYPES.CLEAR_ALL:
      return (
        typeof msg.clearedBy === 'string' && typeof msg.timestamp === 'number'
      )

    case ANNOTATION_MESSAGE_TYPES.STATE_REQUEST:
      return typeof msg.requesterId === 'string'

    case ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT:
      return (
        typeof msg.requesterId === 'string' &&
        Array.isArray(msg.strokes) &&
        typeof msg.timestamp === 'number'
      )

    default:
      return false
  }
}

/**
 * Encodes an AnnotationMessage to a Uint8Array for DataTrack publishing.
 *
 * @param message - The message to encode
 * @returns Encoded Uint8Array
 */
export function encodeAnnotationMessage(
  message: AnnotationMessage
): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(JSON.stringify(message))
}

/**
 * Decodes a Uint8Array to an AnnotationMessage.
 * Returns null if the data is not a valid annotation message.
 *
 * @param data - The data to decode
 * @returns Decoded AnnotationMessage or null if invalid
 */
export function decodeAnnotationMessage(
  data: Uint8Array
): AnnotationMessage | null {
  try {
    const decoder = new TextDecoder()
    const parsed = JSON.parse(decoder.decode(data))

    if (isValidAnnotationMessage(parsed)) {
      return parsed
    }

    return null
  } catch {
    return null
  }
}
