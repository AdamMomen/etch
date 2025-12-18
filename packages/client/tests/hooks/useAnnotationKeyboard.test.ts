import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnnotationKeyboard } from '@/hooks/useAnnotationKeyboard'
import { useAnnotationStore } from '@/stores/annotationStore'

describe('useAnnotationKeyboard', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useAnnotationStore.setState({
        strokes: [],
        activeStroke: null,
        activeTool: 'pen',
      })
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to dispatch keyboard event
  function dispatchKeyDown(key: string, options: Partial<KeyboardEventInit> = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    })
    window.dispatchEvent(event)
  }

  // ─────────────────────────────────────────────────────────
  // PEN TOOL SHORTCUT TESTS (AC-4.3.10)
  // ─────────────────────────────────────────────────────────

  describe('pen tool shortcut (AC-4.3.10)', () => {
    it('activates pen tool when "2" key is pressed', () => {
      // First set to a different tool
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('2')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })

    it('pen tool remains active when already selected', () => {
      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('2')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })
  })

  // ─────────────────────────────────────────────────────────
  // HIGHLIGHTER TOOL SHORTCUT TESTS (AC-4.4.1)
  // ─────────────────────────────────────────────────────────

  describe('highlighter tool shortcut (AC-4.4.1)', () => {
    it('activates highlighter tool when "3" key is pressed', () => {
      // Start with pen tool (default)
      expect(useAnnotationStore.getState().activeTool).toBe('pen')

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('3')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('highlighter tool remains active when already selected', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('3')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('switches from pen to highlighter when "3" is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('3')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('does not activate highlighter when typing in INPUT element', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      // Create an input element and focus it
      const input = document.createElement('input')
      document.body.appendChild(input)

      const event = new KeyboardEvent('keydown', {
        key: '3',
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)

      // Tool should remain pen
      expect(useAnnotationStore.getState().activeTool).toBe('pen')

      document.body.removeChild(input)
    })

    it('does not activate highlighter when Ctrl is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('3', { ctrlKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })

    it('does not activate highlighter when Meta (Cmd) is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('3', { metaKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })

    it('does not activate highlighter when Alt is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('3', { altKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })
  })

  // ─────────────────────────────────────────────────────────
  // ERASER TOOL SHORTCUT TESTS (AC-4.5.1)
  // ─────────────────────────────────────────────────────────

  describe('eraser tool shortcut (AC-4.5.1)', () => {
    it('activates eraser tool when "7" key is pressed', () => {
      // Start with pen tool (default)
      expect(useAnnotationStore.getState().activeTool).toBe('pen')

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('7')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('eraser')
    })

    it('eraser tool remains active when already selected', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('eraser')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('7')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('eraser')
    })

    it('switches from highlighter to eraser when "7" is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('7')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('eraser')
    })

    it('does not activate eraser when typing in INPUT element', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      // Create an input element and focus it
      const input = document.createElement('input')
      document.body.appendChild(input)

      const event = new KeyboardEvent('keydown', {
        key: '7',
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)

      // Tool should remain pen
      expect(useAnnotationStore.getState().activeTool).toBe('pen')

      document.body.removeChild(input)
    })

    it('does not activate eraser when Ctrl is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('7', { ctrlKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })

    it('does not activate eraser when Meta (Cmd) is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('7', { metaKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })

    it('does not activate eraser when Alt is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('7', { altKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })
  })

  // ─────────────────────────────────────────────────────────
  // INPUT FIELD EXCLUSION TESTS
  // ─────────────────────────────────────────────────────────

  describe('input field exclusion', () => {
    it('does not activate tool when typing in INPUT element', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      // Create an input element and focus it
      const input = document.createElement('input')
      document.body.appendChild(input)

      const event = new KeyboardEvent('keydown', {
        key: '2',
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)

      // Tool should remain highlighter
      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')

      document.body.removeChild(input)
    })

    it('does not activate tool when typing in TEXTAREA element', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)

      const event = new KeyboardEvent('keydown', {
        key: '2',
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, 'target', { value: textarea })
      window.dispatchEvent(event)

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')

      document.body.removeChild(textarea)
    })

    it('does not activate tool when typing in contenteditable element', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      const div = document.createElement('div')
      div.contentEditable = 'true'
      // In jsdom, we need to explicitly set isContentEditable as a property
      Object.defineProperty(div, 'isContentEditable', { value: true })
      document.body.appendChild(div)

      const event = new KeyboardEvent('keydown', {
        key: '2',
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, 'target', { value: div })
      window.dispatchEvent(event)

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')

      document.body.removeChild(div)
    })
  })

  // ─────────────────────────────────────────────────────────
  // MODIFIER KEY EXCLUSION TESTS
  // ─────────────────────────────────────────────────────────

  describe('modifier key exclusion', () => {
    it('does not activate tool when Ctrl is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('2', { ctrlKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('does not activate tool when Meta (Cmd) is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('2', { metaKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('does not activate tool when Alt is pressed', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('2', { altKey: true })
      })

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })
  })

  // ─────────────────────────────────────────────────────────
  // OTHER KEYS TESTS
  // ─────────────────────────────────────────────────────────

  describe('other keys', () => {
    it('does not change tool for unrelated keys', () => {
      renderHook(() => useAnnotationKeyboard())

      act(() => {
        dispatchKeyDown('a')
        dispatchKeyDown('1')
        dispatchKeyDown('Escape')
      })

      // Should still be pen (default)
      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })
  })

  // ─────────────────────────────────────────────────────────
  // CLEANUP TESTS
  // ─────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useAnnotationKeyboard())

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })
})
