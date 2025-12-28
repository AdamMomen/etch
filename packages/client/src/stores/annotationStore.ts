import { create } from 'zustand'
import type { Stroke, Point } from '@etch/shared'

/**
 * Tool type for annotation drawing.
 * - select: Selection mode (no drawing)
 * - pen: Precise drawing tool (default)
 * - highlighter: Semi-transparent emphasis tool
 * - eraser: Remove strokes
 */
export type Tool = 'select' | 'pen' | 'highlighter' | 'eraser'

/**
 * Annotation store state and actions interface.
 * Central state management for all annotation-related data.
 */
export interface AnnotationState {
  // ─────────────────────────────────────────────────────────
  // STATE FIELDS
  // ─────────────────────────────────────────────────────────

  /** Array of completed strokes (isComplete: true) */
  strokes: Stroke[]

  /** Currently in-progress stroke (mouse is down, drawing) */
  activeStroke: Stroke | null

  /** Currently selected tool */
  activeTool: Tool

  /** In-progress strokes from remote participants (Story 4.7) */
  remoteActiveStrokes: Map<string, Stroke>

  // ─────────────────────────────────────────────────────────
  // STROKE ACTIONS
  // ─────────────────────────────────────────────────────────

  /** Add a new stroke to the strokes array */
  addStroke: (stroke: Stroke) => void

  /** Append points to an existing stroke (for remote updates) */
  updateStroke: (strokeId: string, points: Point[]) => void

  /** Mark a stroke as complete (isComplete: true) */
  completeStroke: (strokeId: string) => void

  /** Remove a stroke by ID (eraser tool) */
  deleteStroke: (strokeId: string) => void

  /** Clear all strokes (host only, via clear button) */
  clearAll: () => void

  /** Clear strokes by a specific participant (clear my drawings) */
  clearByParticipant: (participantId: string) => void

  // ─────────────────────────────────────────────────────────
  // TOOL ACTIONS
  // ─────────────────────────────────────────────────────────

  /** Set the currently active tool */
  setActiveTool: (tool: Tool) => void

  // ─────────────────────────────────────────────────────────
  // ACTIVE STROKE ACTIONS
  // ─────────────────────────────────────────────────────────

  /** Set or clear the active (in-progress) stroke */
  setActiveStroke: (stroke: Stroke | null) => void

  // ─────────────────────────────────────────────────────────
  // REMOTE ACTIVE STROKE ACTIONS (Story 4.7 - DataTrack sync)
  // ─────────────────────────────────────────────────────────

  /** Add a new in-progress stroke from a remote participant */
  addRemoteActiveStroke: (stroke: Stroke) => void

  /** Append points to a remote in-progress stroke */
  updateRemoteActiveStroke: (strokeId: string, points: Point[]) => void

  /** Move a remote stroke from active to completed */
  completeRemoteActiveStroke: (strokeId: string) => void

  // ─────────────────────────────────────────────────────────
  // BULK OPERATIONS (late-joiner sync)
  // ─────────────────────────────────────────────────────────

  /** Replace all strokes (for late-joiner state snapshot) */
  setStrokes: (strokes: Stroke[]) => void

  // ─────────────────────────────────────────────────────────
  // SELECTORS (derived state)
  // ─────────────────────────────────────────────────────────

  /** Get strokes filtered by participant ID */
  getStrokesByParticipant: (participantId: string) => Stroke[]

  /** Get only completed strokes (isComplete: true) */
  getCompletedStrokes: () => Stroke[]
}

/**
 * Initial state for the annotation store.
 * Used for initialization and reset operations.
 */
const initialState = {
  strokes: [] as Stroke[],
  activeStroke: null as Stroke | null,
  activeTool: 'pen' as Tool, // Default to pen tool per AC-4.3.9
  remoteActiveStrokes: new Map<string, Stroke>(), // Story 4.7
}

/**
 * Annotation store for managing stroke state.
 *
 * This store is the foundation for Epic 4 (Real-Time Annotations).
 * It manages:
 * - Completed strokes array
 * - Active (in-progress) stroke
 * - Currently selected tool
 *
 * Per ADR-004: Zustand over Redux for lightweight state management.
 *
 * @example
 * ```tsx
 * // Subscribe to strokes in a component
 * const strokes = useAnnotationStore((state) => state.strokes)
 *
 * // Add a new stroke
 * useAnnotationStore.getState().addStroke(newStroke)
 * ```
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  ...initialState,

  // ─────────────────────────────────────────────────────────
  // STROKE ACTIONS
  // ─────────────────────────────────────────────────────────

  addStroke: (stroke) =>
    set((state) => ({
      strokes: [...state.strokes, stroke],
    })),

  updateStroke: (strokeId, points) =>
    set((state) => ({
      strokes: state.strokes.map((stroke) =>
        stroke.id === strokeId
          ? { ...stroke, points: [...stroke.points, ...points] }
          : stroke
      ),
    })),

  completeStroke: (strokeId) =>
    set((state) => ({
      strokes: state.strokes.map((stroke) =>
        stroke.id === strokeId ? { ...stroke, isComplete: true } : stroke
      ),
    })),

  deleteStroke: (strokeId) =>
    set((state) => ({
      strokes: state.strokes.filter((stroke) => stroke.id !== strokeId),
    })),

  clearAll: () =>
    set({
      strokes: [],
      activeStroke: null,
      remoteActiveStrokes: new Map(),
    }),

  clearByParticipant: (participantId) =>
    set((state) => ({
      strokes: state.strokes.filter((stroke) => stroke.participantId !== participantId),
    })),

  // ─────────────────────────────────────────────────────────
  // TOOL ACTIONS
  // ─────────────────────────────────────────────────────────

  setActiveTool: (tool) => set({ activeTool: tool }),

  // ─────────────────────────────────────────────────────────
  // ACTIVE STROKE ACTIONS
  // ─────────────────────────────────────────────────────────

  setActiveStroke: (stroke) => set({ activeStroke: stroke }),

  // ─────────────────────────────────────────────────────────
  // REMOTE ACTIVE STROKE ACTIONS (Story 4.7 - DataTrack sync)
  // ─────────────────────────────────────────────────────────

  addRemoteActiveStroke: (stroke) =>
    set((state) => {
      const newMap = new Map(state.remoteActiveStrokes)
      newMap.set(stroke.id, stroke)
      return { remoteActiveStrokes: newMap }
    }),

  updateRemoteActiveStroke: (strokeId, points) =>
    set((state) => {
      const existing = state.remoteActiveStrokes.get(strokeId)
      if (!existing) return state

      const newMap = new Map(state.remoteActiveStrokes)
      newMap.set(strokeId, {
        ...existing,
        points: [...existing.points, ...points],
      })
      return { remoteActiveStrokes: newMap }
    }),

  completeRemoteActiveStroke: (strokeId) =>
    set((state) => {
      const newMap = new Map(state.remoteActiveStrokes)
      newMap.delete(strokeId)
      return { remoteActiveStrokes: newMap }
    }),

  // ─────────────────────────────────────────────────────────
  // BULK OPERATIONS (late-joiner sync)
  // ─────────────────────────────────────────────────────────

  setStrokes: (strokes) => set({ strokes }),

  // ─────────────────────────────────────────────────────────
  // SELECTORS (derived state using get())
  // ─────────────────────────────────────────────────────────

  getStrokesByParticipant: (participantId) =>
    get().strokes.filter((stroke) => stroke.participantId === participantId),

  getCompletedStrokes: () =>
    get().strokes.filter((stroke) => stroke.isComplete),
}))
