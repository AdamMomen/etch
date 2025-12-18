import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnnotations } from '@/hooks/useAnnotations'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import { useScreenShareStore } from '@/stores/screenShareStore'
import { PARTICIPANT_COLORS } from '@nameless/shared'
import type { Stroke, Point } from '@nameless/shared'

// Mock crypto.randomUUID for deterministic testing
const mockUUID = 'test-uuid-12345'
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUID),
})

describe('useAnnotations', () => {
  beforeEach(() => {
    // Reset all stores to initial state
    act(() => {
      useAnnotationStore.setState({
        strokes: [],
        activeStroke: null,
        activeTool: 'pen',
      })

      useRoomStore.setState({
        localParticipant: {
          id: 'participant-123',
          name: 'Test User',
          role: 'annotator',
          color: PARTICIPANT_COLORS[0],
          isLocal: true,
        },
        remoteParticipants: [],
        currentRoom: null,
        isConnecting: false,
        isConnected: true,
        connectionError: null,
      })

      useScreenShareStore.setState({
        isSharing: true,
        sharerId: 'sharer-123',
        sharerName: 'Sharer',
        isLocalSharing: false,
        sharedSource: null,
        sharedSourceId: null,
      })
    })

    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────
  // INITIAL STATE TESTS
  // ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns strokes from annotationStore', () => {
      const mockStroke: Stroke = {
        id: 'stroke-1',
        participantId: 'participant-123',
        tool: 'pen',
        color: PARTICIPANT_COLORS[0],
        points: [{ x: 0.5, y: 0.5 }],
        createdAt: Date.now(),
        isComplete: true,
      }

      act(() => {
        useAnnotationStore.getState().addStroke(mockStroke)
      })

      const { result } = renderHook(() => useAnnotations())
      expect(result.current.strokes).toHaveLength(1)
      expect(result.current.strokes[0]).toEqual(mockStroke)
    })

    it('returns null activeStroke initially', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.activeStroke).toBeNull()
    })

    it('returns pen as default activeTool (AC-4.3.9)', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.activeTool).toBe('pen')
    })

    it('returns participant color from roomStore', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.myColor).toBe(PARTICIPANT_COLORS[0])
    })

    it('returns participant ID from roomStore', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.myParticipantId).toBe('participant-123')
    })

    it('falls back to first color if no participant color', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'participant-123',
            name: 'Test User',
            role: 'annotator',
            color: undefined as unknown as string,
            isLocal: true,
          },
        })
      })

      const { result } = renderHook(() => useAnnotations())
      expect(result.current.myColor).toBe(PARTICIPANT_COLORS[0])
    })
  })

  // ─────────────────────────────────────────────────────────
  // canAnnotate TESTS
  // ─────────────────────────────────────────────────────────

  describe('canAnnotate', () => {
    it('returns true when screen sharing is active and user is annotator', () => {
      const { result } = renderHook(() => useAnnotations())
      expect(result.current.canAnnotate).toBe(true)
    })

    it('returns true when screen sharing is active and user is host', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'participant-123',
            name: 'Test User',
            role: 'host',
            color: PARTICIPANT_COLORS[0],
            isLocal: true,
          },
        })
      })

      const { result } = renderHook(() => useAnnotations())
      expect(result.current.canAnnotate).toBe(true)
    })

    it('returns true when screen sharing is active and user is sharer', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'participant-123',
            name: 'Test User',
            role: 'sharer',
            color: PARTICIPANT_COLORS[0],
            isLocal: true,
          },
        })
      })

      const { result } = renderHook(() => useAnnotations())
      expect(result.current.canAnnotate).toBe(true)
    })

    it('returns false when screen sharing is not active', () => {
      act(() => {
        useScreenShareStore.setState({
          isSharing: false,
        })
      })

      const { result } = renderHook(() => useAnnotations())
      expect(result.current.canAnnotate).toBe(false)
    })

    it('returns false when user role is viewer', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'participant-123',
            name: 'Test User',
            role: 'viewer',
            color: PARTICIPANT_COLORS[0],
            isLocal: true,
          },
        })
      })

      const { result } = renderHook(() => useAnnotations())
      expect(result.current.canAnnotate).toBe(false)
    })

    it('returns false when no local participant', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: null,
        })
      })

      const { result } = renderHook(() => useAnnotations())
      expect(result.current.canAnnotate).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────
  // startStroke TESTS (AC-4.3.6)
  // ─────────────────────────────────────────────────────────

  describe('startStroke', () => {
    it('creates new stroke with correct structure (AC-4.3.6)', () => {
      const { result } = renderHook(() => useAnnotations())
      const point: Point = { x: 0.5, y: 0.5, pressure: 0.5 }

      act(() => {
        result.current.startStroke(point)
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke).not.toBeNull()
      expect(activeStroke?.id).toBe(mockUUID)
      expect(activeStroke?.participantId).toBe('participant-123')
      expect(activeStroke?.tool).toBe('pen')
      expect(activeStroke?.color).toBe(PARTICIPANT_COLORS[0])
      expect(activeStroke?.points).toHaveLength(1)
      expect(activeStroke?.points[0]).toEqual(point)
      expect(activeStroke?.isComplete).toBe(false)
      expect(activeStroke?.createdAt).toBeDefined()
    })

    it('uses participant color from metadata (AC-4.3.3)', () => {
      const customColor = '#00ff00'
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'participant-123',
            name: 'Test User',
            role: 'annotator',
            color: customColor,
            isLocal: true,
          },
        })
      })

      const { result } = renderHook(() => useAnnotations())
      const point: Point = { x: 0.5, y: 0.5 }

      act(() => {
        result.current.startStroke(point)
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke?.color).toBe(customColor)
    })

    it('generates unique stroke ID using crypto.randomUUID', () => {
      const { result } = renderHook(() => useAnnotations())
      const point: Point = { x: 0.5, y: 0.5 }

      act(() => {
        result.current.startStroke(point)
      })

      expect(crypto.randomUUID).toHaveBeenCalled()
      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke?.id).toBe(mockUUID)
    })

    it('does not create stroke when canAnnotate is false', () => {
      act(() => {
        useScreenShareStore.setState({ isSharing: false })
      })

      const { result } = renderHook(() => useAnnotations())
      const point: Point = { x: 0.5, y: 0.5 }

      act(() => {
        result.current.startStroke(point)
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke).toBeNull()
    })

    it('does not create stroke when activeTool is eraser', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('eraser')
      })

      const { result } = renderHook(() => useAnnotations())
      const point: Point = { x: 0.5, y: 0.5 }

      act(() => {
        result.current.startStroke(point)
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke).toBeNull()
    })

    it('creates stroke with highlighter tool when active', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      const { result } = renderHook(() => useAnnotations())
      const point: Point = { x: 0.5, y: 0.5 }

      act(() => {
        result.current.startStroke(point)
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke?.tool).toBe('highlighter')
    })
  })

  // ─────────────────────────────────────────────────────────
  // continueStroke TESTS (AC-4.3.7)
  // ─────────────────────────────────────────────────────────

  describe('continueStroke', () => {
    it('appends point to activeStroke (AC-4.3.7)', () => {
      const { result } = renderHook(() => useAnnotations())
      const startPoint: Point = { x: 0.1, y: 0.1 }
      const movePoint: Point = { x: 0.2, y: 0.2 }

      act(() => {
        result.current.startStroke(startPoint)
      })

      act(() => {
        result.current.continueStroke(movePoint)
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke?.points).toHaveLength(2)
      expect(activeStroke?.points[0]).toEqual(startPoint)
      expect(activeStroke?.points[1]).toEqual(movePoint)
    })

    it('does nothing when no active stroke', () => {
      const { result } = renderHook(() => useAnnotations())
      const point: Point = { x: 0.5, y: 0.5 }

      // Don't start a stroke first
      act(() => {
        result.current.continueStroke(point)
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke).toBeNull()
    })

    it('appends multiple points during drag', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
      })

      act(() => {
        result.current.continueStroke({ x: 0.2, y: 0.2 })
        result.current.continueStroke({ x: 0.3, y: 0.3 })
        result.current.continueStroke({ x: 0.4, y: 0.4 })
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke?.points).toHaveLength(4)
    })
  })

  // ─────────────────────────────────────────────────────────
  // endStroke TESTS (AC-4.3.8)
  // ─────────────────────────────────────────────────────────

  describe('endStroke', () => {
    it('completes stroke and moves to strokes array (AC-4.3.8)', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
        result.current.continueStroke({ x: 0.2, y: 0.2 })
      })

      act(() => {
        result.current.endStroke()
      })

      const state = useAnnotationStore.getState()
      expect(state.activeStroke).toBeNull()
      expect(state.strokes).toHaveLength(1)
      expect(state.strokes[0].isComplete).toBe(true)
    })

    it('clears activeStroke after completion', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
      })

      act(() => {
        result.current.endStroke()
      })

      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke).toBeNull()
    })

    it('saves stroke with single point', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.startStroke({ x: 0.5, y: 0.5 })
      })

      act(() => {
        result.current.endStroke()
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(1)
      expect(strokes[0].points).toHaveLength(1)
    })

    it('does nothing when no active stroke', () => {
      const { result } = renderHook(() => useAnnotations())

      // Don't start a stroke
      act(() => {
        result.current.endStroke()
      })

      const state = useAnnotationStore.getState()
      expect(state.activeStroke).toBeNull()
      expect(state.strokes).toHaveLength(0)
    })
  })

  // ─────────────────────────────────────────────────────────
  // setTool TESTS (AC-4.3.10)
  // ─────────────────────────────────────────────────────────

  describe('setTool', () => {
    it('updates activeTool in store', () => {
      const { result } = renderHook(() => useAnnotations())

      act(() => {
        result.current.setTool('highlighter')
      })

      expect(result.current.activeTool).toBe('highlighter')
      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('supports all tool types', () => {
      const { result } = renderHook(() => useAnnotations())

      const tools: Array<'pen' | 'highlighter' | 'eraser' | 'select'> = [
        'pen',
        'highlighter',
        'eraser',
        'select',
      ]

      for (const tool of tools) {
        act(() => {
          result.current.setTool(tool)
        })
        expect(result.current.activeTool).toBe(tool)
      }
    })
  })

  // ─────────────────────────────────────────────────────────
  // INTEGRATION TESTS
  // ─────────────────────────────────────────────────────────

  describe('integration', () => {
    it('complete drawing flow: start -> continue -> end', () => {
      const { result } = renderHook(() => useAnnotations())

      // Start stroke
      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
      })
      expect(result.current.activeStroke).not.toBeNull()
      expect(result.current.strokes).toHaveLength(0)

      // Continue drawing
      act(() => {
        result.current.continueStroke({ x: 0.2, y: 0.2 })
        result.current.continueStroke({ x: 0.3, y: 0.3 })
      })
      expect(result.current.activeStroke?.points).toHaveLength(3)

      // End stroke
      act(() => {
        result.current.endStroke()
      })
      expect(result.current.activeStroke).toBeNull()
      expect(result.current.strokes).toHaveLength(1)
      expect(result.current.strokes[0].isComplete).toBe(true)
    })

    it('multiple strokes can be drawn consecutively', () => {
      const { result } = renderHook(() => useAnnotations())

      // Draw first stroke
      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
        result.current.endStroke()
      })

      // Draw second stroke
      act(() => {
        result.current.startStroke({ x: 0.5, y: 0.5 })
        result.current.endStroke()
      })

      expect(result.current.strokes).toHaveLength(2)
    })
  })

  // ─────────────────────────────────────────────────────────
  // HIGHLIGHTER INTEGRATION TESTS (AC-4.4 - all)
  // ─────────────────────────────────────────────────────────

  describe('highlighter integration (AC-4.4)', () => {
    it('complete highlighter flow: select tool -> draw stroke -> verify properties', () => {
      const { result } = renderHook(() => useAnnotations())

      // Start with pen (default)
      expect(result.current.activeTool).toBe('pen')

      // Switch to highlighter
      act(() => {
        result.current.setTool('highlighter')
      })
      expect(result.current.activeTool).toBe('highlighter')

      // Draw a highlighter stroke
      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
      })

      // Verify active stroke has highlighter tool
      expect(result.current.activeStroke?.tool).toBe('highlighter')

      act(() => {
        result.current.continueStroke({ x: 0.5, y: 0.5 })
        result.current.endStroke()
      })

      // Verify completed stroke has highlighter tool
      expect(result.current.strokes).toHaveLength(1)
      expect(result.current.strokes[0].tool).toBe('highlighter')
      expect(result.current.strokes[0].isComplete).toBe(true)
    })

    it('switching between pen and highlighter preserves correct tool metadata on strokes', () => {
      const { result } = renderHook(() => useAnnotations())

      // Draw a pen stroke (pen is default, so no need to set)
      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
        result.current.endStroke()
      })

      // Switch to highlighter
      act(() => {
        result.current.setTool('highlighter')
      })

      // Draw a highlighter stroke
      act(() => {
        result.current.startStroke({ x: 0.3, y: 0.3 })
        result.current.endStroke()
      })

      // Switch back to pen
      act(() => {
        result.current.setTool('pen')
      })

      // Draw another pen stroke
      act(() => {
        result.current.startStroke({ x: 0.5, y: 0.5 })
        result.current.endStroke()
      })

      // Switch back to highlighter
      act(() => {
        result.current.setTool('highlighter')
      })

      // Draw another highlighter stroke
      act(() => {
        result.current.startStroke({ x: 0.7, y: 0.7 })
        result.current.endStroke()
      })

      // Verify each stroke has correct tool
      expect(result.current.strokes).toHaveLength(4)
      expect(result.current.strokes[0].tool).toBe('pen')
      expect(result.current.strokes[1].tool).toBe('highlighter')
      expect(result.current.strokes[2].tool).toBe('pen')
      expect(result.current.strokes[3].tool).toBe('highlighter')
    })

    it('existing pen strokes remain unchanged when adding highlighter strokes', () => {
      const { result } = renderHook(() => useAnnotations())

      // Draw multiple pen strokes (pen is default)
      act(() => {
        result.current.startStroke({ x: 0.1, y: 0.1 })
        result.current.continueStroke({ x: 0.2, y: 0.2 })
        result.current.endStroke()

        result.current.startStroke({ x: 0.3, y: 0.3 })
        result.current.continueStroke({ x: 0.4, y: 0.4 })
        result.current.endStroke()
      })

      // Capture pen stroke state
      const penStroke1 = { ...result.current.strokes[0] }
      const penStroke2 = { ...result.current.strokes[1] }

      // Switch to highlighter
      act(() => {
        result.current.setTool('highlighter')
      })

      // Draw a highlighter stroke
      act(() => {
        result.current.startStroke({ x: 0.5, y: 0.5 })
        result.current.continueStroke({ x: 0.6, y: 0.6 })
        result.current.endStroke()
      })

      // Verify pen strokes are unchanged
      expect(result.current.strokes[0].id).toBe(penStroke1.id)
      expect(result.current.strokes[0].tool).toBe('pen')
      expect(result.current.strokes[0].points).toHaveLength(penStroke1.points.length)

      expect(result.current.strokes[1].id).toBe(penStroke2.id)
      expect(result.current.strokes[1].tool).toBe('pen')
      expect(result.current.strokes[1].points).toHaveLength(penStroke2.points.length)

      // Verify highlighter stroke was added correctly
      expect(result.current.strokes[2].tool).toBe('highlighter')
    })

    it('highlighter stroke uses participant color (AC-4.4.4)', () => {
      const customColor = '#ff6600'
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'participant-123',
            name: 'Test User',
            role: 'annotator',
            color: customColor,
            isLocal: true,
          },
        })
      })

      const { result } = renderHook(() => useAnnotations())

      // Switch to highlighter
      act(() => {
        result.current.setTool('highlighter')
      })

      // Draw a highlighter stroke
      act(() => {
        result.current.startStroke({ x: 0.5, y: 0.5 })
        result.current.endStroke()
      })

      // Verify stroke uses participant color
      expect(result.current.strokes[0].tool).toBe('highlighter')
      expect(result.current.strokes[0].color).toBe(customColor)
    })
  })
})
