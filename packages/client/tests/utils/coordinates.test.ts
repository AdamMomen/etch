import { describe, it, expect } from 'vitest'
import {
  normalizeCoordinates,
  denormalizeCoordinates,
  normalizeStrokePoints,
  denormalizeStrokePoints,
  getPointerCoordinates,
} from '@/utils/coordinates'

describe('coordinates utilities', () => {
  // ─────────────────────────────────────────────────────────
  // normalizeCoordinates TESTS
  // ─────────────────────────────────────────────────────────

  describe('normalizeCoordinates', () => {
    it('normalizes center of canvas to (0.5, 0.5)', () => {
      const result = normalizeCoordinates(400, 300, 800, 600)
      expect(result.x).toBe(0.5)
      expect(result.y).toBe(0.5)
    })

    it('normalizes top-left corner to (0, 0)', () => {
      const result = normalizeCoordinates(0, 0, 800, 600)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('normalizes bottom-right corner to (1, 1)', () => {
      const result = normalizeCoordinates(800, 600, 800, 600)
      expect(result.x).toBe(1)
      expect(result.y).toBe(1)
    })

    it('clamps negative coordinates to 0', () => {
      const result = normalizeCoordinates(-50, -50, 800, 600)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('clamps coordinates beyond canvas to 1', () => {
      const result = normalizeCoordinates(1000, 800, 800, 600)
      expect(result.x).toBe(1)
      expect(result.y).toBe(1)
    })

    it('handles zero canvas dimensions gracefully', () => {
      const result = normalizeCoordinates(100, 100, 0, 0)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('handles zero width gracefully', () => {
      const result = normalizeCoordinates(100, 300, 0, 600)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('handles zero height gracefully', () => {
      const result = normalizeCoordinates(400, 300, 800, 0)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('preserves pressure value when provided', () => {
      const result = normalizeCoordinates(400, 300, 800, 600, 0.75)
      expect(result.pressure).toBe(0.75)
    })

    it('returns undefined pressure when not provided', () => {
      const result = normalizeCoordinates(400, 300, 800, 600)
      expect(result.pressure).toBeUndefined()
    })

    it('handles fractional pixel values', () => {
      const result = normalizeCoordinates(400.5, 300.5, 800, 600)
      expect(result.x).toBeCloseTo(0.5006, 4)
      expect(result.y).toBeCloseTo(0.5008, 4)
    })

    it('returns values in [0, 1] range for any valid input', () => {
      const testCases = [
        { pixelX: 0, pixelY: 0 },
        { pixelX: 100, pixelY: 50 },
        { pixelX: 800, pixelY: 600 },
        { pixelX: 400, pixelY: 300 },
      ]

      for (const { pixelX, pixelY } of testCases) {
        const result = normalizeCoordinates(pixelX, pixelY, 800, 600)
        expect(result.x).toBeGreaterThanOrEqual(0)
        expect(result.x).toBeLessThanOrEqual(1)
        expect(result.y).toBeGreaterThanOrEqual(0)
        expect(result.y).toBeLessThanOrEqual(1)
      }
    })
  })

  // ─────────────────────────────────────────────────────────
  // denormalizeCoordinates TESTS (Story 4.9 AC-4.9.3)
  // ─────────────────────────────────────────────────────────

  describe('denormalizeCoordinates', () => {
    it('denormalizes center point (0.5, 0.5) to canvas center', () => {
      const result = denormalizeCoordinates(0.5, 0.5, 800, 600)
      expect(result.x).toBe(400)
      expect(result.y).toBe(300)
    })

    it('denormalizes top-left (0, 0) to pixel origin', () => {
      const result = denormalizeCoordinates(0, 0, 800, 600)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('denormalizes bottom-right (1, 1) to canvas dimensions', () => {
      const result = denormalizeCoordinates(1, 1, 800, 600)
      expect(result.x).toBe(800)
      expect(result.y).toBe(600)
    })

    it('handles different canvas dimensions', () => {
      const result = denormalizeCoordinates(0.5, 0.5, 1920, 1080)
      expect(result.x).toBe(960)
      expect(result.y).toBe(540)
    })

    it('handles retina/high-dpi canvas dimensions', () => {
      const result = denormalizeCoordinates(0.25, 0.75, 3200, 2400)
      expect(result.x).toBe(800)
      expect(result.y).toBe(1800)
    })

    it('handles small canvas dimensions', () => {
      const result = denormalizeCoordinates(0.5, 0.5, 100, 50)
      expect(result.x).toBe(50)
      expect(result.y).toBe(25)
    })

    it('produces correct values for arbitrary normalized coordinates', () => {
      const result = denormalizeCoordinates(0.123, 0.456, 1000, 500)
      expect(result.x).toBe(123)
      expect(result.y).toBe(228)
    })
  })

  // ─────────────────────────────────────────────────────────
  // Round-trip precision tests (Story 4.9 AC-4.9.5)
  // ─────────────────────────────────────────────────────────

  describe('round-trip precision', () => {
    it('normalize → denormalize produces original coordinates', () => {
      const originalX = 400
      const originalY = 300
      const width = 800
      const height = 600

      const normalized = normalizeCoordinates(originalX, originalY, width, height)
      const denormalized = denormalizeCoordinates(normalized.x, normalized.y, width, height)

      expect(denormalized.x).toBeCloseTo(originalX, 10)
      expect(denormalized.y).toBeCloseTo(originalY, 10)
    })

    it('maintains precision after multiple round-trips', () => {
      let x = 0.5
      let y = 0.5
      const width = 800
      const height = 600

      // Perform 10 round-trips
      for (let i = 0; i < 10; i++) {
        const pixels = denormalizeCoordinates(x, y, width, height)
        const normalized = normalizeCoordinates(pixels.x, pixels.y, width, height)
        x = normalized.x
        y = normalized.y
      }

      // Should still be exactly 0.5 (no drift)
      expect(x).toBe(0.5)
      expect(y).toBe(0.5)
    })

    it('handles edge coordinates without precision loss', () => {
      const testCases = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ]

      for (const { x, y } of testCases) {
        const denormalized = denormalizeCoordinates(x, y, 800, 600)
        const normalized = normalizeCoordinates(denormalized.x, denormalized.y, 800, 600)
        expect(normalized.x).toBe(x)
        expect(normalized.y).toBe(y)
      }
    })

    it('resize simulation: normalized coords render same relative position', () => {
      // Start with a point at center of 800x600 canvas
      const normalized = normalizeCoordinates(400, 300, 800, 600)
      expect(normalized.x).toBe(0.5)
      expect(normalized.y).toBe(0.5)

      // "Resize" to 1920x1080 - same normalized coords should give center
      const onLargerCanvas = denormalizeCoordinates(normalized.x, normalized.y, 1920, 1080)
      expect(onLargerCanvas.x).toBe(960) // center of 1920
      expect(onLargerCanvas.y).toBe(540) // center of 1080

      // "Resize" to 400x300 - same normalized coords should give center
      const onSmallerCanvas = denormalizeCoordinates(normalized.x, normalized.y, 400, 300)
      expect(onSmallerCanvas.x).toBe(200) // center of 400
      expect(onSmallerCanvas.y).toBe(150) // center of 300
    })
  })

  // ─────────────────────────────────────────────────────────
  // normalizeStrokePoints TESTS (Story 4.9 AC-4.9.1)
  // ─────────────────────────────────────────────────────────

  describe('normalizeStrokePoints', () => {
    it('converts an array of pixel points to normalized points', () => {
      const pixelPoints = [
        { x: 0, y: 0 },
        { x: 400, y: 300 },
        { x: 800, y: 600 },
      ]

      const result = normalizeStrokePoints(pixelPoints, 800, 600)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ x: 0, y: 0, pressure: undefined })
      expect(result[1]).toEqual({ x: 0.5, y: 0.5, pressure: undefined })
      expect(result[2]).toEqual({ x: 1, y: 1, pressure: undefined })
    })

    it('preserves pressure values', () => {
      const pixelPoints = [
        { x: 400, y: 300, pressure: 0.25 },
        { x: 800, y: 600, pressure: 0.75 },
      ]

      const result = normalizeStrokePoints(pixelPoints, 800, 600)

      expect(result[0].pressure).toBe(0.25)
      expect(result[1].pressure).toBe(0.75)
    })

    it('handles empty array', () => {
      const result = normalizeStrokePoints([], 800, 600)
      expect(result).toEqual([])
    })

    it('handles large array efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        x: i % 800,
        y: (i * 3) % 600,
        pressure: 0.5,
      }))

      const start = performance.now()
      const result = normalizeStrokePoints(largeArray, 800, 600)
      const elapsed = performance.now() - start

      expect(result).toHaveLength(1000)
      expect(elapsed).toBeLessThan(50) // Should complete in <50ms
    })

    it('clamps out-of-bounds values to [0, 1]', () => {
      const pixelPoints = [
        { x: -100, y: -50 },
        { x: 1000, y: 800 },
      ]

      const result = normalizeStrokePoints(pixelPoints, 800, 600)

      expect(result[0].x).toBe(0)
      expect(result[0].y).toBe(0)
      expect(result[1].x).toBe(1)
      expect(result[1].y).toBe(1)
    })

    it('handles zero canvas dimensions', () => {
      const pixelPoints = [{ x: 100, y: 50 }]

      const result = normalizeStrokePoints(pixelPoints, 0, 0)

      expect(result[0].x).toBe(0)
      expect(result[0].y).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────
  // denormalizeStrokePoints TESTS (Story 4.9 AC-4.9.3)
  // ─────────────────────────────────────────────────────────

  describe('denormalizeStrokePoints', () => {
    it('converts an array of normalized points to pixel points', () => {
      const normalizedPoints = [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ]

      const result = denormalizeStrokePoints(normalizedPoints, 800, 600)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ x: 0, y: 0, pressure: undefined })
      expect(result[1]).toEqual({ x: 400, y: 300, pressure: undefined })
      expect(result[2]).toEqual({ x: 800, y: 600, pressure: undefined })
    })

    it('preserves pressure values', () => {
      const normalizedPoints = [
        { x: 0.5, y: 0.5, pressure: 0.25 },
        { x: 1, y: 1, pressure: 0.75 },
      ]

      const result = denormalizeStrokePoints(normalizedPoints, 800, 600)

      expect(result[0].pressure).toBe(0.25)
      expect(result[1].pressure).toBe(0.75)
    })

    it('handles empty array', () => {
      const result = denormalizeStrokePoints([], 800, 600)
      expect(result).toEqual([])
    })

    it('handles large array efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        x: (i % 100) / 100,
        y: ((i * 3) % 100) / 100,
        pressure: 0.5,
      }))

      const start = performance.now()
      const result = denormalizeStrokePoints(largeArray, 800, 600)
      const elapsed = performance.now() - start

      expect(result).toHaveLength(1000)
      expect(elapsed).toBeLessThan(50) // Should complete in <50ms
    })

    it('works with different canvas dimensions (resize scenario)', () => {
      const normalizedPoints = [{ x: 0.5, y: 0.5 }]

      // Original 800x600 canvas
      const original = denormalizeStrokePoints(normalizedPoints, 800, 600)
      expect(original[0]).toEqual({ x: 400, y: 300, pressure: undefined })

      // Resized to 1920x1080
      const resized = denormalizeStrokePoints(normalizedPoints, 1920, 1080)
      expect(resized[0]).toEqual({ x: 960, y: 540, pressure: undefined })

      // Both should be at the center of their respective canvases
    })
  })

  // ─────────────────────────────────────────────────────────
  // Batch conversion round-trip tests (Story 4.9 AC-4.9.5)
  // ─────────────────────────────────────────────────────────

  describe('batch conversion round-trip', () => {
    it('normalizeStrokePoints → denormalizeStrokePoints produces original', () => {
      const originalPoints = [
        { x: 0, y: 0 },
        { x: 400, y: 300 },
        { x: 800, y: 600 },
        { x: 200, y: 450, pressure: 0.8 },
      ]

      const normalized = normalizeStrokePoints(originalPoints, 800, 600)
      const denormalized = denormalizeStrokePoints(normalized, 800, 600)

      expect(denormalized).toHaveLength(4)
      for (let i = 0; i < originalPoints.length; i++) {
        expect(denormalized[i].x).toBeCloseTo(originalPoints[i].x, 10)
        expect(denormalized[i].y).toBeCloseTo(originalPoints[i].y, 10)
        expect(denormalized[i].pressure).toBe(originalPoints[i].pressure)
      }
    })

    it('maintains precision after batch resize', () => {
      // Simulate: draw on 800x600, resize to 1920x1080, then back to 800x600
      const originalPoints = [
        { x: 200, y: 150 },
        { x: 400, y: 300 },
        { x: 600, y: 450 },
      ]

      // Normalize at original size
      const normalized = normalizeStrokePoints(originalPoints, 800, 600)

      // Denormalize at new size
      const atNewSize = denormalizeStrokePoints(normalized, 1920, 1080)
      expect(atNewSize[0].x).toBe(480) // 0.25 * 1920
      expect(atNewSize[1].x).toBe(960) // 0.5 * 1920

      // Re-normalize and denormalize back to original
      const reNormalized = normalizeStrokePoints(atNewSize, 1920, 1080)
      const backToOriginal = denormalizeStrokePoints(reNormalized, 800, 600)

      // Should match original positions
      for (let i = 0; i < originalPoints.length; i++) {
        expect(backToOriginal[i].x).toBeCloseTo(originalPoints[i].x, 10)
        expect(backToOriginal[i].y).toBeCloseTo(originalPoints[i].y, 10)
      }
    })
  })

  // ─────────────────────────────────────────────────────────
  // getPointerCoordinates TESTS
  // ─────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────
  // Integration tests: Coordinate flow (Story 4.9 AC-all)
  // ─────────────────────────────────────────────────────────

  describe('coordinate flow integration', () => {
    describe('full drawing flow: input → normalized → render', () => {
      it('simulates complete drawing cycle with coordinate transformation', () => {
        const canvasWidth = 800
        const canvasHeight = 600

        // Step 1: User draws at specific pixel positions
        const rawPixelPoints = [
          { x: 200, y: 150 }, // top-left quadrant
          { x: 400, y: 300 }, // center
          { x: 600, y: 450 }, // bottom-right quadrant
        ]

        // Step 2: Normalize on input (what useAnnotations does)
        const normalizedPoints = normalizeStrokePoints(rawPixelPoints, canvasWidth, canvasHeight)

        // Verify normalized values are in [0, 1] range
        expect(normalizedPoints[0]).toEqual({ x: 0.25, y: 0.25, pressure: undefined })
        expect(normalizedPoints[1]).toEqual({ x: 0.5, y: 0.5, pressure: undefined })
        expect(normalizedPoints[2]).toEqual({ x: 0.75, y: 0.75, pressure: undefined })

        // Step 3: Denormalize at render time (what AnnotationCanvas does)
        const renderedPixelPoints = denormalizeStrokePoints(normalizedPoints, canvasWidth, canvasHeight)

        // Verify rendered positions match original input
        expect(renderedPixelPoints[0]).toEqual({ x: 200, y: 150, pressure: undefined })
        expect(renderedPixelPoints[1]).toEqual({ x: 400, y: 300, pressure: undefined })
        expect(renderedPixelPoints[2]).toEqual({ x: 600, y: 450, pressure: undefined })
      })

      it('maintains pressure values through the flow', () => {
        const canvasWidth = 1920
        const canvasHeight = 1080

        // User draws with varying pressure
        const rawPoints = [
          { x: 960, y: 540, pressure: 0.2 },
          { x: 1000, y: 560, pressure: 0.5 },
          { x: 1040, y: 580, pressure: 0.8 },
        ]

        // Normalize → Denormalize
        const normalized = normalizeStrokePoints(rawPoints, canvasWidth, canvasHeight)
        const rendered = denormalizeStrokePoints(normalized, canvasWidth, canvasHeight)

        // Pressure should be preserved
        expect(rendered[0].pressure).toBe(0.2)
        expect(rendered[1].pressure).toBe(0.5)
        expect(rendered[2].pressure).toBe(0.8)
      })
    })

    describe('sync flow: normalized coordinates survive publish/receive', () => {
      it('coordinates are valid after simulated DataTrack transmission', () => {
        const senderCanvasWidth = 1920
        const senderCanvasHeight = 1080

        // Sender draws a stroke
        const senderPixels = [
          { x: 480, y: 270 }, // 0.25, 0.25
          { x: 960, y: 540 }, // 0.5, 0.5
          { x: 1440, y: 810 }, // 0.75, 0.75
        ]

        // Sender normalizes (before publish)
        const normalized = normalizeStrokePoints(senderPixels, senderCanvasWidth, senderCanvasHeight)

        // Simulate JSON serialization (what DataTrack does)
        const transmitted = JSON.stringify(normalized)
        const received = JSON.parse(transmitted)

        // Receiver has different canvas size
        const receiverCanvasWidth = 800
        const receiverCanvasHeight = 600

        // Receiver denormalizes
        const receiverPixels = denormalizeStrokePoints(received, receiverCanvasWidth, receiverCanvasHeight)

        // Verify relative positions match (same normalized values → same relative positions)
        expect(receiverPixels[0]).toEqual({ x: 200, y: 150, pressure: undefined }) // 0.25 * 800, 0.25 * 600
        expect(receiverPixels[1]).toEqual({ x: 400, y: 300, pressure: undefined }) // 0.5 * 800, 0.5 * 600
        expect(receiverPixels[2]).toEqual({ x: 600, y: 450, pressure: undefined }) // 0.75 * 800, 0.75 * 600
      })

      it('handles edge coordinates at canvas boundaries', () => {
        // Sender draws at edges
        const normalized = [
          { x: 0, y: 0 }, // top-left corner
          { x: 1, y: 0 }, // top-right corner
          { x: 0, y: 1 }, // bottom-left corner
          { x: 1, y: 1 }, // bottom-right corner
        ]

        // Simulate transmission
        const received = JSON.parse(JSON.stringify(normalized))

        // Receiver denormalizes
        const receiverPixels = denormalizeStrokePoints(received, 1600, 900)

        // Verify edge positions are correct
        expect(receiverPixels[0]).toEqual({ x: 0, y: 0, pressure: undefined })
        expect(receiverPixels[1]).toEqual({ x: 1600, y: 0, pressure: undefined })
        expect(receiverPixels[2]).toEqual({ x: 0, y: 900, pressure: undefined })
        expect(receiverPixels[3]).toEqual({ x: 1600, y: 900, pressure: undefined })
      })
    })

    describe('resize flow: annotations maintain relative position', () => {
      it('strokes stay at same relative position after resize', () => {
        // Original canvas size
        const originalWidth = 800
        const originalHeight = 600

        // User draws at center
        const originalPixels = [{ x: 400, y: 300 }]
        const normalized = normalizeStrokePoints(originalPixels, originalWidth, originalHeight)

        // Verify center position
        expect(normalized[0].x).toBe(0.5)
        expect(normalized[0].y).toBe(0.5)

        // Canvas resizes to fullscreen
        const newWidth = 1920
        const newHeight = 1080

        // Denormalize at new size
        const resizedPixels = denormalizeStrokePoints(normalized, newWidth, newHeight)

        // Should still be at center of new canvas
        expect(resizedPixels[0].x).toBe(960) // center of 1920
        expect(resizedPixels[0].y).toBe(540) // center of 1080
      })

      it('handles multiple resize cycles without position drift', () => {
        const normalized = [{ x: 0.333333, y: 0.666666 }]

        // Simulate multiple resize cycles
        const sizes = [
          { width: 800, height: 600 },
          { width: 1920, height: 1080 },
          { width: 400, height: 300 },
          { width: 800, height: 600 }, // back to original
        ]

        let currentNormalized = normalized

        for (const { width, height } of sizes) {
          const pixels = denormalizeStrokePoints(currentNormalized, width, height)
          currentNormalized = normalizeStrokePoints(pixels, width, height)
        }

        // After all cycles, normalized values should be preserved
        expect(currentNormalized[0].x).toBeCloseTo(0.333333, 5)
        expect(currentNormalized[0].y).toBeCloseTo(0.666666, 5)
      })

      it('handles aspect ratio changes correctly', () => {
        // Original 16:9 canvas
        const normalized = [
          { x: 0.5, y: 0.5 }, // center
          { x: 0.25, y: 0.25 }, // upper-left quarter
        ]

        // Resize to 4:3 canvas
        const widePixels = denormalizeStrokePoints(normalized, 1600, 900)
        const standardPixels = denormalizeStrokePoints(normalized, 800, 600)

        // Center point should be at center in both aspect ratios
        expect(widePixels[0]).toEqual({ x: 800, y: 450, pressure: undefined })
        expect(standardPixels[0]).toEqual({ x: 400, y: 300, pressure: undefined })

        // Quarter point should be at quarter position
        expect(widePixels[1]).toEqual({ x: 400, y: 225, pressure: undefined })
        expect(standardPixels[1]).toEqual({ x: 200, y: 150, pressure: undefined })
      })
    })

    describe('mocked canvas dimensions for deterministic testing', () => {
      it('produces consistent results with fixed dimensions', () => {
        // Mock canvas at 1000x1000 for easy calculation
        const mockWidth = 1000
        const mockHeight = 1000

        // Draw at grid positions
        const points = [
          { x: 100, y: 100 },
          { x: 250, y: 250 },
          { x: 500, y: 500 },
          { x: 750, y: 750 },
          { x: 900, y: 900 },
        ]

        const normalized = normalizeStrokePoints(points, mockWidth, mockHeight)

        // Verify predictable normalized values
        expect(normalized[0]).toEqual({ x: 0.1, y: 0.1, pressure: undefined })
        expect(normalized[1]).toEqual({ x: 0.25, y: 0.25, pressure: undefined })
        expect(normalized[2]).toEqual({ x: 0.5, y: 0.5, pressure: undefined })
        expect(normalized[3]).toEqual({ x: 0.75, y: 0.75, pressure: undefined })
        expect(normalized[4]).toEqual({ x: 0.9, y: 0.9, pressure: undefined })
      })

      it('handles real-world canvas dimensions from Tauri window', () => {
        // Simulate a Tauri window at common sizes
        const tauriSizes = [
          { width: 1280, height: 720 }, // 720p
          { width: 1920, height: 1080 }, // 1080p
          { width: 2560, height: 1440 }, // 1440p
          { width: 3840, height: 2160 }, // 4K
        ]

        const normalizedPoint = { x: 0.5, y: 0.5 }

        for (const { width, height } of tauriSizes) {
          const pixels = denormalizeCoordinates(normalizedPoint.x, normalizedPoint.y, width, height)

          // Should always be at center
          expect(pixels.x).toBe(width / 2)
          expect(pixels.y).toBe(height / 2)
        }
      })
    })
  })

  // ─────────────────────────────────────────────────────────
  // getPointerCoordinates TESTS
  // ─────────────────────────────────────────────────────────

  describe('getPointerCoordinates', () => {
    function createMockElement(
      left: number,
      top: number,
      width: number,
      height: number
    ): HTMLElement {
      const element = document.createElement('div')
      element.getBoundingClientRect = () => ({
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
        x: left,
        y: top,
        toJSON: () => ({}),
      })
      return element
    }

    function createMockPointerEvent(
      clientX: number,
      clientY: number,
      pressure: number = 0
    ): React.PointerEvent<HTMLElement> {
      return {
        clientX,
        clientY,
        pressure,
      } as React.PointerEvent<HTMLElement>
    }

    it('calculates normalized coordinates from pointer event', () => {
      const element = createMockElement(100, 100, 800, 600)
      const event = createMockPointerEvent(500, 400) // 400, 300 relative to element

      const result = getPointerCoordinates(event, element)
      expect(result.x).toBe(0.5)
      expect(result.y).toBe(0.5)
    })

    it('handles click at element origin', () => {
      const element = createMockElement(100, 100, 800, 600)
      const event = createMockPointerEvent(100, 100) // 0, 0 relative to element

      const result = getPointerCoordinates(event, element)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('handles click at element corner', () => {
      const element = createMockElement(100, 100, 800, 600)
      const event = createMockPointerEvent(900, 700) // 800, 600 relative to element

      const result = getPointerCoordinates(event, element)
      expect(result.x).toBe(1)
      expect(result.y).toBe(1)
    })

    it('defaults to 0.5 pressure when pressure is 0', () => {
      const element = createMockElement(0, 0, 800, 600)
      const event = createMockPointerEvent(400, 300, 0)

      const result = getPointerCoordinates(event, element)
      expect(result.pressure).toBe(0.5)
    })

    it('preserves pressure value when greater than 0', () => {
      const element = createMockElement(0, 0, 800, 600)
      const event = createMockPointerEvent(400, 300, 0.8)

      const result = getPointerCoordinates(event, element)
      expect(result.pressure).toBe(0.8)
    })

    it('clamps coordinates outside element bounds', () => {
      const element = createMockElement(100, 100, 800, 600)
      const event = createMockPointerEvent(50, 50) // -50, -50 relative to element

      const result = getPointerCoordinates(event, element)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })
  })
})
