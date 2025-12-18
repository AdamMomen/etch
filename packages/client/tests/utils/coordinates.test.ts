import { describe, it, expect } from 'vitest'
import { normalizeCoordinates, getPointerCoordinates } from '@/utils/coordinates'

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
