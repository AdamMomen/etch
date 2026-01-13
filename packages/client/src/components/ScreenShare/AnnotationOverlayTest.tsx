import { useState, useCallback, useRef, useEffect } from 'react'
import type { Stroke } from '@etch/shared'

/**
 * Test harness for AnnotationOverlayPage
 *
 * This component provides a standalone test environment for the annotation overlay.
 * Access via /overlay-test route to test drawing without screen sharing.
 *
 * Features:
 * - Add test strokes with different tools and colors
 * - Toggle drawing mode
 * - Clear all strokes
 * - Visual feedback of current state
 */
export function AnnotationOverlayTest() {
  const [testStrokes, setTestStrokes] = useState<Stroke[]>([])
  const [isDrawMode, setIsDrawMode] = useState(false)

  // Generate a test stroke
  const addTestStroke = useCallback(
    (tool: 'pen' | 'highlighter', color: string) => {
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        participantId: 'test-user',
        tool,
        color,
        points: generateRandomStrokePoints(),
        createdAt: Date.now(),
        isComplete: true,
      }
      setTestStrokes((prev) => [...prev, stroke])

      // Emit to overlay via window event (simulating Tauri event)
      window.dispatchEvent(
        new CustomEvent('test-overlay-stroke', { detail: stroke })
      )
    },
    []
  )

  const clearStrokes = useCallback(() => {
    setTestStrokes([])
    window.dispatchEvent(new CustomEvent('test-overlay-clear'))
  }, [])

  const toggleDrawMode = useCallback(() => {
    setIsDrawMode((prev) => !prev)
    window.dispatchEvent(
      new CustomEvent('test-overlay-draw-mode', {
        detail: { enabled: !isDrawMode },
      })
    )
  }, [isDrawMode])

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Control Panel */}
      <div
        style={{
          width: 300,
          padding: 20,
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Annotation Overlay Test</h2>

        <div style={{ borderBottom: '1px solid #333', paddingBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#888' }}>
            Add Test Strokes
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => addTestStroke('pen', '#ef4444')}
              style={buttonStyle}
            >
              Red Pen Stroke
            </button>
            <button
              onClick={() => addTestStroke('pen', '#22c55e')}
              style={buttonStyle}
            >
              Green Pen Stroke
            </button>
            <button
              onClick={() => addTestStroke('pen', '#3b82f6')}
              style={buttonStyle}
            >
              Blue Pen Stroke
            </button>
            <button
              onClick={() => addTestStroke('highlighter', '#facc15')}
              style={buttonStyle}
            >
              Yellow Highlighter
            </button>
            <button
              onClick={() => addTestStroke('highlighter', '#f97316')}
              style={buttonStyle}
            >
              Orange Highlighter
            </button>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #333', paddingBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#888' }}>
            Drawing Mode
          </h3>
          <button
            onClick={toggleDrawMode}
            style={{
              ...buttonStyle,
              background: isDrawMode ? '#22c55e' : '#333',
            }}
          >
            {isDrawMode ? 'Drawing Mode: ON' : 'Drawing Mode: OFF'}
          </button>
          <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            Or press Shift+D to toggle
          </p>
        </div>

        <div style={{ borderBottom: '1px solid #333', paddingBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#888' }}>
            Actions
          </h3>
          <button
            onClick={clearStrokes}
            style={{ ...buttonStyle, background: '#dc2626' }}
          >
            Clear All Strokes
          </button>
        </div>

        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#888' }}>
            Current State
          </h3>
          <div
            style={{
              background: '#0a0a0f',
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'monospace',
            }}
          >
            <div>Strokes: {testStrokes.length}</div>
            <div>Draw Mode: {isDrawMode ? 'ON' : 'OFF'}</div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 12, color: '#666' }}>
          <p>This test page simulates the annotation overlay.</p>
          <p>
            In production, the overlay runs in a separate Tauri window over the
            shared screen.
          </p>
        </div>
      </div>

      {/* Overlay Preview Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Simulated content behind overlay */}
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 40,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: 600,
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#333', margin: '0 0 16px' }}>
            Simulated Shared Content
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            This represents the content being shared. Annotations will appear on
            top of this area.
          </p>
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: '#f5f5f5',
              borderRadius: 8,
            }}
          >
            <code style={{ color: '#333' }}>
              function hello() {'{'}
              <br />
              &nbsp;&nbsp;console.log(&quot;Draw on me!&quot;);
              <br />
              {'}'}
            </code>
          </div>
        </div>

        {/* Overlay canvas container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: isDrawMode ? 'auto' : 'none',
          }}
        >
          <TestOverlayCanvas
            strokes={testStrokes}
            isDrawMode={isDrawMode}
            onStrokeComplete={(stroke) =>
              setTestStrokes((prev) => [...prev, stroke])
            }
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Simplified overlay canvas for testing
 */
function TestOverlayCanvas({
  strokes,
  isDrawMode,
  onStrokeComplete,
}: {
  strokes: Stroke[]
  isDrawMode: boolean
  onStrokeComplete: (stroke: Stroke) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null)
  const isDrawingRef = useRef(false)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    ctxRef.current = ctx

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Render strokes
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render all strokes
    const allStrokes = activeStroke ? [...strokes, activeStroke] : strokes
    for (const stroke of allStrokes) {
      renderTestStroke(ctx, stroke, canvas.offsetWidth, canvas.offsetHeight)
    }
  }, [strokes, activeStroke])

  // Handle drawing
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawMode) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        participantId: 'test-user',
        tool: 'pen',
        color: '#ef4444',
        points: [{ x, y, pressure: e.pressure || 0.5 }],
        createdAt: Date.now(),
        isComplete: false,
      }

      setActiveStroke(newStroke)
      isDrawingRef.current = true
    },
    [isDrawMode]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current || !activeStroke) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      setActiveStroke((prev) =>
        prev
          ? {
              ...prev,
              points: [...prev.points, { x, y, pressure: e.pressure || 0.5 }],
            }
          : null
      )
    },
    [activeStroke]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current || !activeStroke) return

    isDrawingRef.current = false
    const completed = { ...activeStroke, isComplete: true }
    onStrokeComplete(completed)
    setActiveStroke(null)
  }, [activeStroke, onStrokeComplete])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: '4px solid rgba(239, 68, 68, 0.8)',
        boxSizing: 'border-box',
        cursor: isDrawMode ? 'crosshair' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  )
}

// Simple stroke rendering for test
function renderTestStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number
) {
  if (stroke.points.length < 2) return

  ctx.save()
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.tool === 'highlighter' ? 20 : 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.4
  }

  ctx.beginPath()
  const firstPoint = stroke.points[0]
  ctx.moveTo(firstPoint.x * width, firstPoint.y * height)

  for (let i = 1; i < stroke.points.length; i++) {
    const point = stroke.points[i]
    ctx.lineTo(point.x * width, point.y * height)
  }

  ctx.stroke()
  ctx.restore()
}

// Generate random stroke points for testing
function generateRandomStrokePoints(): Stroke['points'] {
  const points: Stroke['points'] = []
  const startX = 0.1 + Math.random() * 0.3
  const startY = 0.1 + Math.random() * 0.3

  let x = startX
  let y = startY

  for (let i = 0; i < 20 + Math.floor(Math.random() * 30); i++) {
    points.push({ x, y, pressure: 0.5 + Math.random() * 0.3 })
    x += (Math.random() - 0.3) * 0.05
    y += (Math.random() - 0.3) * 0.05
    x = Math.max(0.05, Math.min(0.95, x))
    y = Math.max(0.05, Math.min(0.95, y))
  }

  return points
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: 6,
  background: '#333',
  color: 'white',
  cursor: 'pointer',
  fontSize: 14,
  textAlign: 'left',
}
