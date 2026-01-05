import type { Role } from './types/room'
import type { Stroke } from './types/stroke'

/**
 * Check if a role can create annotations.
 * Host can always annotate, even when room annotations are disabled.
 *
 * @param role - The participant's role
 * @param annotationsEnabled - Whether room-wide annotations are enabled
 * @returns true if the role can annotate
 */
export function canAnnotate(role: Role, annotationsEnabled: boolean): boolean {
  if (role === 'viewer') return false
  if (role === 'host') return true // Host can always annotate
  return annotationsEnabled // sharer/annotator depend on room setting
}

/**
 * Check if a role can delete a specific stroke.
 * - Host: Can delete any stroke
 * - Sharer (when sharing): Can delete any stroke on their screen
 * - Annotator/Sharer (not sharing): Can only delete own strokes
 * - Viewer: Cannot delete any strokes
 *
 * @param role - The participant's role
 * @param stroke - The stroke to check
 * @param userId - The current user's ID
 * @param isSharer - Whether the user is currently sharing their screen
 * @returns true if the role can delete the stroke
 */
export function canDeleteStroke(
  role: Role,
  stroke: Stroke,
  userId: string,
  isSharer: boolean
): boolean {
  if (role === 'viewer') return false
  if (role === 'host') return true
  if (isSharer) return true // Sharer can delete any stroke when sharing
  return stroke.participantId === userId // Can only delete own
}

/**
 * Check if a role can clear all annotations.
 * Only hosts can clear all.
 *
 * @param role - The participant's role
 * @returns true if the role can clear all annotations
 */
export function canClearAll(role: Role): boolean {
  return role === 'host'
}

/**
 * Check if a role can moderate users (remove, change roles).
 * Only hosts can moderate.
 *
 * @param role - The participant's role
 * @returns true if the role can moderate users
 */
export function canModerateUsers(role: Role): boolean {
  return role === 'host'
}

/**
 * Check if a role can toggle room-wide annotation settings.
 * Only hosts can toggle.
 *
 * @param role - The participant's role
 * @returns true if the role can toggle room annotations
 */
export function canToggleRoomAnnotations(role: Role): boolean {
  return role === 'host'
}
