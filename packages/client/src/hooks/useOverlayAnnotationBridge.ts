import { useEffect, useRef, useCallback } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import type { Point, Stroke } from '@etch/shared'

/**
 * Bridge hook for synchronizing annotation state between the main window
 * and the overlay window on the sharer's machine.
 *
 * Story 4.11: This hook:
 * - Subscribes to annotationStore changes and emits them to the overlay (AC-4.11.1)
 * - Listens for overlay events (sharer drawing) and updates the store (AC-4.11.6)
 * - Sends participant info to overlay for local drawing
 *
 * Only active when the overlay is open (sharer is sharing).
 *
 * @param isOverlayActive - Whether the overlay window is currently open
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function useOverlayAnnotationBridge(isOverlayActive: boolean) {
  // Track if we've sent initial state
  const sentInitialStateRef = useRef(false)
  // Track strokes for change detection
  const prevStrokesRef = useRef<Stroke[]>([])
  const prevActiveStrokeRef = useRef<Stroke | null>(null)
  const prevRemoteActiveStrokesRef = useRef<Map<string, Stroke>>(new Map())
  // Track stroke IDs that originated from the overlay to prevent duplicate emission
  const overlayOriginatedStrokesRef = useRef<Set<string>>(new Set())

  // Store subscriptions
  const strokes = useAnnotationStore((state) => state.strokes)
  const activeStroke = useAnnotationStore((state) => state.activeStroke)
  const remoteActiveStrokes = useAnnotationStore((state) => state.remoteActiveStrokes)
  const activeTool = useAnnotationStore((state) => state.activeTool)
  const addStroke = useAnnotationStore((state) => state.addStroke)

  // Participant info
  const localParticipant = useRoomStore((state) => state.localParticipant)
  const myParticipantId = localParticipant?.id ?? ''
  const myColor = localParticipant?.color ?? '#f97316'

  /**
   * Emit annotation event to overlay
   */
  const emitToOverlay = useCallback(
    async (eventType: string, payload: Record<string, unknown>) => {
      if (!isOverlayActive) return
      try {
        await emit(`overlay://annotation`, { type: eventType, ...payload })
      } catch (e) {
        console.warn('Failed to emit to overlay:', e)
      }
    },
    [isOverlayActive]
  )

  /**
   * Send full state to overlay (on initial connection or state request)
   */
  const sendFullState = useCallback(async () => {
    if (!isOverlayActive) return

    const currentStrokes = useAnnotationStore.getState().strokes
    const currentRemoteStrokes = useAnnotationStore.getState().remoteActiveStrokes
    const currentActiveStroke = useAnnotationStore.getState().activeStroke

    const activeStrokesArray: Stroke[] = []
    currentRemoteStrokes.forEach((stroke) => activeStrokesArray.push(stroke))
    if (currentActiveStroke) {
      activeStrokesArray.push(currentActiveStroke)
    }

    console.log('[OverlayBridge] Sending full state to overlay:', {
      completedStrokes: currentStrokes.length,
      activeStrokes: activeStrokesArray.length,
    })

    await emitToOverlay('full_state', {
      strokes: currentStrokes,
      activeStrokes: activeStrokesArray,
    })

    sentInitialStateRef.current = true
  }, [isOverlayActive, emitToOverlay])

  /**
   * Send participant info to overlay for local drawing
   */
  const sendParticipantInfo = useCallback(async () => {
    if (!isOverlayActive) return

    try {
      await emit('overlay://participant-info', {
        participantId: myParticipantId,
        color: myColor,
        tool: activeTool === 'pen' || activeTool === 'highlighter' ? activeTool : 'pen',
      })
    } catch (e) {
      console.warn('Failed to send participant info to overlay:', e)
    }
  }, [isOverlayActive, myParticipantId, myColor, activeTool])

  /**
   * Listen for overlay events
   */
  useEffect(() => {
    if (!isOverlayActive) return

    let mounted = true

    const setupListeners = async () => {
      // Listen for state request from overlay
      const unlistenStateRequest = await listen('overlay://request-state', async () => {
        if (!mounted) return
        await sendFullState()
        await sendParticipantInfo()
      })

      // Listen for strokes from overlay (sharer drawing)
      const unlistenStrokeStart = await listen<Stroke>(
        'overlay://stroke-start',
        (event) => {
          if (!mounted) return
          const stroke = event.payload
          // Track that this stroke originated from overlay
          overlayOriginatedStrokesRef.current.add(stroke.id)
          // Add as active stroke (handled by store)
          useAnnotationStore.getState().setActiveStroke(stroke)
        }
      )

      const unlistenStrokePoint = await listen<{ strokeId: string; point: Point }>(
        'overlay://stroke-point',
        (event) => {
          if (!mounted) return
          const { point } = event.payload
          // Update active stroke
          const currentActive = useAnnotationStore.getState().activeStroke
          if (currentActive) {
            useAnnotationStore.getState().setActiveStroke({
              ...currentActive,
              points: [...currentActive.points, point],
            })
          }
        }
      )

      const unlistenStrokeComplete = await listen<Stroke>(
        'overlay://stroke-complete',
        (event) => {
          if (!mounted) return
          const stroke = event.payload
          // Track that this stroke originated from overlay (in case start was missed)
          overlayOriginatedStrokesRef.current.add(stroke.id)
          // Add completed stroke to store
          addStroke(stroke)
          useAnnotationStore.getState().setActiveStroke(null)
        }
      )

      const unlistenDrawModeChanged = await listen<{ enabled: boolean }>(
        'overlay://draw-mode-changed',
        (event) => {
          if (!mounted) return
          console.log('[OverlayBridge] Draw mode changed:', event.payload.enabled)
          // Could emit to other viewers if needed
        }
      )

      return () => {
        unlistenStateRequest()
        unlistenStrokeStart()
        unlistenStrokePoint()
        unlistenStrokeComplete()
        unlistenDrawModeChanged()
      }
    }

    const cleanupPromise = setupListeners()

    return () => {
      mounted = false
      cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [isOverlayActive, sendFullState, sendParticipantInfo, addStroke])

  /**
   * Emit store changes to overlay
   */
  useEffect(() => {
    if (!isOverlayActive) return

    // Check for new completed strokes
    const newStrokes = strokes.filter(
      (s) => !prevStrokesRef.current.some((prev) => prev.id === s.id)
    )
    for (const stroke of newStrokes) {
      // Skip strokes that originated from overlay - they already have it locally
      if (overlayOriginatedStrokesRef.current.has(stroke.id)) {
        console.log('[OverlayBridge] Skipping overlay-originated stroke:', stroke.id)
        continue
      }
      console.log('[OverlayBridge] Emitting stroke_complete to overlay:', stroke.id)
      emitToOverlay('stroke_complete', { stroke })
    }

    // Check for deleted strokes
    const deletedStrokes = prevStrokesRef.current.filter(
      (prev) => !strokes.some((s) => s.id === prev.id)
    )
    for (const stroke of deletedStrokes) {
      // Clean up tracking for deleted strokes
      overlayOriginatedStrokesRef.current.delete(stroke.id)
      emitToOverlay('stroke_delete', { strokeId: stroke.id })
    }

    // Check for clear all (if went from having strokes to zero)
    if (prevStrokesRef.current.length > 0 && strokes.length === 0) {
      // Clear tracking set on clear all
      overlayOriginatedStrokesRef.current.clear()
      emitToOverlay('clear_all', {})
    }

    prevStrokesRef.current = [...strokes]
  }, [isOverlayActive, strokes, emitToOverlay])

  /**
   * Emit active stroke changes to overlay
   */
  useEffect(() => {
    if (!isOverlayActive) return

    if (activeStroke && activeStroke !== prevActiveStrokeRef.current) {
      // Skip strokes that originated from overlay - they already have it locally
      if (overlayOriginatedStrokesRef.current.has(activeStroke.id)) {
        prevActiveStrokeRef.current = activeStroke
        return
      }
      emitToOverlay('stroke_update', { stroke: activeStroke })
    }

    prevActiveStrokeRef.current = activeStroke
  }, [isOverlayActive, activeStroke, emitToOverlay])

  /**
   * Emit remote active stroke changes to overlay
   */
  useEffect(() => {
    if (!isOverlayActive) return

    // Emit updates for remote strokes
    remoteActiveStrokes.forEach((stroke, id) => {
      const prev = prevRemoteActiveStrokesRef.current.get(id)
      if (!prev || prev.points.length !== stroke.points.length) {
        emitToOverlay('stroke_update', { stroke })
      }
    })

    prevRemoteActiveStrokesRef.current = new Map(remoteActiveStrokes)
  }, [isOverlayActive, remoteActiveStrokes, emitToOverlay])

  /**
   * Send participant info when tool changes
   */
  useEffect(() => {
    if (!isOverlayActive) return
    sendParticipantInfo()
  }, [isOverlayActive, activeTool, sendParticipantInfo])

  /**
   * Send initial state when overlay becomes active
   * The overlay will also request state, so this is a proactive push.
   * We use multiple attempts with short delays to handle race conditions.
   */
  useEffect(() => {
    if (isOverlayActive && !sentInitialStateRef.current) {
      // Send state multiple times with delays to handle overlay initialization timing
      const sendWithRetry = async () => {
        // First attempt immediately
        await sendFullState()
        await sendParticipantInfo()

        // Second attempt after 200ms (overlay might still be initializing)
        setTimeout(async () => {
          if (!sentInitialStateRef.current) return
          console.log('[OverlayBridge] Sending state again after 200ms')
          await sendFullState()
          await sendParticipantInfo()
        }, 200)

        // Third attempt after 500ms (final fallback)
        setTimeout(async () => {
          if (!sentInitialStateRef.current) return
          console.log('[OverlayBridge] Sending state again after 500ms')
          await sendFullState()
          await sendParticipantInfo()
        }, 500)
      }

      sendWithRetry()
    } else if (!isOverlayActive) {
      sentInitialStateRef.current = false
      // Clear overlay-originated strokes tracking when overlay closes
      overlayOriginatedStrokesRef.current.clear()
    }
  }, [isOverlayActive, sendFullState, sendParticipantInfo])

  return {
    sendFullState,
    sendParticipantInfo,
  }
}
