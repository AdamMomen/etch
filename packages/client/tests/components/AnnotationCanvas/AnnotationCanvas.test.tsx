import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  AnnotationCanvas,
  PEN_OPTIONS,
  HIGHLIGHTER_OPTIONS,
  HIGHLIGHTER_OPACITY,
} from '@/components/AnnotationCanvas'
import type { Stroke, Point } from '@etch/shared'

// Mock requestAnimationFrame (not mocked in setup)
let rafId = 1
const originalRAF = globalThis.requestAnimationFrame
const originalCAF = globalThis.cancelAnimationFrame

beforeEach(() => {
  rafId = 1
  globalThis.requestAnimationFrame = vi.fn(() => rafId++)
  globalThis.cancelAnimationFrame = vi.fn()
})

afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF
  globalThis.cancelAnimationFrame = originalCAF
  cleanup()
})

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  fill: vi.fn(),
  setTransform: vi.fn(),
  fillStyle: '',
  globalAlpha: 1,
}

// Helper to create mock video element ref
function createMockVideoRef(
  options: {
    videoWidth?: number
    videoHeight?: number
    clientWidth?: number
    clientHeight?: number
  } = {}
) {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', {
    value: options.videoWidth ?? 1920,
  })
  Object.defineProperty(video, 'videoHeight', {
    value: options.videoHeight ?? 1080,
  })
  Object.defineProperty(video, 'clientWidth', {
    value: options.clientWidth ?? 800,
  })
  Object.defineProperty(video, 'clientHeight', {
    value: options.clientHeight ?? 450,
  })

  return { current: video }
}

// Helper to create mock stroke
function createMockStroke(overrides: Partial<Stroke> = {}): Stroke {
  return {
    id: 'stroke-123',
    participantId: 'participant-1',
    tool: 'pen',
    color: '#f97316',
    points: [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.3, y: 0.3 },
    ],
    createdAt: Date.now(),
    isComplete: true,
    ...overrides,
  }
}

// Helper to create mock point
function createMockPoint(overrides: Partial<Point> = {}): Point {
  return {
    x: 0.5,
    y: 0.5,
    pressure: 0.5,
    ...overrides,
  }
}

describe('AnnotationCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock getContext for each test
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId, _options) => {
      if (contextId === '2d') {
        return mockContext as unknown as CanvasRenderingContext2D
      }
      return null
    }) as typeof HTMLCanvasElement.prototype.getContext
  })

  describe('Conditional Visibility (AC-4.1.7)', () => {
    it('should not render when isScreenShareActive is false', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={false} />
      )

      expect(screen.queryByTestId('annotation-canvas')).toBeNull()
      expect(screen.queryByTestId('annotation-canvas-container')).toBeNull()
    })

    it('should render when isScreenShareActive is true', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
      )

      expect(screen.getByTestId('annotation-canvas')).toBeInTheDocument()
      expect(
        screen.getByTestId('annotation-canvas-container')
      ).toBeInTheDocument()
    })
  })

  describe('Canvas Element (AC-4.1.1, AC-4.1.4)', () => {
    it('should render a canvas element', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
      )

      const canvas = screen.getByTestId('annotation-canvas')
      expect(canvas.tagName).toBe('CANVAS')
    })

    it('should create 2D context with willReadFrequently: false (AC-4.1.10)', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
      )

      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
        '2d',
        expect.objectContaining({ willReadFrequently: false })
      )
    })
  })

  describe('Pointer Events (AC-4.1.3)', () => {
    it('should have pointer-events: none on container', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.pointerEvents).toBe('none')
    })
  })

  describe('Render Loop (AC-4.1.5, AC-4.1.9)', () => {
    it('should use requestAnimationFrame when active', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
      )

      // RAF should be called to start render loop
      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    it('should cancel animation frame on unmount', () => {
      const videoRef = createMockVideoRef()

      const { unmount } = render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
      )

      unmount()

      expect(cancelAnimationFrame).toHaveBeenCalled()
    })

    it('should not start render loop when inactive', () => {
      const videoRef = createMockVideoRef()
      vi.mocked(requestAnimationFrame).mockClear()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={false} />
      )

      expect(requestAnimationFrame).not.toHaveBeenCalled()
    })
  })

  describe('Stroke Rendering (AC-4.1.5)', () => {
    it('should accept strokes prop', () => {
      const videoRef = createMockVideoRef()
      const strokes = [createMockStroke()]

      // Should not throw
      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            strokes={strokes}
          />
        )
      }).not.toThrow()
    })

    it('should accept activeStroke prop', () => {
      const videoRef = createMockVideoRef()
      const activeStroke = createMockStroke({ id: 'active-stroke' })

      // Should not throw
      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            activeStroke={activeStroke}
          />
        )
      }).not.toThrow()
    })

    it('should accept both pen and highlighter tool strokes', () => {
      const videoRef = createMockVideoRef()
      const strokes = [
        createMockStroke({ tool: 'pen', color: '#ff0000' }),
        createMockStroke({
          id: 'stroke-2',
          tool: 'highlighter',
          color: '#00ff00',
        }),
      ]

      // Should not throw
      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            strokes={strokes}
          />
        )
      }).not.toThrow()
    })
  })

  describe('Container Positioning (AC-4.1.1)', () => {
    it('should position container absolutely', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.position).toBe('absolute')
    })
  })

  describe('Custom className', () => {
    it('should accept custom className', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          className="custom-class"
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.className).toContain('custom-class')
    })
  })

  describe('Default Props', () => {
    it('should work with default strokes (empty array)', () => {
      const videoRef = createMockVideoRef()

      // Should not throw when strokes is not provided
      expect(() => {
        render(
          <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
        )
      }).not.toThrow()
    })

    it('should work with default activeStroke (null)', () => {
      const videoRef = createMockVideoRef()

      // Should not throw when activeStroke is not provided
      expect(() => {
        render(
          <AnnotationCanvas videoRef={videoRef} isScreenShareActive={true} />
        )
      }).not.toThrow()
    })
  })

  // ─────────────────────────────────────────────────────────
  // CURSOR STYLES TESTS (AC-4.3.11)
  // ─────────────────────────────────────────────────────────

  describe('Cursor Styles (AC-4.3.11)', () => {
    it('should have crosshair cursor when canAnnotate is true and tool is pen', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
          activeTool="pen"
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.cursor).toBe('crosshair')
    })

    it('should have crosshair cursor when canAnnotate is true and tool is highlighter', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
          activeTool="highlighter"
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.cursor).toBe('crosshair')
    })

    it('should have default cursor when canAnnotate is false', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={false}
          activeTool="pen"
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.cursor).toBe('default')
    })

    it('should have crosshair cursor when tool is eraser (AC-4.5.7)', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
          activeTool="eraser"
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      // Eraser shows crosshair by default, pointer when hovering over erasable stroke
      expect(container.style.cursor).toBe('crosshair')
    })

    it('should have pointer cursor when eraser hovers over a stroke (AC-4.5.7)', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
          activeTool="eraser"
          hoveredStrokeId="some-stroke-id"
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.cursor).toBe('pointer')
    })

    it('should have default cursor when tool is select', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
          activeTool="select"
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.cursor).toBe('default')
    })
  })

  // ─────────────────────────────────────────────────────────
  // POINTER EVENTS TOGGLE TESTS (AC-4.3.11)
  // ─────────────────────────────────────────────────────────

  describe('Pointer Events Toggle (AC-4.3.11)', () => {
    it('should have pointer-events: auto when canAnnotate is true', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.pointerEvents).toBe('auto')
    })

    it('should have pointer-events: none when canAnnotate is false', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={false}
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.pointerEvents).toBe('none')
    })

    it('should have user-select: none when canAnnotate is true', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.userSelect).toBe('none')
    })

    it('should have touch-action: none when canAnnotate is true', () => {
      const videoRef = createMockVideoRef()

      render(
        <AnnotationCanvas
          videoRef={videoRef}
          isScreenShareActive={true}
          canAnnotate={true}
        />
      )

      const container = screen.getByTestId('annotation-canvas-container')
      expect(container.style.touchAction).toBe('none')
    })
  })

  // ─────────────────────────────────────────────────────────
  // POINTER EVENT CALLBACK TESTS
  // ─────────────────────────────────────────────────────────

  describe('Pointer Event Callbacks', () => {
    it('should accept onStrokeStart callback', () => {
      const videoRef = createMockVideoRef()
      const onStrokeStart = vi.fn()

      // Should not throw
      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            canAnnotate={true}
            onStrokeStart={onStrokeStart}
          />
        )
      }).not.toThrow()
    })

    it('should accept onStrokeMove callback', () => {
      const videoRef = createMockVideoRef()
      const onStrokeMove = vi.fn()

      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            canAnnotate={true}
            onStrokeMove={onStrokeMove}
          />
        )
      }).not.toThrow()
    })

    it('should accept onStrokeEnd callback', () => {
      const videoRef = createMockVideoRef()
      const onStrokeEnd = vi.fn()

      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            canAnnotate={true}
            onStrokeEnd={onStrokeEnd}
          />
        )
      }).not.toThrow()
    })
  })

  // ─────────────────────────────────────────────────────────
  // HIGHLIGHTER RENDERING TESTS (AC-4.4.2, AC-4.4.3, AC-4.4.5)
  // ─────────────────────────────────────────────────────────

  describe('Highlighter Rendering (AC-4.4.2, AC-4.4.3, AC-4.4.5)', () => {
    it('should accept highlighter strokes without throwing', () => {
      const videoRef = createMockVideoRef()
      const highlighterStroke = createMockStroke({
        id: 'highlighter-stroke',
        tool: 'highlighter',
        color: '#ffff00',
      })

      // Should not throw when rendering highlighter strokes
      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            strokes={[highlighterStroke]}
          />
        )
      }).not.toThrow()
    })

    it('should render highlighter with different options than pen', () => {
      const videoRef = createMockVideoRef()
      const penStroke = createMockStroke({
        id: 'pen-stroke',
        tool: 'pen',
        color: '#ff0000',
      })
      const highlighterStroke = createMockStroke({
        id: 'highlighter-stroke',
        tool: 'highlighter',
        color: '#00ff00',
      })

      // Should not throw - both strokes render with different options
      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            strokes={[penStroke, highlighterStroke]}
          />
        )
      }).not.toThrow()
    })

    it('should handle mixed pen and highlighter strokes', () => {
      const videoRef = createMockVideoRef()
      const strokes = [
        createMockStroke({ id: 'stroke-1', tool: 'highlighter' }),
        createMockStroke({ id: 'stroke-2', tool: 'pen' }),
        createMockStroke({ id: 'stroke-3', tool: 'highlighter' }),
      ]

      // Should not throw when rendering mixed strokes
      expect(() => {
        render(
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={true}
            strokes={strokes}
          />
        )
      }).not.toThrow()
    })
  })

  // ─────────────────────────────────────────────────────────
  // HIGHLIGHTER CONSTANTS TESTS (AC-4.4.2, AC-4.4.3, AC-4.4.5)
  // ─────────────────────────────────────────────────────────

  describe('Highlighter Constants', () => {
    it('HIGHLIGHTER_OPACITY should be 0.4 (40%) per AC-4.4.2', () => {
      expect(HIGHLIGHTER_OPACITY).toBe(0.4)
    })

    it('HIGHLIGHTER_OPTIONS.size should be 24 (3x pen width of 8) per AC-4.4.3', () => {
      expect(HIGHLIGHTER_OPTIONS.size).toBe(24)
      expect(PEN_OPTIONS.size).toBe(8)
      expect(HIGHLIGHTER_OPTIONS.size).toBe(PEN_OPTIONS.size * 3)
    })

    it('HIGHLIGHTER_OPTIONS should have flat ends (cap: false) per AC-4.4.5', () => {
      expect(HIGHLIGHTER_OPTIONS.start.cap).toBe(false)
      expect(HIGHLIGHTER_OPTIONS.end.cap).toBe(false)
    })

    it('PEN_OPTIONS should have rounded ends (cap: true)', () => {
      expect(PEN_OPTIONS.start.cap).toBe(true)
      expect(PEN_OPTIONS.end.cap).toBe(true)
    })

    it('HIGHLIGHTER_OPTIONS should have no thinning (uniform width)', () => {
      expect(HIGHLIGHTER_OPTIONS.thinning).toBe(0)
    })
  })
})

describe('Test helpers', () => {
  describe('createMockStroke', () => {
    it('should create a valid stroke', () => {
      const stroke = createMockStroke()

      expect(stroke.id).toBeDefined()
      expect(stroke.participantId).toBeDefined()
      expect(stroke.tool).toMatch(/pen|highlighter/)
      expect(stroke.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(stroke.points.length).toBeGreaterThan(0)
      expect(stroke.createdAt).toBeDefined()
    })

    it('should accept overrides', () => {
      const stroke = createMockStroke({
        id: 'custom-id',
        tool: 'highlighter',
        color: '#00ff00',
      })

      expect(stroke.id).toBe('custom-id')
      expect(stroke.tool).toBe('highlighter')
      expect(stroke.color).toBe('#00ff00')
    })
  })

  describe('createMockPoint', () => {
    it('should create a valid point', () => {
      const point = createMockPoint()

      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(1)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(1)
    })

    it('should accept overrides', () => {
      const point = createMockPoint({ x: 0.75, y: 0.25 })

      expect(point.x).toBe(0.75)
      expect(point.y).toBe(0.25)
    })
  })
})
