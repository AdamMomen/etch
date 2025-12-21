import { useEffect, useRef, useState, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'

/**
 * Point coordinate (normalized 0-1)
 */
interface Point {
  x: number
  y: number
}

/**
 * Stroke data from viewers
 */
interface Stroke {
  id: string
  points: Point[]
  color: string
  width: number
  participantId: string
}

/**
 * Annotation message from main window
 */
interface StrokeEvent {
  type: 'stroke'
  stroke: Stroke
}

interface ClearEvent {
  type: 'clear'
  participantId: string
}

// Union type for annotation events - exported for use in event handlers
export type AnnotationEvent = StrokeEvent | ClearEvent

/**
 * AnnotationOverlayPage - Renders on the sharer's transparent overlay window
 *
 * This component:
 * - Listens for annotation events from the main window via Tauri events
 * - Renders strokes on a full-screen canvas
 * - Is displayed in a click-through overlay window on top of shared content
 */
export function AnnotationOverlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])

  // Redraw all strokes on canvas
  const redrawStrokes = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue

      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const firstPoint = stroke.points[0]
      ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height)

      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i]
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height)
      }
      ctx.stroke()
    }
  }, [strokes])

  // Listen for annotation events from main window
  useEffect(() => {
    let mounted = true

    const setupListeners = async () => {
      // Listen for new strokes
      const unlistenStroke = await listen<Stroke>('annotation-stroke', (event) => {
        if (!mounted) return
        const stroke = event.payload
        setStrokes((prev) => {
          // Avoid duplicates
          if (prev.some((s) => s.id === stroke.id)) return prev
          return [...prev, stroke]
        })
      })

      // Listen for clear events
      const unlistenClear = await listen<string>('annotation-clear', (event) => {
        if (!mounted) return
        const participantId = event.payload
        setStrokes((prev) => prev.filter((s) => s.participantId !== participantId))
      })

      // Listen for clear all events
      const unlistenClearAll = await listen('annotation-clear-all', () => {
        if (!mounted) return
        setStrokes([])
      })

      return () => {
        unlistenStroke()
        unlistenClear()
        unlistenClearAll()
      }
    }

    const cleanupPromise = setupListeners()

    return () => {
      mounted = false
      cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [])

  // Resize canvas to fill viewport
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      redrawStrokes()
    }

    // Initial resize
    resizeCanvas()

    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [redrawStrokes])

  // Redraw when strokes change
  useEffect(() => {
    redrawStrokes()
  }, [strokes, redrawStrokes])

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
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}
