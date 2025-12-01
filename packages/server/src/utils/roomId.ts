import { customAlphabet } from 'nanoid'

/**
 * Custom alphabet for room ID generation.
 * Uses lowercase letters and numbers, excluding ambiguous characters:
 * - Excludes: 0, O, 1, l, I (to avoid confusion)
 */
const ROOM_ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

/**
 * Segment length for room ID (3 characters per segment)
 */
const SEGMENT_LENGTH = 3

/**
 * Number of segments in room ID
 */
const SEGMENT_COUNT = 3

/**
 * Generates a unique, URL-safe room ID in format xxx-xxx-xxx.
 * Uses lowercase letters and numbers, excluding ambiguous characters (0, O, 1, l, I).
 *
 * @returns A room ID in format xxx-xxx-xxx (e.g., "a2b-c3d-e4f")
 */
export function generateRoomId(): string {
  const generateSegment = customAlphabet(ROOM_ID_ALPHABET, SEGMENT_LENGTH)

  const segments: string[] = []
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    segments.push(generateSegment())
  }

  return segments.join('-')
}

/**
 * Validates that a room ID matches the expected format.
 *
 * @param roomId - The room ID to validate
 * @returns True if the room ID matches xxx-xxx-xxx format with valid characters
 */
export function isValidRoomId(roomId: string): boolean {
  const pattern = /^[23456789abcdefghjkmnpqrstuvwxyz]{3}-[23456789abcdefghjkmnpqrstuvwxyz]{3}-[23456789abcdefghjkmnpqrstuvwxyz]{3}$/
  return pattern.test(roomId)
}
