import { useCallback, useRef, useState, useEffect } from 'react'
import { useAnnotationStore, type Tool } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import { useScreenShareStore } from '@/stores/screenShareStore'
import { findTopmostStrokeAtPoint } from '@/lib/canvas'
import { PARTICIPANT_COLORS } from '@etch/shared'
import type { Point, Stroke } from '@etch/shared'

/**
 * Sync callbacks for DataTrack annotation synchronization.
 * These are optional - when not provided, annotations work locally only.
 */
export interface AnnotationSyncCallbacks {
  /** Publish a completed stroke to all participants */
  publishStroke: (stroke: Stroke) => void
  /** Publish incremental stroke updates during drawing */
  publishStrokeUpdate: (
    strokeId: string,
    participantId: string,
    tool: 'pen' | 'highlighter',
    color: string,
    points: Point[]
  ) => void
  /** Publish a stroke deletion (eraser) */
  publishDelete: (strokeId: string) => void
  /** Publish clear all (host only) */
  publishClearAll: () => void
}

/**
 * Options for the useAnnotations hook.
 */
export interface UseAnnotationsOptions {
  /** Optional sync callbacks for DataTrack sync (Story 4.7) */
  sync?: AnnotationSyncCallbacks | null
}

/** Point batching interval in milliseconds (60fps) */
const BATCH_INTERVAL_MS = 16

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
 * @param options - Optional configuration including sync callbacks
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useAnnotations(options: UseAnnotationsOptions = {}) {
  const { sync } = options

  // Track if we're currently drawing
  const isDrawingRef = useRef(false)

  // Point batching state (Story 4.7 - AC-4.7.3)
  const pointBatchRef = useRef<Point[]>([])
  const lastBatchTimeRef = useRef<number>(0)
  const batchIntervalRef = useRef<number | null>(null)

  // Eraser hover state - stores ID of stroke under cursor (AC-4.5.6)
  const [hoveredStrokeId, setHoveredStrokeId] = useState<string | null>(null)

  // Store state subscriptions
  const strokes = useAnnotationStore((state) => state.strokes)
  const activeStroke = useAnnotationStore((state) => state.activeStroke)
  const activeTool = useAnnotationStore((state) => state.activeTool)
  const remoteActiveStrokes = useAnnotationStore(
    (state) => state.remoteActiveStrokes
  )

  // Store actions
  const setActiveStroke = useAnnotationStore((state) => state.setActiveStroke)
  const addStroke = useAnnotationStore((state) => state.addStroke)
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)
  const deleteStroke = useAnnotationStore((state) => state.deleteStroke)
  const clearAllStrokes = useAnnotationStore((state) => state.clearAll)

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
    isSharing && (role === 'annotator' || role === 'host' || role === 'sharer')

  /**
   * Generates a unique stroke ID using crypto.randomUUID().
   */
  const generateStrokeId = useCallback((): string => {
    return crypto.randomUUID()
  }, [])

  /**
   * Flushes the current batch of points via sync.
   * Called every 16ms during drawing (AC-4.7.3).
   */
  const flushPointBatch = useCallback(() => {
    if (!sync || pointBatchRef.current.length === 0) return

    const currentStroke = useAnnotationStore.getState().activeStroke
    if (!currentStroke) return

    // Send batched points via sync
    sync.publishStrokeUpdate(
      currentStroke.id,
      currentStroke.participantId,
      currentStroke.tool,
      currentStroke.color,
      [...pointBatchRef.current]
    )

    // Clear the batch
    pointBatchRef.current = []
    lastBatchTimeRef.current = Date.now()
  }, [sync])

  /**
   * Starts the batch interval for sending incremental updates.
   */
  const startBatchInterval = useCallback(() => {
    if (batchIntervalRef.current !== null) return

    batchIntervalRef.current = window.setInterval(() => {
      flushPointBatch()
    }, BATCH_INTERVAL_MS)
  }, [flushPointBatch])

  /**
   * Stops the batch interval and flushes any remaining points.
   */
  const stopBatchInterval = useCallback(() => {
    if (batchIntervalRef.current !== null) {
      clearInterval(batchIntervalRef.current)
      batchIntervalRef.current = null
    }
    // Flush any remaining points
    flushPointBatch()
  }, [flushPointBatch])

  // Cleanup batch interval on unmount
  useEffect(() => {
    return () => {
      if (batchIntervalRef.current !== null) {
        clearInterval(batchIntervalRef.current)
      }
    }
  }, [])

  /**
   * Starts a new stroke at the given point.
   * Creates a new Stroke object with unique ID, participant info, and initial point.
   * AC-4.7.8: Local strokes render immediately (optimistic UI).
   *
   * @param point - The starting point (normalized coordinates)
   */
  const startStroke = useCallback(
    (point: Point): void => {
      // Don't start if can't annotate or tool is not pen/highlighter
      if (
        !canAnnotate ||
        (activeTool !== 'pen' && activeTool !== 'highlighter')
      ) {
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

      // Set as active stroke in store (optimistic UI - AC-4.7.8)
      setActiveStroke(newStroke)
      isDrawingRef.current = true

      // Initialize point batch with first point and start interval (Story 4.7)
      if (sync) {
        pointBatchRef.current = [point]
        lastBatchTimeRef.current = Date.now()
        startBatchInterval()
      }
    },
    [
      canAnnotate,
      activeTool,
      myParticipantId,
      myColor,
      generateStrokeId,
      setActiveStroke,
      sync,
      startBatchInterval,
    ]
  )

  /**
   * Continues the current stroke by appending a new point.
   * Only works if there's an active stroke being drawn.
   * Points are batched for sync every 16ms (AC-4.7.3).
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

      // Update active stroke (local render first - AC-4.7.8)
      setActiveStroke(updatedStroke)

      // Add point to batch for sync (Story 4.7 - AC-4.7.3)
      if (sync) {
        pointBatchRef.current.push(point)
      }
    },
    [setActiveStroke, sync]
  )

  /**
   * Ends the current stroke, marking it as complete and moving it to the strokes array.
   * AC-4.7.4: Complete stroke sent on mouse up.
   */
  const endStroke = useCallback((): void => {
    if (!isDrawingRef.current) return

    // Stop batch interval and flush remaining points (Story 4.7)
    if (sync) {
      stopBatchInterval()
    }

    const currentStroke = useAnnotationStore.getState().activeStroke
    if (!currentStroke) {
      isDrawingRef.current = false
      return
    }

    // Only save strokes with at least 1 point
    if (currentStroke.points.length >= 1) {
      // Mark as complete and add to strokes
      const completedStroke: Stroke = {
        ...currentStroke,
        isComplete: true,
      }

      // Add to local store
      addStroke(completedStroke)

      // Publish completed stroke via sync (AC-4.7.4)
      if (sync) {
        sync.publishStroke(completedStroke)
      }
    }

    // Clear active stroke
    setActiveStroke(null)
    isDrawingRef.current = false
  }, [addStroke, setActiveStroke, sync, stopBatchInterval])

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
   * AC-4.7.5: Delete messages sync to others.
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

      // Delete the stroke locally
      deleteStroke(topStroke.id)

      // Publish delete via sync (AC-4.7.5)
      if (sync) {
        sync.publishDelete(topStroke.id)
      }

      // Clear hover state if we just deleted the hovered stroke
      if (hoveredStrokeId === topStroke.id) {
        setHoveredStrokeId(null)
      }

      return true
    },
    [
      canAnnotate,
      activeTool,
      canEraseStroke,
      deleteStroke,
      hoveredStrokeId,
      sync,
    ]
  )

  /**
   * Clears all strokes (host only).
   * AC-4.7.6: Clear all syncs to all participants.
   */
  const clearAll = useCallback((): void => {
    // Clear locally
    clearAllStrokes()

    // Publish clear all via sync (AC-4.7.6)
    if (sync) {
      sync.publishClearAll()
    }
  }, [clearAllStrokes, sync])

  return {
    // State
    strokes,
    activeStroke,
    activeTool,
    canAnnotate,
    myColor,
    myParticipantId,
    hoveredStrokeId,
    remoteActiveStrokes, // Story 4.7 - in-progress remote strokes

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

    // Clear All (Story 4.7)
    clearAll,
  }
}
