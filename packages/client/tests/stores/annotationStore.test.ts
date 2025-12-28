import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAnnotationStore, type Tool } from '@/stores/annotationStore'
import type { Stroke, Point } from '@etch/shared'

// ─────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Factory function to create a mock Point with normalized coordinates.
 */
const createMockPoint = (overrides?: Partial<Point>): Point => ({
  x: 0.5,
  y: 0.5,
  pressure: 0.5,
  ...overrides,
})

/**
 * Factory function to create a mock Stroke.
 */
let strokeIdCounter = 0
const createMockStroke = (overrides?: Partial<Stroke>): Stroke => ({
  id: `stroke-${++strokeIdCounter}`,
  participantId: 'participant-1',
  tool: 'pen',
  color: '#f97316',
  points: [createMockPoint()],
  createdAt: Date.now(),
  isComplete: false,
  ...overrides,
})

// ─────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────

describe('annotationStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    strokeIdCounter = 0
    act(() => {
      useAnnotationStore.setState({
        strokes: [],
        activeStroke: null,
        activeTool: 'pen',
      })
    })
  })

  // ─────────────────────────────────────────────────────────
  // INITIAL STATE TESTS (AC-4.2.1, AC-4.2.2, AC-4.2.3)
  // ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has empty strokes array', () => {
      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toEqual([])
      expect(Array.isArray(strokes)).toBe(true)
    })

    it('has null activeStroke', () => {
      const { activeStroke } = useAnnotationStore.getState()
      expect(activeStroke).toBeNull()
    })

    it('has pen as default activeTool', () => {
      const { activeTool } = useAnnotationStore.getState()
      expect(activeTool).toBe('pen')
    })
  })

  // ─────────────────────────────────────────────────────────
  // addStroke TESTS (AC-4.2.4)
  // ─────────────────────────────────────────────────────────

  describe('addStroke', () => {
    it('adds stroke to strokes array', () => {
      const stroke = createMockStroke()

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(1)
      expect(strokes[0]).toEqual(stroke)
    })

    it('adds multiple strokes', () => {
      const stroke1 = createMockStroke()
      const stroke2 = createMockStroke({ participantId: 'participant-2' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(2)
    })

    it('preserves stroke order (FIFO)', () => {
      const stroke1 = createMockStroke({ id: 'first' })
      const stroke2 = createMockStroke({ id: 'second' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].id).toBe('first')
      expect(strokes[1].id).toBe('second')
    })

    it('allows adding stroke with same ID (does not dedupe)', () => {
      const stroke = createMockStroke({ id: 'duplicate-id' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
        useAnnotationStore.getState().addStroke(stroke)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(2)
    })
  })

  // ─────────────────────────────────────────────────────────
  // updateStroke TESTS (AC-4.2.5)
  // ─────────────────────────────────────────────────────────

  describe('updateStroke', () => {
    it('appends points to existing stroke', () => {
      const stroke = createMockStroke({
        id: 'stroke-to-update',
        points: [createMockPoint({ x: 0.1, y: 0.1 })],
      })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      const newPoints = [
        createMockPoint({ x: 0.2, y: 0.2 }),
        createMockPoint({ x: 0.3, y: 0.3 }),
      ]

      act(() => {
        useAnnotationStore
          .getState()
          .updateStroke('stroke-to-update', newPoints)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].points).toHaveLength(3)
      expect(strokes[0].points[0].x).toBe(0.1)
      expect(strokes[0].points[1].x).toBe(0.2)
      expect(strokes[0].points[2].x).toBe(0.3)
    })

    it('does not modify other strokes', () => {
      const stroke1 = createMockStroke({
        id: 'stroke-1',
        points: [createMockPoint()],
      })
      const stroke2 = createMockStroke({
        id: 'stroke-2',
        points: [createMockPoint()],
      })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
      })

      act(() => {
        useAnnotationStore
          .getState()
          .updateStroke('stroke-1', [createMockPoint()])
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].points).toHaveLength(2) // Updated
      expect(strokes[1].points).toHaveLength(1) // Unchanged
    })

    it('handles non-existent stroke gracefully', () => {
      const stroke = createMockStroke({ id: 'existing' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      // This should not throw
      act(() => {
        useAnnotationStore
          .getState()
          .updateStroke('non-existent', [createMockPoint()])
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(1)
      expect(strokes[0].points).toHaveLength(1) // Unchanged
    })
  })

  // ─────────────────────────────────────────────────────────
  // completeStroke TESTS (AC-4.2.6)
  // ─────────────────────────────────────────────────────────

  describe('completeStroke', () => {
    it('sets isComplete to true for specified stroke', () => {
      const stroke = createMockStroke({
        id: 'stroke-to-complete',
        isComplete: false,
      })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      act(() => {
        useAnnotationStore.getState().completeStroke('stroke-to-complete')
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].isComplete).toBe(true)
    })

    it('does not modify other strokes', () => {
      const stroke1 = createMockStroke({ id: 'stroke-1', isComplete: false })
      const stroke2 = createMockStroke({ id: 'stroke-2', isComplete: false })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
      })

      act(() => {
        useAnnotationStore.getState().completeStroke('stroke-1')
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].isComplete).toBe(true)
      expect(strokes[1].isComplete).toBe(false)
    })

    it('handles non-existent stroke gracefully', () => {
      const stroke = createMockStroke({ id: 'existing', isComplete: false })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      // This should not throw
      act(() => {
        useAnnotationStore.getState().completeStroke('non-existent')
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].isComplete).toBe(false) // Unchanged
    })
  })

  // ─────────────────────────────────────────────────────────
  // deleteStroke TESTS (AC-4.2.7)
  // ─────────────────────────────────────────────────────────

  describe('deleteStroke', () => {
    it('removes stroke by ID', () => {
      const stroke1 = createMockStroke({ id: 'stroke-1' })
      const stroke2 = createMockStroke({ id: 'stroke-2' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
      })

      act(() => {
        useAnnotationStore.getState().deleteStroke('stroke-1')
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(1)
      expect(strokes[0].id).toBe('stroke-2')
    })

    it('handles non-existent stroke gracefully', () => {
      const stroke = createMockStroke({ id: 'existing' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      // This should not throw
      act(() => {
        useAnnotationStore.getState().deleteStroke('non-existent')
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(1)
    })

    it('empties array when deleting last stroke', () => {
      const stroke = createMockStroke({ id: 'only-stroke' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      act(() => {
        useAnnotationStore.getState().deleteStroke('only-stroke')
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(0)
    })
  })

  // ─────────────────────────────────────────────────────────
  // clearAll TESTS (AC-4.2.8)
  // ─────────────────────────────────────────────────────────

  describe('clearAll', () => {
    it('empties strokes array', () => {
      act(() => {
        useAnnotationStore.getState().addStroke(createMockStroke())
        useAnnotationStore.getState().addStroke(createMockStroke())
        useAnnotationStore.getState().addStroke(createMockStroke())
      })

      act(() => {
        useAnnotationStore.getState().clearAll()
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(0)
    })

    it('clears activeStroke', () => {
      const activeStroke = createMockStroke()

      act(() => {
        useAnnotationStore.getState().setActiveStroke(activeStroke)
      })

      act(() => {
        useAnnotationStore.getState().clearAll()
      })

      expect(useAnnotationStore.getState().activeStroke).toBeNull()
    })

    it('preserves activeTool (does not reset to pen)', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
        useAnnotationStore.getState().addStroke(createMockStroke())
      })

      act(() => {
        useAnnotationStore.getState().clearAll()
      })

      // activeTool should remain as highlighter
      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('handles empty strokes array', () => {
      // This should not throw
      act(() => {
        useAnnotationStore.getState().clearAll()
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(0)
    })
  })

  // ─────────────────────────────────────────────────────────
  // setActiveTool TESTS (AC-4.2.9)
  // ─────────────────────────────────────────────────────────

  describe('setActiveTool', () => {
    it('updates activeTool to pen', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('select')
        useAnnotationStore.getState().setActiveTool('pen')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })

    it('updates activeTool to highlighter', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('updates activeTool to eraser', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('eraser')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('eraser')
    })

    it('updates activeTool to select', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('select')
      })

      expect(useAnnotationStore.getState().activeTool).toBe('select')
    })

    it('supports all Tool types', () => {
      const tools: Tool[] = ['select', 'pen', 'highlighter', 'eraser']

      for (const tool of tools) {
        act(() => {
          useAnnotationStore.getState().setActiveTool(tool)
        })
        expect(useAnnotationStore.getState().activeTool).toBe(tool)
      }
    })
  })

  // ─────────────────────────────────────────────────────────
  // TOOLBAR INTEGRATION (AC-4.4.6)
  // ─────────────────────────────────────────────────────────

  describe('toolbar integration (AC-4.4.6)', () => {
    it('activeTool state change to highlighter is observable', () => {
      // Start with pen (default)
      expect(useAnnotationStore.getState().activeTool).toBe('pen')

      // Change to highlighter
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      // State change should be immediately observable
      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('activeTool state changes trigger store updates', () => {
      const tools: Tool[] = ['pen', 'highlighter', 'pen', 'highlighter']

      for (const tool of tools) {
        act(() => {
          useAnnotationStore.getState().setActiveTool(tool)
        })
        expect(useAnnotationStore.getState().activeTool).toBe(tool)
      }
    })

    it('highlighter tool state persists correctly', () => {
      // Set highlighter
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      // Add a stroke (simulating drawing)
      const stroke = createMockStroke({ tool: 'highlighter' })
      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      // Tool should still be highlighter after adding stroke
      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
      expect(useAnnotationStore.getState().strokes[0].tool).toBe('highlighter')
    })
  })

  // ─────────────────────────────────────────────────────────
  // setActiveStroke TESTS (AC-4.2.10)
  // ─────────────────────────────────────────────────────────

  describe('setActiveStroke', () => {
    it('sets active stroke', () => {
      const stroke = createMockStroke()

      act(() => {
        useAnnotationStore.getState().setActiveStroke(stroke)
      })

      expect(useAnnotationStore.getState().activeStroke).toEqual(stroke)
    })

    it('clears active stroke with null', () => {
      const stroke = createMockStroke()

      act(() => {
        useAnnotationStore.getState().setActiveStroke(stroke)
      })

      act(() => {
        useAnnotationStore.getState().setActiveStroke(null)
      })

      expect(useAnnotationStore.getState().activeStroke).toBeNull()
    })

    it('replaces existing active stroke', () => {
      const stroke1 = createMockStroke({ id: 'stroke-1' })
      const stroke2 = createMockStroke({ id: 'stroke-2' })

      act(() => {
        useAnnotationStore.getState().setActiveStroke(stroke1)
      })

      act(() => {
        useAnnotationStore.getState().setActiveStroke(stroke2)
      })

      expect(useAnnotationStore.getState().activeStroke?.id).toBe('stroke-2')
    })
  })

  // ─────────────────────────────────────────────────────────
  // setStrokes TESTS (AC-4.2.11)
  // ─────────────────────────────────────────────────────────

  describe('setStrokes', () => {
    it('replaces all strokes (bulk update)', () => {
      // Add some initial strokes
      act(() => {
        useAnnotationStore
          .getState()
          .addStroke(createMockStroke({ id: 'old-1' }))
        useAnnotationStore
          .getState()
          .addStroke(createMockStroke({ id: 'old-2' }))
      })

      // Bulk replace
      const newStrokes = [
        createMockStroke({ id: 'new-1' }),
        createMockStroke({ id: 'new-2' }),
        createMockStroke({ id: 'new-3' }),
      ]

      act(() => {
        useAnnotationStore.getState().setStrokes(newStrokes)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes).toHaveLength(3)
      expect(strokes[0].id).toBe('new-1')
      expect(strokes[1].id).toBe('new-2')
      expect(strokes[2].id).toBe('new-3')
    })

    it('can set empty strokes array', () => {
      act(() => {
        useAnnotationStore.getState().addStroke(createMockStroke())
      })

      act(() => {
        useAnnotationStore.getState().setStrokes([])
      })

      expect(useAnnotationStore.getState().strokes).toHaveLength(0)
    })

    it('preserves activeStroke when setting strokes', () => {
      const activeStroke = createMockStroke({ id: 'active' })

      act(() => {
        useAnnotationStore.getState().setActiveStroke(activeStroke)
        useAnnotationStore.getState().setStrokes([createMockStroke()])
      })

      expect(useAnnotationStore.getState().activeStroke?.id).toBe('active')
    })
  })

  // ─────────────────────────────────────────────────────────
  // getStrokesByParticipant SELECTOR TESTS
  // ─────────────────────────────────────────────────────────

  describe('getStrokesByParticipant', () => {
    it('returns only strokes from specified participant', () => {
      const stroke1 = createMockStroke({ participantId: 'alice' })
      const stroke2 = createMockStroke({ participantId: 'bob' })
      const stroke3 = createMockStroke({ participantId: 'alice' })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
        useAnnotationStore.getState().addStroke(stroke3)
      })

      const aliceStrokes = useAnnotationStore
        .getState()
        .getStrokesByParticipant('alice')
      expect(aliceStrokes).toHaveLength(2)
      expect(aliceStrokes.every((s) => s.participantId === 'alice')).toBe(true)

      const bobStrokes = useAnnotationStore
        .getState()
        .getStrokesByParticipant('bob')
      expect(bobStrokes).toHaveLength(1)
      expect(bobStrokes[0].participantId).toBe('bob')
    })

    it('returns empty array for non-existent participant', () => {
      act(() => {
        useAnnotationStore
          .getState()
          .addStroke(createMockStroke({ participantId: 'alice' }))
      })

      const strokes = useAnnotationStore
        .getState()
        .getStrokesByParticipant('non-existent')
      expect(strokes).toEqual([])
    })

    it('returns empty array when strokes is empty', () => {
      const strokes = useAnnotationStore
        .getState()
        .getStrokesByParticipant('anyone')
      expect(strokes).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────
  // getCompletedStrokes SELECTOR TESTS
  // ─────────────────────────────────────────────────────────

  describe('getCompletedStrokes', () => {
    it('returns only strokes with isComplete: true', () => {
      const stroke1 = createMockStroke({ id: 's1', isComplete: true })
      const stroke2 = createMockStroke({ id: 's2', isComplete: false })
      const stroke3 = createMockStroke({ id: 's3', isComplete: true })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
        useAnnotationStore.getState().addStroke(stroke3)
      })

      const completed = useAnnotationStore.getState().getCompletedStrokes()
      expect(completed).toHaveLength(2)
      expect(completed.every((s) => s.isComplete)).toBe(true)
    })

    it('returns empty array when no strokes are complete', () => {
      act(() => {
        useAnnotationStore
          .getState()
          .addStroke(createMockStroke({ isComplete: false }))
        useAnnotationStore
          .getState()
          .addStroke(createMockStroke({ isComplete: false }))
      })

      const completed = useAnnotationStore.getState().getCompletedStrokes()
      expect(completed).toEqual([])
    })

    it('returns empty array when strokes is empty', () => {
      const completed = useAnnotationStore.getState().getCompletedStrokes()
      expect(completed).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────
  // NORMALIZED COORDINATES TESTS (AC-4.2.12)
  // ─────────────────────────────────────────────────────────

  describe('normalized coordinates', () => {
    it('stores strokes with normalized [0,1] coordinates', () => {
      const stroke = createMockStroke({
        points: [
          createMockPoint({ x: 0.0, y: 0.0 }),
          createMockPoint({ x: 0.5, y: 0.5 }),
          createMockPoint({ x: 1.0, y: 1.0 }),
        ],
      })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      const { strokes } = useAnnotationStore.getState()
      const points = strokes[0].points

      // All coordinates should be in [0, 1] range
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(1)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(1)
      }
    })

    it('preserves coordinate precision', () => {
      const stroke = createMockStroke({
        points: [createMockPoint({ x: 0.123456789, y: 0.987654321 })],
      })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].points[0].x).toBe(0.123456789)
      expect(strokes[0].points[0].y).toBe(0.987654321)
    })

    it('preserves pressure values', () => {
      const stroke = createMockStroke({
        points: [createMockPoint({ pressure: 0.75 })],
      })

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      const { strokes } = useAnnotationStore.getState()
      expect(strokes[0].points[0].pressure).toBe(0.75)
    })
  })

  // ─────────────────────────────────────────────────────────
  // REMOTE ACTIVE STROKES TESTS (Story 4.7)
  // ─────────────────────────────────────────────────────────

  describe('remoteActiveStrokes', () => {
    beforeEach(() => {
      act(() => {
        useAnnotationStore.setState({
          remoteActiveStrokes: new Map(),
        })
      })
    })

    describe('initial state', () => {
      it('has empty remoteActiveStrokes Map', () => {
        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes).toBeInstanceOf(Map)
        expect(remoteActiveStrokes.size).toBe(0)
      })
    })

    describe('addRemoteActiveStroke', () => {
      it('adds a remote in-progress stroke', () => {
        const stroke = createMockStroke({ id: 'remote-1', participantId: 'remote-user' })

        act(() => {
          useAnnotationStore.getState().addRemoteActiveStroke(stroke)
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.size).toBe(1)
        expect(remoteActiveStrokes.get('remote-1')).toEqual(stroke)
      })

      it('adds multiple remote strokes', () => {
        const stroke1 = createMockStroke({ id: 'remote-1', participantId: 'user-1' })
        const stroke2 = createMockStroke({ id: 'remote-2', participantId: 'user-2' })

        act(() => {
          useAnnotationStore.getState().addRemoteActiveStroke(stroke1)
          useAnnotationStore.getState().addRemoteActiveStroke(stroke2)
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.size).toBe(2)
      })

      it('replaces existing stroke with same ID', () => {
        const stroke1 = createMockStroke({ id: 'remote-1', color: '#ff0000' })
        const stroke2 = createMockStroke({ id: 'remote-1', color: '#00ff00' })

        act(() => {
          useAnnotationStore.getState().addRemoteActiveStroke(stroke1)
          useAnnotationStore.getState().addRemoteActiveStroke(stroke2)
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.size).toBe(1)
        expect(remoteActiveStrokes.get('remote-1')?.color).toBe('#00ff00')
      })
    })

    describe('updateRemoteActiveStroke', () => {
      it('appends points to existing remote stroke', () => {
        const stroke = createMockStroke({
          id: 'remote-1',
          points: [createMockPoint({ x: 0.1, y: 0.1 })],
        })

        act(() => {
          useAnnotationStore.getState().addRemoteActiveStroke(stroke)
        })

        const newPoints = [
          createMockPoint({ x: 0.2, y: 0.2 }),
          createMockPoint({ x: 0.3, y: 0.3 }),
        ]

        act(() => {
          useAnnotationStore.getState().updateRemoteActiveStroke('remote-1', newPoints)
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        const updated = remoteActiveStrokes.get('remote-1')
        expect(updated?.points).toHaveLength(3)
        expect(updated?.points[0].x).toBe(0.1)
        expect(updated?.points[1].x).toBe(0.2)
        expect(updated?.points[2].x).toBe(0.3)
      })

      it('does not modify other remote strokes', () => {
        const stroke1 = createMockStroke({
          id: 'remote-1',
          points: [createMockPoint()],
        })
        const stroke2 = createMockStroke({
          id: 'remote-2',
          points: [createMockPoint()],
        })

        act(() => {
          useAnnotationStore.getState().addRemoteActiveStroke(stroke1)
          useAnnotationStore.getState().addRemoteActiveStroke(stroke2)
        })

        act(() => {
          useAnnotationStore
            .getState()
            .updateRemoteActiveStroke('remote-1', [createMockPoint()])
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.get('remote-1')?.points).toHaveLength(2)
        expect(remoteActiveStrokes.get('remote-2')?.points).toHaveLength(1)
      })

      it('handles non-existent stroke gracefully', () => {
        act(() => {
          useAnnotationStore
            .getState()
            .updateRemoteActiveStroke('non-existent', [createMockPoint()])
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.size).toBe(0)
      })
    })

    describe('completeRemoteActiveStroke', () => {
      it('removes stroke from remoteActiveStrokes', () => {
        const stroke = createMockStroke({ id: 'remote-1' })

        act(() => {
          useAnnotationStore.getState().addRemoteActiveStroke(stroke)
        })

        act(() => {
          useAnnotationStore.getState().completeRemoteActiveStroke('remote-1')
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.size).toBe(0)
        expect(remoteActiveStrokes.has('remote-1')).toBe(false)
      })

      it('does not affect other remote strokes', () => {
        const stroke1 = createMockStroke({ id: 'remote-1' })
        const stroke2 = createMockStroke({ id: 'remote-2' })

        act(() => {
          useAnnotationStore.getState().addRemoteActiveStroke(stroke1)
          useAnnotationStore.getState().addRemoteActiveStroke(stroke2)
        })

        act(() => {
          useAnnotationStore.getState().completeRemoteActiveStroke('remote-1')
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.size).toBe(1)
        expect(remoteActiveStrokes.has('remote-2')).toBe(true)
      })

      it('handles non-existent stroke gracefully', () => {
        act(() => {
          useAnnotationStore.getState().completeRemoteActiveStroke('non-existent')
        })

        const { remoteActiveStrokes } = useAnnotationStore.getState()
        expect(remoteActiveStrokes.size).toBe(0)
      })
    })

    describe('clearAll clears remoteActiveStrokes', () => {
      it('clears remoteActiveStrokes along with other state', () => {
        act(() => {
          useAnnotationStore.getState().addStroke(createMockStroke())
          useAnnotationStore.getState().addRemoteActiveStroke(
            createMockStroke({ id: 'remote-1' })
          )
          useAnnotationStore.getState().addRemoteActiveStroke(
            createMockStroke({ id: 'remote-2' })
          )
        })

        act(() => {
          useAnnotationStore.getState().clearAll()
        })

        const state = useAnnotationStore.getState()
        expect(state.strokes).toHaveLength(0)
        expect(state.remoteActiveStrokes.size).toBe(0)
      })
    })
  })
})
