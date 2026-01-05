import { useEffect, useCallback, useRef, useState } from 'react'
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import {
  ANNOTATION_TOPIC,
  ANNOTATION_MESSAGE_TYPES,
  encodeAnnotationMessage,
  decodeAnnotationMessage,
  type AnnotationMessage,
  type StrokeUpdateMessage,
  type StrokeCompleteMessage,
  type StrokeDeleteMessage,
  type ClearAllMessage,
  type StateRequestMessage,
  type StateSnapshotMessage,
  type Point,
  type Stroke,
} from '@etch/shared'

/**
 * Sync state for late-joiner annotation sync.
 * @see Story 4.8: Implement Late-Joiner Annotation Sync
 *
 * Note: We now use optimistic UI - canvas is usable immediately while sync
 * happens in the background. The 'requesting' state is still tracked internally
 * but we default to 'synced' to avoid blocking the UI.
 */
export type SyncState = 'idle' | 'requesting' | 'synced'

/**
 * Return type for the useAnnotationSync hook.
 */
export interface UseAnnotationSyncReturn {
  /** Whether the room is connected and sync is available */
  isConnected: boolean
  /** Current sync state for late-joiner sync (Story 4.8) */
  syncState: SyncState
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

/** Retry configuration for late-joiner sync (Story 4.8 AC-4.8.6) */
const RETRY_CONFIG = {
  initialTimeoutMs: 3000,
  maxAttempts: 3,
  backoffMultiplier: 2,
}

/**
 * Validates that all points in an array are within the normalized [0, 1] range.
 * Logs a warning if any coordinates are out of bounds.
 * Story 4.9 AC-4.9.1: All coordinates stored as [0, 1] normalized range
 *
 * @param points - Array of points to validate
 * @param context - Context string for logging (e.g., message type)
 * @returns true if all points are valid, false if any are out of range
 */
function validateNormalizedCoordinates(points: Point[], context: string): boolean {
  for (const point of points) {
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      console.warn(
        `[AnnotationSync] Received coordinates outside [0, 1] range in ${context}:`,
        { x: point.x, y: point.y }
      )
      return false
    }
  }
  return true
}

/**
 * Hook for synchronizing annotations across participants via LiveKit DataTrack.
 *
 * Per ADR-002: LiveKit DataTracks for Annotations
 * All annotation events flow through DataTracks in reliable mode.
 *
 * Features:
 * - Publishes stroke updates, completions, deletions, and clear all
 * - Receives and processes annotation messages from other participants
 * - Updates annotation store with remote strokes
 * - Ignores messages from local participant (optimistic UI)
 * - Late-joiner sync: requests and receives state snapshots (Story 4.8)
 *
 * @param room - LiveKit Room object for publishing and subscribing
 * @param isScreenShareActive - Whether screen share is active (needed for late-joiner sync)
 * @returns Sync state and publish functions
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useAnnotationSync(
  room: Room | null,
  isScreenShareActive: boolean = false
): UseAnnotationSyncReturn {
  // Get local participant ID to ignore own messages
  const localParticipant = useRoomStore((state) => state.localParticipant)
  const localParticipantId = localParticipant?.id ?? ''

  // Get store actions
  const addStroke = useAnnotationStore((state) => state.addStroke)
  const deleteStroke = useAnnotationStore((state) => state.deleteStroke)
  const clearAll = useAnnotationStore((state) => state.clearAll)
  const setStrokes = useAnnotationStore((state) => state.setStrokes)
  const addRemoteActiveStroke = useAnnotationStore(
    (state) => state.addRemoteActiveStroke
  )
  const updateRemoteActiveStroke = useAnnotationStore(
    (state) => state.updateRemoteActiveStroke
  )
  const completeRemoteActiveStroke = useAnnotationStore(
    (state) => state.completeRemoteActiveStroke
  )

  // Track connection state
  const isConnected = room !== null

  // Late-joiner sync state (Story 4.8)
  // Default to 'synced' for optimistic UI - canvas is usable immediately
  // State request happens in background and merges when received
  // Note: setSyncState kept for potential future use (e.g., showing background sync indicator)
  const [syncState, _setSyncState] = useState<SyncState>('synced')
  void _setSyncState // Suppress unused warning - kept for future extensibility

  // Internal flag to track if we're actively requesting (for retry logic)
  const isRequestingRef = useRef(false)

  // Ref to track if we've set up listeners (to avoid duplicates)
  const listenerSetupRef = useRef(false)

  // Refs for late-joiner sync (Story 4.8)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const stateRequestTimestampRef = useRef<number>(0)
  const hasReceivedSnapshotRef = useRef(false)
  const respondedToRequestersRef = useRef<Set<string>>(new Set())

  /**
   * Clear retry timeout and reset state.
   */
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  /**
   * Send a state request to existing participants.
   * AC-4.8.3: state_request message sent on join
   */
  const sendStateRequest = useCallback(() => {
    if (!room || !localParticipantId) return

    const message: StateRequestMessage = {
      type: ANNOTATION_MESSAGE_TYPES.STATE_REQUEST,
      requesterId: localParticipantId,
    }

    const encoded = encodeAnnotationMessage(message)

    room.localParticipant.publishData(encoded, {
      reliable: true,
      topic: ANNOTATION_TOPIC,
    })

    stateRequestTimestampRef.current = Date.now()

    if (import.meta.env.DEV) {
      console.debug('[AnnotationSync] Sent state_request', { requesterId: localParticipantId })
    }
  }, [room, localParticipantId])

  /**
   * Send a state snapshot in response to a state request.
   * AC-4.8.4: Host (or any participant with state) responds with state_snapshot
   * AC-4.8.7: Snapshot includes only completed strokes (not in-progress)
   */
  const sendStateSnapshot = useCallback(
    (requesterId: string) => {
      if (!room) return

      // Get only completed strokes (AC-4.8.7)
      const completedStrokes = useAnnotationStore
        .getState()
        .strokes.filter((s) => s.isComplete)

      const message: StateSnapshotMessage = {
        type: ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT,
        requesterId,
        strokes: completedStrokes,
        timestamp: Date.now(),
      }

      const encoded = encodeAnnotationMessage(message)

      room.localParticipant.publishData(encoded, {
        reliable: true,
        topic: ANNOTATION_TOPIC,
      })

      // Track that we've responded to this requester
      respondedToRequestersRef.current.add(requesterId)

      if (import.meta.env.DEV) {
        console.debug('[AnnotationSync] Sent state_snapshot', {
          requesterId,
          strokeCount: completedStrokes.length,
        })
      }
    },
    [room]
  )

  /**
   * Handle incoming annotation messages from other participants.
   */
  const handleAnnotationMessage = useCallback(
    (message: AnnotationMessage, senderIdentity: string) => {
      // Handle state_request from any participant (Story 4.8)
      if (message.type === ANNOTATION_MESSAGE_TYPES.STATE_REQUEST) {
        const requestMsg = message as StateRequestMessage

        // Don't respond to our own requests
        if (requestMsg.requesterId === localParticipantId) {
          return
        }

        // Don't respond twice to the same requester
        if (respondedToRequestersRef.current.has(requestMsg.requesterId)) {
          if (import.meta.env.DEV) {
            console.debug('[AnnotationSync] Already responded to', requestMsg.requesterId)
          }
          return
        }

        // Small random delay to avoid simultaneous responses from multiple participants
        const delay = Math.random() * 100
        setTimeout(() => {
          sendStateSnapshot(requestMsg.requesterId)
        }, delay)

        return
      }

      // Handle state_snapshot for late-joiner sync (Story 4.8)
      if (message.type === ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT) {
        const snapshotMsg = message as StateSnapshotMessage

        // Only process if it's for us
        if (snapshotMsg.requesterId !== localParticipantId) {
          return
        }

        // Ignore if we've already received a snapshot (AC-4.8.7 - use timestamp)
        if (hasReceivedSnapshotRef.current) {
          if (import.meta.env.DEV) {
            console.debug('[AnnotationSync] Ignoring duplicate state_snapshot')
          }
          return
        }

        // Mark as received and clear retry timeout
        hasReceivedSnapshotRef.current = true
        isRequestingRef.current = false
        clearRetryTimeout()

        // Validate normalized coordinates for all strokes (Story 4.9 AC-4.9.1)
        for (const stroke of snapshotMsg.strokes) {
          validateNormalizedCoordinates(stroke.points, 'state_snapshot')
        }

        // Bulk load strokes (AC-4.8.1, AC-4.8.2)
        // This merges with any strokes drawn while waiting for sync
        setStrokes(snapshotMsg.strokes)

        // Log latency in dev mode
        if (import.meta.env.DEV) {
          const latency = Date.now() - stateRequestTimestampRef.current
          console.debug('[AnnotationSync] Received state_snapshot', {
            strokeCount: snapshotMsg.strokes.length,
            latency: `${latency}ms`,
          })
        }

        return
      }

      // Ignore other messages from local participant (already rendered optimistically)
      if (senderIdentity === localParticipantId) {
        return
      }

      // Log latency in dev mode
      if (import.meta.env.DEV && 'timestamp' in message) {
        const latency = Date.now() - message.timestamp
        console.debug(
          `[AnnotationSync] Received ${message.type} from ${senderIdentity}, latency: ${latency}ms`
        )
      }

      switch (message.type) {
        case ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE: {
          const updateMsg = message as StrokeUpdateMessage

          // Validate normalized coordinates (Story 4.9 AC-4.9.1)
          validateNormalizedCoordinates(updateMsg.points, 'stroke_update')

          // Create or update in-progress remote stroke
          const existingStrokes = useAnnotationStore.getState().remoteActiveStrokes
          const existing = existingStrokes.get(updateMsg.strokeId)

          if (existing) {
            // Append points to existing stroke
            updateRemoteActiveStroke(updateMsg.strokeId, updateMsg.points)
          } else {
            // Create new in-progress stroke
            const newStroke: Stroke = {
              id: updateMsg.strokeId,
              participantId: updateMsg.participantId,
              tool: updateMsg.tool,
              color: updateMsg.color,
              points: [...updateMsg.points],
              createdAt: updateMsg.timestamp,
              isComplete: false,
            }
            addRemoteActiveStroke(newStroke)
          }
          break
        }

        case ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE: {
          const completeMsg = message as StrokeCompleteMessage

          // Validate normalized coordinates (Story 4.9 AC-4.9.1)
          validateNormalizedCoordinates(completeMsg.points, 'stroke_complete')

          // Create completed stroke and add to store
          const completedStroke: Stroke = {
            id: completeMsg.strokeId,
            participantId: completeMsg.participantId,
            tool: completeMsg.tool,
            color: completeMsg.color,
            points: completeMsg.points,
            createdAt: completeMsg.timestamp,
            isComplete: true,
          }

          // Remove from remote active strokes if present
          completeRemoteActiveStroke(completeMsg.strokeId)

          // Add to completed strokes
          addStroke(completedStroke)
          break
        }

        case ANNOTATION_MESSAGE_TYPES.STROKE_DELETE: {
          const deleteMsg = message as StrokeDeleteMessage
          deleteStroke(deleteMsg.strokeId)
          break
        }

        case ANNOTATION_MESSAGE_TYPES.CLEAR_ALL: {
          clearAll()
          break
        }

        default:
          console.warn('[AnnotationSync] Unknown message type:', message)
      }
    },
    [
      localParticipantId,
      sendStateSnapshot,
      clearRetryTimeout,
      setStrokes,
      addRemoteActiveStroke,
      updateRemoteActiveStroke,
      completeRemoteActiveStroke,
      addStroke,
      deleteStroke,
      clearAll,
    ]
  )

  /**
   * Subscribe to DataReceived events from the room.
   */
  useEffect(() => {
    if (!room || listenerSetupRef.current) return

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string
    ) => {
      // Filter for annotation messages only
      if (topic !== ANNOTATION_TOPIC) return

      // Decode message
      const message = decodeAnnotationMessage(payload)
      if (!message) {
        console.warn('[AnnotationSync] Failed to decode message')
        return
      }

      // Get sender identity
      const senderIdentity = participant?.identity ?? ''

      // Handle the message
      handleAnnotationMessage(message, senderIdentity)
    }

    // Subscribe to data events
    room.on(RoomEvent.DataReceived, handleDataReceived)
    listenerSetupRef.current = true

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived)
      listenerSetupRef.current = false
    }
  }, [room, handleAnnotationMessage])

  /**
   * Late-joiner sync: Request state on connection when screen share is active.
   * AC-4.8.3: state_request message sent on join
   * AC-4.8.6: Retry after 3 seconds if no response
   *
   * Uses optimistic UI - canvas is usable immediately while sync happens in background.
   */
  useEffect(() => {
    // Only request state if room is connected and screen share is active
    if (!room || !isScreenShareActive || !localParticipantId) {
      return
    }

    // Don't request if we're already requesting or have received a snapshot
    if (isRequestingRef.current || hasReceivedSnapshotRef.current) {
      return
    }

    // Check if there are any remote participants to request state from
    const remoteParticipants = room.remoteParticipants
    if (remoteParticipants.size === 0) {
      // No one to request from, we're the first
      hasReceivedSnapshotRef.current = true
      if (import.meta.env.DEV) {
        console.debug('[AnnotationSync] No remote participants, skipping state request')
      }
      return
    }

    // Start requesting state in background (UI already shows synced/usable)
    isRequestingRef.current = true
    retryCountRef.current = 0

    const attemptRequest = () => {
      if (hasReceivedSnapshotRef.current) {
        isRequestingRef.current = false
        return // Already received snapshot
      }

      if (retryCountRef.current >= RETRY_CONFIG.maxAttempts) {
        // Max retries reached, assume empty state (AC-4.8.6)
        if (import.meta.env.DEV) {
          console.debug('[AnnotationSync] Max retries reached, assuming empty state')
        }
        hasReceivedSnapshotRef.current = true
        isRequestingRef.current = false
        return
      }

      // Send request
      sendStateRequest()
      retryCountRef.current++

      // Calculate timeout with exponential backoff
      const timeoutMs =
        RETRY_CONFIG.initialTimeoutMs *
        Math.pow(RETRY_CONFIG.backoffMultiplier, retryCountRef.current - 1)

      // Schedule retry
      retryTimeoutRef.current = setTimeout(attemptRequest, timeoutMs)
    }

    // Start first attempt
    attemptRequest()

    // Cleanup on unmount
    return () => {
      clearRetryTimeout()
      isRequestingRef.current = false
    }
  }, [
    room,
    isScreenShareActive,
    localParticipantId,
    sendStateRequest,
    clearRetryTimeout,
  ])

  /**
   * Publish a completed stroke to all participants.
   * AC-4.7.4: Complete stroke sent on mouse up
   * AC-4.7.7: Uses reliable DataTrack mode
   */
  const publishStroke = useCallback(
    (stroke: Stroke): void => {
      if (!room) return

      const message: StrokeCompleteMessage = {
        type: ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE,
        strokeId: stroke.id,
        participantId: stroke.participantId,
        tool: stroke.tool,
        color: stroke.color,
        points: stroke.points,
        timestamp: Date.now(),
      }

      const encoded = encodeAnnotationMessage(message)

      room.localParticipant.publishData(encoded, {
        reliable: true,
        topic: ANNOTATION_TOPIC,
      })
    },
    [room]
  )

  /**
   * Publish incremental stroke updates during drawing.
   * AC-4.7.3: Incremental updates sent every 16ms during draw
   * AC-4.7.7: Uses reliable DataTrack mode
   */
  const publishStrokeUpdate = useCallback(
    (
      strokeId: string,
      participantId: string,
      tool: 'pen' | 'highlighter',
      color: string,
      points: Point[]
    ): void => {
      if (!room || points.length === 0) return

      const message: StrokeUpdateMessage = {
        type: ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE,
        strokeId,
        participantId,
        tool,
        color,
        points,
        timestamp: Date.now(),
      }

      const encoded = encodeAnnotationMessage(message)

      room.localParticipant.publishData(encoded, {
        reliable: true,
        topic: ANNOTATION_TOPIC,
      })
    },
    [room]
  )

  /**
   * Publish a stroke deletion (eraser).
   * AC-4.7.5: Delete messages sync to others
   * AC-4.7.7: Uses reliable DataTrack mode
   */
  const publishDelete = useCallback(
    (strokeId: string): void => {
      if (!room) return

      const message: StrokeDeleteMessage = {
        type: ANNOTATION_MESSAGE_TYPES.STROKE_DELETE,
        strokeId,
        deletedBy: localParticipantId,
        timestamp: Date.now(),
      }

      const encoded = encodeAnnotationMessage(message)

      room.localParticipant.publishData(encoded, {
        reliable: true,
        topic: ANNOTATION_TOPIC,
      })
    },
    [room, localParticipantId]
  )

  /**
   * Publish clear all (host only).
   * AC-4.7.6: Clear all syncs to all participants
   * AC-4.7.7: Uses reliable DataTrack mode
   */
  const publishClearAll = useCallback((): void => {
    if (!room) return

    const message: ClearAllMessage = {
      type: ANNOTATION_MESSAGE_TYPES.CLEAR_ALL,
      clearedBy: localParticipantId,
      timestamp: Date.now(),
    }

    const encoded = encodeAnnotationMessage(message)

    room.localParticipant.publishData(encoded, {
      reliable: true,
      topic: ANNOTATION_TOPIC,
    })
  }, [room, localParticipantId])

  return {
    isConnected,
    syncState,
    publishStroke,
    publishStrokeUpdate,
    publishDelete,
    publishClearAll,
  }
}
