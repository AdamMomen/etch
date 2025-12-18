import { useEffect } from 'react'
import { useAnnotationStore } from '@/stores/annotationStore'

/**
 * Hook that registers global keyboard shortcuts for annotation tools.
 *
 * Keyboard shortcuts:
 * - `2` key: Activate pen tool
 * - `3` key: Activate highlighter tool
 *
 * Note: Future stories will add:
 * - `4` key: Activate eraser tool (Story 4.5)
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useAnnotationKeyboard(): void {
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)

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
        case '2':
          setActiveTool('pen')
          break
        case '3':
          setActiveTool('highlighter')
          break
        // Future shortcuts will be added here:
        // case '4': setActiveTool('eraser'); break;
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setActiveTool])
}
