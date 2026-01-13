import { useEffect } from 'react'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'

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
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useAnnotationKeyboard(): void {
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)
  const clearAll = useAnnotationStore((state) => state.clearAll)
  const localParticipant = useRoomStore((state) => state.localParticipant)
  const isHost = localParticipant?.role === 'host'

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
          setActiveTool('select')
          break
        case '2':
          setActiveTool('pen')
          break
        case '3':
          setActiveTool('highlighter')
          break
        case '7':
          setActiveTool('eraser')
          break
        case '0':
          // Clear all is host-only
          if (isHost) {
            clearAll()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setActiveTool, clearAll, isHost])
}
