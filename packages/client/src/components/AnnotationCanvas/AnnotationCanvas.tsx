import { useEffect, useRef, useCallback, useMemo } from 'react'
import { getStroke } from 'perfect-freehand'
import type { Point, Stroke } from '@nameless/shared'
import { getPointerCoordinates } from '@/utils/coordinates'
import type { Tool } from '@/stores/annotationStore'

/**
 * Props for the AnnotationCanvas component.
 * The canvas overlays a video element and renders annotation strokes.
 */
export interface AnnotationCanvasProps {
  /** Reference to the video element to overlay */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Whether screen sharing is currently active */
  isScreenShareActive: boolean
  /** Array of completed strokes to render */
  strokes?: Stroke[]
  /** Currently in-progress stroke (being drawn) */
  activeStroke?: Stroke | null
  /** Additional CSS classes */
  className?: string
  /** Whether the local user can draw annotations */
  canAnnotate?: boolean
  /** Currently active drawing tool */
  activeTool?: Tool
  /** Called when user starts drawing (pointer down) */
  onStrokeStart?: (point: Point) => void
  /** Called when user continues drawing (pointer move) */
  onStrokeMove?: (point: Point) => void
  /** Called when user finishes drawing (pointer up) */
  onStrokeEnd?: () => void
}

// Perfect Freehand options for pen tool
export const PEN_OPTIONS = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
}

// Perfect Freehand options for highlighter tool (wider, flatter)
// AC-4.4.3: size 24 (3x pen width of 8)
// AC-4.4.5: cap: false for flat ends
export const HIGHLIGHTER_OPTIONS = {
  size: 24,
  thinning: 0,
  smoothing: 0.5,
  streamline: 0.3,
  easing: (t: number) => t,
  start: { taper: 0, cap: false },
  end: { taper: 0, cap: false },
}

// Highlighter opacity (40% per spec - AC-4.4.2)
export const HIGHLIGHTER_OPACITY = 0.4

/**
 * Converts normalized [0,1] coordinates to canvas pixel coordinates.
 */
function denormalizePoint(
  point: Point,
  width: number,
  height: number
): [number, number, number] {
  return [point.x * width, point.y * height, point.pressure ?? 0.5]
}

/**
 * Converts an array of stroke outline points to an SVG path string.
 * Used with getStroke from perfect-freehand.
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
 * Renders a single stroke to the canvas context.
 */
function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (stroke.points.length < 2) return

  // Convert normalized points to pixel coordinates for perfect-freehand
  const pixelPoints = stroke.points.map((p) =>
    denormalizePoint(p, canvasWidth, canvasHeight)
  )

  // Get stroke options based on tool type
  const options = stroke.tool === 'highlighter' ? HIGHLIGHTER_OPTIONS : PEN_OPTIONS

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
 * AnnotationCanvas renders a transparent overlay on top of a video element
 * to display annotation strokes. It matches the video dimensions and handles
 * resize automatically.
 *
 * Per architecture spec:
 * - Uses HTML Canvas 2D context with willReadFrequently: false (GPU-accelerated)
 * - Uses requestAnimationFrame for 60fps render loop
 * - Coordinates are normalized [0,1] and transformed at render time
 * - Canvas has pointer-events: none (click-through by default)
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */
export function AnnotationCanvas({
  videoRef,
  isScreenShareActive,
  strokes = [],
  activeStroke = null,
  className,
  canAnnotate = false,
  activeTool = 'pen',
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafIdRef = useRef<number | null>(null)
  const isDrawingRef = useRef(false)

  /**
   * Calculates the actual rendered video dimensions accounting for letterboxing.
   * Videos with object-fit: contain may have black bars.
   */
  const getVideoContentRect = useCallback((): {
    width: number
    height: number
    offsetX: number
    offsetY: number
  } | null => {
    const video = videoRef.current
    if (!video) return null

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    if (!videoWidth || !videoHeight) return null

    const containerWidth = video.clientWidth
    const containerHeight = video.clientHeight
    if (!containerWidth || !containerHeight) return null

    const videoAspect = videoWidth / videoHeight
    const containerAspect = containerWidth / containerHeight

    let renderWidth: number
    let renderHeight: number
    let offsetX: number
    let offsetY: number

    if (videoAspect > containerAspect) {
      // Video is wider than container - pillarbox (black bars top/bottom)
      renderWidth = containerWidth
      renderHeight = containerWidth / videoAspect
      offsetX = 0
      offsetY = (containerHeight - renderHeight) / 2
    } else {
      // Video is taller than container - letterbox (black bars left/right)
      renderHeight = containerHeight
      renderWidth = containerHeight * videoAspect
      offsetX = (containerWidth - renderWidth) / 2
      offsetY = 0
    }

    return {
      width: Math.round(renderWidth),
      height: Math.round(renderHeight),
      offsetX: Math.round(offsetX),
      offsetY: Math.round(offsetY),
    }
  }, [videoRef])

  /**
   * Updates canvas dimensions to match video content area.
   */
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = getVideoContentRect()
    if (!rect) return

    // Update canvas position and size
    container.style.left = `${rect.offsetX}px`
    container.style.top = `${rect.offsetY}px`
    container.style.width = `${rect.width}px`
    container.style.height = `${rect.height}px`

    // Set canvas resolution (actual pixel dimensions)
    // Use devicePixelRatio for sharp rendering on retina displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    // Scale context for retina
    const ctx = ctxRef.current
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }, [getVideoContentRect])

  /**
   * Render loop - clears canvas and redraws all strokes.
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    const rect = getVideoContentRect()
    if (!rect) return

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Render all completed strokes
    for (const stroke of strokes) {
      renderStroke(ctx, stroke, rect.width, rect.height)
    }

    // Render active stroke (in-progress)
    if (activeStroke) {
      renderStroke(ctx, activeStroke, rect.width, rect.height)
    }
  }, [strokes, activeStroke, getVideoContentRect])

  /**
   * Initialize canvas context with optimal settings.
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get 2D context with GPU-accelerated settings (AC-4.1.10)
    const ctx = canvas.getContext('2d', {
      willReadFrequently: false,
      alpha: true,
    })

    ctxRef.current = ctx
  }, [])

  /**
   * Set up ResizeObserver to track video element size changes.
   */
  useEffect(() => {
    if (!isScreenShareActive) return

    const video = videoRef.current
    if (!video) return

    // Update dimensions immediately
    updateCanvasDimensions()

    // Set up ResizeObserver for video element
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasDimensions()
    })

    resizeObserver.observe(video)

    // Also listen for video metadata load (to get accurate dimensions)
    const handleLoadedMetadata = () => {
      updateCanvasDimensions()
    }
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      resizeObserver.disconnect()
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [isScreenShareActive, videoRef, updateCanvasDimensions])

  // ─────────────────────────────────────────────────────────
  // POINTER EVENT HANDLERS
  // ─────────────────────────────────────────────────────────

  /**
   * Handles pointer down event - starts a new stroke.
   */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Only handle primary button (left click / touch)
      if (event.button !== 0) return

      // Only draw if allowed and tool is pen or highlighter
      if (!canAnnotate || (activeTool !== 'pen' && activeTool !== 'highlighter')) {
        return
      }

      const container = containerRef.current
      if (!container) return

      // Set pointer capture for reliable drag tracking
      container.setPointerCapture(event.pointerId)

      // Get normalized coordinates
      const point = getPointerCoordinates(event, container)

      isDrawingRef.current = true
      onStrokeStart?.(point)
    },
    [canAnnotate, activeTool, onStrokeStart]
  )

  /**
   * Handles pointer move event - continues the stroke.
   */
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current) return

      const container = containerRef.current
      if (!container) return

      // Get normalized coordinates
      const point = getPointerCoordinates(event, container)

      onStrokeMove?.(point)
    },
    [onStrokeMove]
  )

  /**
   * Handles pointer up event - completes the stroke.
   */
  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current) return

      const container = containerRef.current
      if (container) {
        container.releasePointerCapture(event.pointerId)
      }

      isDrawingRef.current = false
      onStrokeEnd?.()
    },
    [onStrokeEnd]
  )

  /**
   * Handles pointer leaving the canvas area.
   * Completes the stroke if drawing was in progress.
   */
  const handlePointerLeave = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // If we have pointer capture, don't end on leave
      const container = containerRef.current
      if (container?.hasPointerCapture(event.pointerId)) {
        return
      }

      if (isDrawingRef.current) {
        isDrawingRef.current = false
        onStrokeEnd?.()
      }
    },
    [onStrokeEnd]
  )

  /**
   * Animation frame loop for 60fps rendering.
   */
  useEffect(() => {
    if (!isScreenShareActive) {
      // Cancel any pending frame when not active
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    const frameLoop = () => {
      render()
      rafIdRef.current = requestAnimationFrame(frameLoop)
    }

    // Start the render loop
    rafIdRef.current = requestAnimationFrame(frameLoop)

    // Cleanup on unmount or when inactive
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isScreenShareActive, render])

  /**
   * Memoized check for whether to render (performance optimization)
   */
  const shouldRender = useMemo(() => {
    return isScreenShareActive
  }, [isScreenShareActive])

  // Don't render if screen share is not active (AC-4.1.7)
  if (!shouldRender) {
    return null
  }

  // Determine cursor style based on canAnnotate and activeTool (AC-4.3.11)
  const canDraw = canAnnotate && (activeTool === 'pen' || activeTool === 'highlighter')
  const cursorStyle = canDraw ? 'crosshair' : 'default'

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        // Toggle pointer-events based on canAnnotate (AC-4.3.11)
        pointerEvents: canAnnotate ? 'auto' : 'none',
        overflow: 'hidden',
        cursor: cursorStyle,
        // Prevent text selection while drawing
        userSelect: canAnnotate ? 'none' : undefined,
        // Disable touch actions while drawing to prevent scroll
        touchAction: canAnnotate ? 'none' : undefined,
      }}
      data-testid="annotation-canvas-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none', // Canvas itself doesn't receive events
        }}
        data-testid="annotation-canvas"
      />
    </div>
  )
}

