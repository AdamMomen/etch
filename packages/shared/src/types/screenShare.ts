/**
 * DataTrack message types for screen share events.
 * Used for instant notification when screen sharing stops.
 *
 * The TrackUnpublished event from LiveKit can be slow since it relies on
 * server-side notification. This custom message is sent directly via DataTrack
 * for immediate viewer updates.
 */

/**
 * Message type constants for screen share events.
 */
export const SCREEN_SHARE_MESSAGE_TYPES = {
  SCREEN_SHARE_STOP: 'screen_share_stop',
} as const

/**
 * DataTrack topic for screen share events.
 * Separate from annotation topic for clear message routing.
 */
export const SCREEN_SHARE_TOPIC = 'screen_share'

/**
 * Message sent when a participant stops sharing their screen.
 * This is sent IMMEDIATELY when the user clicks stop, before the track is unpublished.
 */
export interface ScreenShareStopMessage {
  type: typeof SCREEN_SHARE_MESSAGE_TYPES.SCREEN_SHARE_STOP
  /** ID of the participant who stopped sharing */
  sharerId: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * Union type for all screen share messages.
 */
export type ScreenShareMessage = ScreenShareStopMessage

/**
 * Type guard to check if a message is a ScreenShareStopMessage.
 */
export function isScreenShareStopMessage(
  msg: ScreenShareMessage
): msg is ScreenShareStopMessage {
  return msg.type === SCREEN_SHARE_MESSAGE_TYPES.SCREEN_SHARE_STOP
}

/**
 * Validates that an unknown object is a valid ScreenShareMessage.
 */
export function isValidScreenShareMessage(
  obj: unknown
): obj is ScreenShareMessage {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const msg = obj as Record<string, unknown>

  if (msg.type === SCREEN_SHARE_MESSAGE_TYPES.SCREEN_SHARE_STOP) {
    return typeof msg.sharerId === 'string' && typeof msg.timestamp === 'number'
  }

  return false
}

/**
 * Encodes a ScreenShareMessage to a Uint8Array for DataTrack publishing.
 */
export function encodeScreenShareMessage(
  message: ScreenShareMessage
): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(JSON.stringify(message))
}

/**
 * Decodes a Uint8Array to a ScreenShareMessage.
 * Returns null if the data is not a valid screen share message.
 */
export function decodeScreenShareMessage(
  data: Uint8Array
): ScreenShareMessage | null {
  try {
    const decoder = new TextDecoder()
    const parsed = JSON.parse(decoder.decode(data))

    if (isValidScreenShareMessage(parsed)) {
      return parsed
    }

    return null
  } catch {
    return null
  }
}
