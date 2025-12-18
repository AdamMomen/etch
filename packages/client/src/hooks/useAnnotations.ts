import { useCallback, useRef, useState } from 'react'
import { useAnnotationStore, type Tool } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import { useScreenShareStore } from '@/stores/screenShareStore'
import { findTopmostStrokeAtPoint } from '@/lib/canvas'
import { PARTICIPANT_COLORS } from '@nameless/shared'
import type { Point, Stroke } from '@nameless/shared'

/**
 * Hook for managing annotation drawing operations.
 * Connects pointer events to the annotation store and handles
 * stroke creation, continuation, completion, and erasing.
 *
 * Per architecture spec:
 * - Local-first rendering: stroke appears immediately, then syncs via DataTrack (Story 4.7)
 * - Uses annotationStore from Story 4.2 for all state management
 * - Coordinates stored as normalized [0,1] values
 * - Eraser uses hit-testing to find and delete strokes (Story 4.5)
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useAnnotations() {
  // Track if we're currently drawing
  const isDrawingRef = useRef(false)

  // Eraser hover state - stores ID of stroke under cursor (AC-4.5.6)
  const [hoveredStrokeId, setHoveredStrokeId] = useState<string | null>(null)

  // Store state subscriptions
  const strokes = useAnnotationStore((state) => state.strokes)
  const activeStroke = useAnnotationStore((state) => state.activeStroke)
  const activeTool = useAnnotationStore((state) => state.activeTool)

  // Store actions
  const setActiveStroke = useAnnotationStore((state) => state.setActiveStroke)
  const addStroke = useAnnotationStore((state) => state.addStroke)
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)
  const deleteStroke = useAnnotationStore((state) => state.deleteStroke)

  // Get local participant info
  const localParticipant = useRoomStore((state) => state.localParticipant)

  // Get screen share state
  const isSharing = useScreenShareStore((state) => state.isSharing)

  // Derive participant color and ID
  const myParticipantId = localParticipant?.id ?? ''
  const myColor = localParticipant?.color ?? PARTICIPANT_COLORS[0]

  // Determine if local user can annotate
  // Can annotate if: screen is being shared AND user has annotator/host/sharer role
  const role = localParticipant?.role
  const canAnnotate =
    isSharing &&
    (role === 'annotator' || role === 'host' || role === 'sharer')

  /**
   * Generates a unique stroke ID using crypto.randomUUID().
   */
  const generateStrokeId = useCallback((): string => {
    return crypto.randomUUID()
  }, [])

  /**
   * Starts a new stroke at the given point.
   * Creates a new Stroke object with unique ID, participant info, and initial point.
   *
   * @param point - The starting point (normalized coordinates)
   */
  const startStroke = useCallback(
    (point: Point): void => {
      // Don't start if can't annotate or tool is not pen/highlighter
      if (!canAnnotate || (activeTool !== 'pen' && activeTool !== 'highlighter')) {
        return
      }

      // Create new stroke
      const newStroke: Stroke = {
        id: generateStrokeId(),
        participantId: myParticipantId,
        tool: activeTool as 'pen' | 'highlighter',
        color: myColor,
        points: [point],
        createdAt: Date.now(),
        isComplete: false,
      }

      // Set as active stroke in store
      setActiveStroke(newStroke)
      isDrawingRef.current = true
    },
    [
      canAnnotate,
      activeTool,
      myParticipantId,
      myColor,
      generateStrokeId,
      setActiveStroke,
    ]
  )

  /**
   * Continues the current stroke by appending a new point.
   * Only works if there's an active stroke being drawn.
   *
   * @param point - The new point to add (normalized coordinates)
   */
  const continueStroke = useCallback(
    (point: Point): void => {
      if (!isDrawingRef.current) return

      const currentStroke = useAnnotationStore.getState().activeStroke
      if (!currentStroke) return

      // Create updated stroke with new point
      const updatedStroke: Stroke = {
        ...currentStroke,
        points: [...currentStroke.points, point],
      }

      // Update active stroke
      setActiveStroke(updatedStroke)
    },
    [setActiveStroke]
  )

  /**
   * Ends the current stroke, marking it as complete and moving it to the strokes array.
   */
  const endStroke = useCallback((): void => {
    if (!isDrawingRef.current) return

    const currentStroke = useAnnotationStore.getState().activeStroke
    if (!currentStroke) {
      isDrawingRef.current = false
      return
    }

    // Only save strokes with at least 2 points (to form a line)
    if (currentStroke.points.length >= 1) {
      // Mark as complete and add to strokes
      const completedStroke: Stroke = {
        ...currentStroke,
        isComplete: true,
      }

      addStroke(completedStroke)
    }

    // Clear active stroke
    setActiveStroke(null)
    isDrawingRef.current = false
  }, [addStroke, setActiveStroke])

  /**
   * Sets the active drawing tool.
   *
   * @param tool - The tool to activate
   */
  const setTool = useCallback(
    (tool: Tool): void => {
      setActiveTool(tool)
    },
    [setActiveTool]
  )

  // ─────────────────────────────────────────────────────────
  // ERASER FUNCTIONS (Story 4.5)
  // ─────────────────────────────────────────────────────────

  /**
   * Checks if the local user can erase a specific stroke.
   *
   * Permission rules (AC-4.5.5):
   * - Host: Can erase any stroke
   * - Sharer: Can erase any stroke (on their shared screen)
   * - Annotator: Can only erase their own strokes
   *
   * @param stroke - The stroke to check
   * @returns True if user can erase this stroke
   */
  const canEraseStroke = useCallback(
    (stroke: Stroke): boolean => {
      if (!canAnnotate) return false

      // Host and sharer can erase any stroke
      if (role === 'host' || role === 'sharer') {
        return true
      }

      // Annotators can only erase their own strokes
      return stroke.participantId === myParticipantId
    },
    [canAnnotate, role, myParticipantId]
  )

  /**
   * Updates the hovered stroke based on cursor position.
   * Used for visual feedback when eraser tool is active.
   *
   * @param point - Current cursor position (normalized coordinates)
   */
  const updateHoveredStroke = useCallback(
    (point: Point): void => {
      if (activeTool !== 'eraser') {
        if (hoveredStrokeId !== null) {
          setHoveredStrokeId(null)
        }
        return
      }

      const currentStrokes = useAnnotationStore.getState().strokes
      const topStroke = findTopmostStrokeAtPoint(point, currentStrokes)

      // Only highlight if user can erase this stroke
      if (topStroke && canEraseStroke(topStroke)) {
        if (hoveredStrokeId !== topStroke.id) {
          setHoveredStrokeId(topStroke.id)
        }
      } else {
        if (hoveredStrokeId !== null) {
          setHoveredStrokeId(null)
        }
      }
    },
    [activeTool, hoveredStrokeId, canEraseStroke]
  )

  /**
   * Clears the hovered stroke state.
   * Called when pointer leaves the canvas or when not using eraser.
   */
  const clearHoveredStroke = useCallback((): void => {
    if (hoveredStrokeId !== null) {
      setHoveredStrokeId(null)
    }
  }, [hoveredStrokeId])

  /**
   * Erases the topmost stroke at the given point.
   * Checks permissions and removes from store if allowed.
   *
   * @param point - Point to check for strokes (normalized coordinates)
   * @returns True if a stroke was erased
   */
  const eraseStrokeAt = useCallback(
    (point: Point): boolean => {
      if (!canAnnotate || activeTool !== 'eraser') {
        return false
      }

      const currentStrokes = useAnnotationStore.getState().strokes
      const topStroke = findTopmostStrokeAtPoint(point, currentStrokes)

      if (!topStroke) {
        return false
      }

      // Check permissions before erasing
      if (!canEraseStroke(topStroke)) {
        return false
      }

      // Delete the stroke
      deleteStroke(topStroke.id)

      // Clear hover state if we just deleted the hovered stroke
      if (hoveredStrokeId === topStroke.id) {
        setHoveredStrokeId(null)
      }

      return true
    },
    [canAnnotate, activeTool, canEraseStroke, deleteStroke, hoveredStrokeId]
  )

  return {
    // State
    strokes,
    activeStroke,
    activeTool,
    canAnnotate,
    myColor,
    myParticipantId,
    hoveredStrokeId,

    // Drawing Actions
    startStroke,
    continueStroke,
    endStroke,
    setTool,

    // Eraser Actions (Story 4.5)
    eraseStrokeAt,
    updateHoveredStroke,
    clearHoveredStroke,
    canEraseStroke,
  }
}
