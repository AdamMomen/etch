import type { Role } from '@nameless/shared'
import { PARTICIPANT_COLORS } from '@nameless/shared'

/**
 * Metadata structure stored in LiveKit participant metadata field.
 * This is set by the server when generating tokens.
 */
export interface ParticipantMetadata {
  role: Role
  color: string
  /** True if this participant is a screen share connection (not a real user) */
  isScreenShare?: boolean
  /** If isScreenShare is true, this is the identity of the main participant */
  parentId?: string
}

/**
 * Default metadata used when parsing fails or metadata is empty.
 */
const DEFAULT_METADATA: ParticipantMetadata = {
  role: 'annotator',
  color: PARTICIPANT_COLORS[0],
}

/**
 * Parses participant metadata from a JSON string.
 * Returns default values if parsing fails or metadata is malformed.
 *
 * @param metadata - JSON string containing role and color
 * @returns Parsed metadata with role and color
 */
export function parseParticipantMetadata(metadata: string): ParticipantMetadata {
  if (!metadata || metadata.trim() === '') {
    return DEFAULT_METADATA
  }

  try {
    const parsed = JSON.parse(metadata)

    // Validate role
    const validRoles: Role[] = ['host', 'sharer', 'annotator', 'viewer']
    const role: Role = validRoles.includes(parsed.role) ? parsed.role : DEFAULT_METADATA.role

    // Validate color (should be a hex color string)
    const color = typeof parsed.color === 'string' && parsed.color.startsWith('#')
      ? parsed.color
      : DEFAULT_METADATA.color

    // Extract screen share fields if present
    const isScreenShare = parsed.isScreenShare === true
    const parentId = typeof parsed.parentId === 'string' ? parsed.parentId : undefined

    return { role, color, isScreenShare, parentId }
  } catch {
    return DEFAULT_METADATA
  }
}
