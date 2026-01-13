import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react'
import { listen, emit } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getStroke } from 'perfect-freehand'
import type { Stroke } from '@etch/shared'
import {
  denormalizeStrokePoints,
  normalizeCoordinates,
} from '@/utils/coordinates'
import {
  PEN_OPTIONS,
  HIGHLIGHTER_OPTIONS,
  HIGHLIGHTER_OPACITY,
} from '@/components/AnnotationCanvas/AnnotationCanvas'

/**
 * Apply transparent background to html/body for Tauri window transparency.
 * Must run before first paint to avoid flash.
 */
function useTransparentBackground() {
  useLayoutEffect(() => {
    // Add transparent class to html element
    document.documentElement.classList.add('overlay-transparent')
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.backgroundColor = 'transparent'

    return () => {
      document.documentElement.classList.remove('overlay-transparent')
    }
  }, [])
}

/**
 * Converts stroke outline points to an SVG path string.
 * Uses quadratic bezier curves for smooth rendering.
 */
function getSvgPathFromStroke(strokeOutline: number[][]): string {
  if (!strokeOutline.length) return ''

  const d = strokeOutline.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...strokeOutline[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}

/**
 * Renders a single stroke to the canvas context using Perfect Freehand.
 * Uses the same rendering logic as AnnotationCanvas for visual consistency (AC-4.11.2).
 */
function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (stroke.points.length < 2) return

  // Convert normalized points to pixel coordinates (AC-4.11.3)
  const pixelPoints = denormalizeStrokePoints(
    stroke.points,
    canvasWidth,
    canvasHeight
  )

  // Get stroke options based on tool type (same as AnnotationCanvas)
  const options =
    stroke.tool === 'highlighter' ? HIGHLIGHTER_OPTIONS : PEN_OPTIONS

  // Generate stroke outline using perfect-freehand
  const strokeOutline = getStroke(pixelPoints, options)
  const pathString = getSvgPathFromStroke(strokeOutline)

  if (!pathString) return

  // Create Path2D for efficient rendering
  const path = new Path2D(pathString)

  // Save context state
  ctx.save()

  // Set stroke color and opacity
  ctx.fillStyle = stroke.color
  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = HIGHLIGHTER_OPACITY
  }

  // Fill the stroke path
  ctx.fill(path)

  // Restore context state
  ctx.restore()
}

/**
 * Overlay annotation event types from main window
 */
interface OverlayStrokeUpdate {
  type: 'stroke_update'
  stroke: Stroke
}

interface OverlayStrokeComplete {
  type: 'stroke_complete'
  stroke: Stroke
}

interface OverlayStrokeDelete {
  type: 'stroke_delete'
  strokeId: string
}

interface OverlayClearAll {
  type: 'clear_all'
}

interface OverlayFullState {
  type: 'full_state'
  strokes: Stroke[]
  activeStrokes: Stroke[]
}

interface OverlayDrawModeChange {
  type: 'draw_mode_change'
  enabled: boolean
}

type OverlayAnnotationEvent =
  | OverlayStrokeUpdate
  | OverlayStrokeComplete
  | OverlayStrokeDelete
  | OverlayClearAll
  | OverlayFullState
  | OverlayDrawModeChange

/**
 * AnnotationOverlayPage - Renders annotations on the sharer's overlay window
 *
 * Story 4.11: This component runs in a separate Tauri window positioned over the
 * shared content. It:
 * - Receives annotation updates via Tauri events from the main window (AC-4.11.1)
 * - Renders strokes using the same Perfect Freehand settings as viewers (AC-4.11.2)
 * - Uses identical coordinate transformation as viewer canvas (AC-4.11.3)
 * - Updates in real-time with < 200ms latency (AC-4.11.4)
 * - Is click-through by default, but can enable drawing mode (AC-4.11.5, AC-4.11.6)
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function AnnotationOverlayPage() {
  // Debug: Log when overlay loads
  console.log('[AnnotationOverlay] Component mounting...')

  // Apply transparent background before first paint
  useTransparentBackground()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // Local stroke state (received from main window)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [activeStrokes, setActiveStrokes] = useState<Map<string, Stroke>>(
    new Map()
  )

  // Drawing mode state (AC-4.11.5, AC-4.11.6)
  const [isDrawModeEnabled, setIsDrawModeEnabled] = useState(false)
  const isDrawingRef = useRef(false)
  const [localActiveStroke, setLocalActiveStroke] = useState<Stroke | null>(
    null
  )

  // Participant info for local drawing (received from main window)
  const [myParticipantId, setMyParticipantId] = useState<string>('')
  const [myColor, setMyColor] = useState<string>('#f97316')
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter'>('pen')

  /**
   * Render all strokes to the canvas
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    // Use LOGICAL dimensions for coordinate denormalization (matching viewer's AnnotationCanvas)
    // canvas.width/height are physical pixels (scaled by DPR), but coordinates are normalized
    // based on logical (CSS) dimensions, so we must denormalize using logical dimensions too
    const width = window.innerWidth
    const height = window.innerHeight

    // Clear canvas using physical dimensions
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const totalStrokes =
      strokes.length + activeStrokes.size + (localActiveStroke ? 1 : 0)
    if (totalStrokes > 0) {
      console.log(
        `[AnnotationOverlay] Rendering ${totalStrokes} strokes (${strokes.length} complete, ${activeStrokes.size} active, ${localActiveStroke ? 1 : 0} local)`
      )
    }

    // Render completed strokes
    for (const stroke of strokes) {
      renderStroke(ctx, stroke, width, height)
    }

    // Render remote in-progress strokes
    for (const stroke of activeStrokes.values()) {
      renderStroke(ctx, stroke, width, height)
    }

    // Render local active stroke (for sharer drawing)
    if (localActiveStroke) {
      renderStroke(ctx, localActiveStroke, width, height)
    }
  }, [strokes, activeStrokes, localActiveStroke])

  /**
   * Animation frame loop for 60fps rendering (AC-4.11.4)
   */
  useEffect(() => {
    const frameLoop = () => {
      render()
      rafIdRef.current = requestAnimationFrame(frameLoop)
    }

    rafIdRef.current = requestAnimationFrame(frameLoop)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [render])

  /**
   * Handle annotation events from main window
   */
  const handleAnnotationEvent = useCallback((event: OverlayAnnotationEvent) => {
    console.log('[AnnotationOverlay] Received event:', event.type, event)
    switch (event.type) {
      case 'stroke_update': {
        // Update or add active stroke
        setActiveStrokes((prev) => {
          const next = new Map(prev)
          next.set(event.stroke.id, event.stroke)
          return next
        })
        break
      }
      case 'stroke_complete': {
        // Move from active to completed
        setActiveStrokes((prev) => {
          const next = new Map(prev)
          next.delete(event.stroke.id)
          return next
        })
        setStrokes((prev) => [...prev, event.stroke])
        break
      }
      case 'stroke_delete': {
        setStrokes((prev) => prev.filter((s) => s.id !== event.strokeId))
        break
      }
      case 'clear_all': {
        setStrokes([])
        setActiveStrokes(new Map())
        break
      }
      case 'full_state': {
        // Full state sync (e.g., on connection)
        setStrokes(event.strokes)
        const activeMap = new Map<string, Stroke>()
        for (const stroke of event.activeStrokes) {
          activeMap.set(stroke.id, stroke)
        }
        setActiveStrokes(activeMap)
        break
      }
      case 'draw_mode_change': {
        setIsDrawModeEnabled(event.enabled)
        break
      }
    }
  }, [])

  /**
   * Set up Tauri event listeners
   */
  useEffect(() => {
    let mounted = true

    const setupListeners = async () => {
      // Listen for annotation events from main window
      const unlistenAnnotation = await listen<OverlayAnnotationEvent>(
        'overlay://annotation',
        (event) => {
          if (!mounted) return
          handleAnnotationEvent(event.payload)
        }
      )

      // Listen for participant info updates
      const unlistenParticipant = await listen<{
        participantId: string
        color: string
        tool: 'pen' | 'highlighter'
      }>('overlay://participant-info', (event) => {
        if (!mounted) return
        setMyParticipantId(event.payload.participantId)
        setMyColor(event.payload.color)
        setActiveTool(event.payload.tool)
      })

      // Request initial state from main window
      console.log(
        '[AnnotationOverlay] Requesting initial state from main window...'
      )
      try {
        await emit('overlay://request-state', {})
        console.log('[AnnotationOverlay] State request sent successfully')
      } catch (e) {
        console.warn('[AnnotationOverlay] Failed to request initial state:', e)
      }

      return () => {
        unlistenAnnotation()
        unlistenParticipant()
      }
    }

    const cleanupPromise = setupListeners()

    return () => {
      mounted = false
      cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [handleAnnotationEvent])

  /**
   * Initialize canvas and handle resize
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get 2D context with GPU acceleration
    const ctx = canvas.getContext('2d', {
      willReadFrequently: false,
      alpha: true,
    })
    ctxRef.current = ctx

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr

      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  /**
   * Handle pointer events for sharer drawing (AC-4.11.6)
   */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!isDrawModeEnabled || event.button !== 0) return

      const rect = event.currentTarget.getBoundingClientRect()
      const point = normalizeCoordinates(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
        event.pressure > 0 ? event.pressure : 0.5
      )

      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        participantId: myParticipantId,
        tool: activeTool,
        color: myColor,
        points: [point],
        createdAt: Date.now(),
        isComplete: false,
      }

      setLocalActiveStroke(newStroke)
      isDrawingRef.current = true

      // Notify main window of stroke start
      emit('overlay://stroke-start', newStroke).catch(console.error)
    },
    [isDrawModeEnabled, myParticipantId, myColor, activeTool]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isDrawingRef.current || !localActiveStroke) return

      const rect = event.currentTarget.getBoundingClientRect()
      const point = normalizeCoordinates(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
        event.pressure > 0 ? event.pressure : 0.5
      )

      const updatedStroke: Stroke = {
        ...localActiveStroke,
        points: [...localActiveStroke.points, point],
      }
      setLocalActiveStroke(updatedStroke)

      // Notify main window of point addition
      emit('overlay://stroke-point', {
        strokeId: localActiveStroke.id,
        point,
      }).catch(console.error)
    },
    [localActiveStroke]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current || !localActiveStroke) return

    isDrawingRef.current = false

    const completedStroke: Stroke = {
      ...localActiveStroke,
      isComplete: true,
    }

    // Add to local strokes
    setStrokes((prev) => [...prev, completedStroke])
    setLocalActiveStroke(null)

    // Notify main window of stroke completion
    emit('overlay://stroke-complete', completedStroke).catch(console.error)
  }, [localActiveStroke])

  const handlePointerLeave = useCallback(() => {
    if (isDrawingRef.current) {
      handlePointerUp()
    }
  }, [handlePointerUp])

  /**
   * Toggle click-through mode via keyboard (AC-4.11.5)
   */
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Shift+D to toggle drawing mode
      if (event.shiftKey && event.key === 'D') {
        const newMode = !isDrawModeEnabled
        setIsDrawModeEnabled(newMode)

        // Update click-through in native window
        try {
          await invoke('set_overlay_click_through', { enabled: !newMode })
        } catch (e) {
          console.error('Failed to toggle click-through:', e)
        }

        // Notify main window
        emit('overlay://draw-mode-changed', { enabled: newMode }).catch(
          console.error
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawModeEnabled])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: 'transparent',
        // Red border to indicate sharing (Story 3.8)
        border: '4px solid rgba(239, 68, 68, 0.8)',
        boxSizing: 'border-box',
        cursor: isDrawModeEnabled ? 'crosshair' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Debug indicator - always visible to confirm overlay is working */}
      <div
        style={{
          position: 'fixed',
          bottom: 12,
          left: 12,
          padding: '4px 8px',
          borderRadius: 4,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          color: 'white',
          fontSize: 10,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        OVERLAY: {strokes.length} strokes
      </div>

      {/* Drawing mode indicator (AC-4.11.6) */}
      {isDrawModeEnabled && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            padding: '8px 16px',
            borderRadius: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          ✏️ Drawing Mode (Shift+D to exit)
        </div>
      )}
    </div>
  )
}
