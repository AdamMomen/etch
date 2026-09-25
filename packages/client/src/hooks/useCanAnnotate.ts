import { useRoomStore } from '@/stores/roomStore'
import { canAnnotate as sharedCanAnnotate } from '@etch/shared'

/**
 * Returns whether the local participant's role permits annotating.
 *
 * Unlike the canAnnotate flag in useAnnotations, this does NOT require
 * an active screen share - use it for UI affordances (toolbar enabled
 * state, keyboard shortcuts) that depend on role permissions alone.
 */
export function useCanAnnotate(): boolean {
  const role = useRoomStore((state) => state.localParticipant?.role)
  const annotationsEnabled = useRoomStore((state) => state.annotationsEnabled)

  return !!role && sharedCanAnnotate(role, annotationsEnabled)
}
