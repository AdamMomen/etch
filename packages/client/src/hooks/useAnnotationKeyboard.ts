import { useEffect } from 'react'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import { useCanAnnotate } from '@/hooks/useCanAnnotate'

/**
 * Hook that registers global keyboard shortcuts for annotation tools.
 *
 * Keyboard shortcuts:
 * - `1` or `V` key: Activate select tool (AC-4.6.6)
 * - `2` key: Activate pen tool
 * - `3` key: Activate highlighter tool
 * - `7` key: Activate eraser tool
 * - `0` key: Clear all annotations (host only) (AC-4.6.6)
 *
 * Shortcut keys are only handled while a screen share is active. `V` is also
 * bound to the camera toggle in CameraButton — this listener runs in the
 * capture phase and calls preventDefault when it handles a key, so annotation
 * shortcuts win during an active share and media shortcuts get the key
 * otherwise.
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export interface UseAnnotationKeyboardOptions {
  /** Called when the host presses `0` to clear all annotations (Story 5.4) */
  onClearAll?: () => void
  /** Whether a screen share is currently active; shortcuts only fire then */
  isScreenShareActive?: boolean
}

export function useAnnotationKeyboard(
  options: UseAnnotationKeyboardOptions = {}
): void {
  const { onClearAll, isScreenShareActive = false } = options
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)
  const localParticipant = useRoomStore((state) => state.localParticipant)
  const isHost = localParticipant?.role === 'host'
  const canAnnotate = useCanAnnotate()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't fire if user is typing in an input field
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Don't fire if modifier keys are pressed
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      switch (event.key) {
        case '1':
        case 'v':
        case 'V':
          if (canAnnotate && isScreenShareActive) {
            event.preventDefault()
            setActiveTool('select')
          }
          break
        case '2':
          if (canAnnotate && isScreenShareActive) {
            event.preventDefault()
            setActiveTool('pen')
          }
          break
        case '3':
          if (canAnnotate && isScreenShareActive) {
            event.preventDefault()
            setActiveTool('highlighter')
          }
          break
        case '7':
          if (canAnnotate && isScreenShareActive) {
            event.preventDefault()
            setActiveTool('eraser')
          }
          break
        case '0':
          // Clear all is host-only (Story 5.4)
          if (isHost && isScreenShareActive) {
            event.preventDefault()
            onClearAll?.()
          }
          break
      }
    }

    // Capture phase so handled keys preventDefault before media-button
    // bubble listeners (CameraButton V, MicrophoneButton M) see them.
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [setActiveTool, isHost, canAnnotate, isScreenShareActive, onClearAll])
}
