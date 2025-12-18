import { useEffect, useCallback, useRef } from 'react'
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
  type Point,
  type Stroke,
} from '@nameless/shared'

/**
 * Return type for the useAnnotationSync hook.
 */
export interface UseAnnotationSyncReturn {
  /** Whether the room is connected and sync is available */
  isConnected: boolean
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
 *
 * @param room - LiveKit Room object for publishing and subscribing
 * @returns Sync state and publish functions
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useAnnotationSync(room: Room | null): UseAnnotationSyncReturn {
  // Get local participant ID to ignore own messages
  const localParticipant = useRoomStore((state) => state.localParticipant)
  const localParticipantId = localParticipant?.id ?? ''

  // Get store actions
  const addStroke = useAnnotationStore((state) => state.addStroke)
  const deleteStroke = useAnnotationStore((state) => state.deleteStroke)
  const clearAll = useAnnotationStore((state) => state.clearAll)
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

  // Ref to track if we've set up listeners (to avoid duplicates)
  const listenerSetupRef = useRef(false)

  /**
   * Handle incoming annotation messages from other participants.
   */
  const handleAnnotationMessage = useCallback(
    (message: AnnotationMessage, senderIdentity: string) => {
      // Ignore messages from local participant (already rendered optimistically)
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
    publishStroke,
    publishStrokeUpdate,
    publishDelete,
    publishClearAll,
  }
}
