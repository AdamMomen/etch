import { useCallback, useRef } from 'react'
import { useAnnotationStore, type Tool } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import { useScreenShareStore } from '@/stores/screenShareStore'
import { PARTICIPANT_COLORS } from '@nameless/shared'
import type { Point, Stroke } from '@nameless/shared'

/**
 * Hook for managing annotation drawing operations.
 * Connects pointer events to the annotation store and handles
 * stroke creation, continuation, and completion.
 *
 * Per architecture spec:
 * - Local-first rendering: stroke appears immediately, then syncs via DataTrack (Story 4.7)
 * - Uses annotationStore from Story 4.2 for all state management
 * - Coordinates stored as normalized [0,1] values
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useAnnotations() {
  // Track if we're currently drawing
  const isDrawingRef = useRef(false)

  // Store state subscriptions
  const strokes = useAnnotationStore((state) => state.strokes)
  const activeStroke = useAnnotationStore((state) => state.activeStroke)
  const activeTool = useAnnotationStore((state) => state.activeTool)

  // Store actions
  const setActiveStroke = useAnnotationStore((state) => state.setActiveStroke)
  const addStroke = useAnnotationStore((state) => state.addStroke)
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)

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

  return {
    // State
    strokes,
    activeStroke,
    activeTool,
    canAnnotate,
    myColor,
    myParticipantId,

    // Actions
    startStroke,
    continueStroke,
    endStroke,
    setTool,
  }
}
