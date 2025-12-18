import { describe, it, expect } from 'vitest'
import {
  getStrokeBounds,
  isPointInBounds,
  pointToLineSegmentDistance,
  isPointOnStroke,
  findStrokesAtPoint,
  findTopmostStrokeAtPoint,
  DEFAULT_HIT_THRESHOLD,
} from '@/lib/canvas'
import type { Point, Stroke } from '@nameless/shared'

// ─────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────

function createPoint(x: number, y: number): Point {
  return { x, y }
}

function createStroke(
  points: Point[],
  options: Partial<Stroke> = {}
): Stroke {
  return {
    id: options.id ?? 'test-stroke',
    participantId: options.participantId ?? 'participant-1',
    tool: options.tool ?? 'pen',
    color: options.color ?? '#ff0000',
    points,
    createdAt: options.createdAt ?? Date.now(),
    isComplete: options.isComplete ?? true,
  }
}

// ─────────────────────────────────────────────────────────
// getStrokeBounds TESTS
// ─────────────────────────────────────────────────────────

describe('getStrokeBounds', () => {
  it('returns zero bounds for empty stroke', () => {
    const stroke = createStroke([])
    const bounds = getStrokeBounds(stroke)
    expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  it('returns point bounds for single-point stroke', () => {
    const stroke = createStroke([createPoint(0.5, 0.5)])
    const bounds = getStrokeBounds(stroke)
    expect(bounds).toEqual({ minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 })
  })

  it('calculates correct bounds for multi-point stroke', () => {
    const stroke = createStroke([
      createPoint(0.1, 0.2),
      createPoint(0.5, 0.8),
      createPoint(0.9, 0.1),
    ])
    const bounds = getStrokeBounds(stroke)
    expect(bounds.minX).toBeCloseTo(0.1)
    expect(bounds.minY).toBeCloseTo(0.1)
    expect(bounds.maxX).toBeCloseTo(0.9)
    expect(bounds.maxY).toBeCloseTo(0.8)
  })

  it('handles negative coordinates', () => {
    const stroke = createStroke([
      createPoint(-0.1, -0.2),
      createPoint(0.3, 0.4),
    ])
    const bounds = getStrokeBounds(stroke)
    expect(bounds.minX).toBeCloseTo(-0.1)
    expect(bounds.minY).toBeCloseTo(-0.2)
    expect(bounds.maxX).toBeCloseTo(0.3)
    expect(bounds.maxY).toBeCloseTo(0.4)
  })
})

// ─────────────────────────────────────────────────────────
// isPointInBounds TESTS
// ─────────────────────────────────────────────────────────

describe('isPointInBounds', () => {
  const bounds = { minX: 0.2, minY: 0.2, maxX: 0.8, maxY: 0.8 }

  it('returns true for point inside bounds', () => {
    expect(isPointInBounds(createPoint(0.5, 0.5), bounds, 0)).toBe(true)
  })

  it('returns true for point on bounds edge', () => {
    expect(isPointInBounds(createPoint(0.2, 0.5), bounds, 0)).toBe(true)
    expect(isPointInBounds(createPoint(0.8, 0.5), bounds, 0)).toBe(true)
    expect(isPointInBounds(createPoint(0.5, 0.2), bounds, 0)).toBe(true)
    expect(isPointInBounds(createPoint(0.5, 0.8), bounds, 0)).toBe(true)
  })

  it('returns false for point outside bounds', () => {
    expect(isPointInBounds(createPoint(0.1, 0.5), bounds, 0)).toBe(false)
    expect(isPointInBounds(createPoint(0.9, 0.5), bounds, 0)).toBe(false)
    expect(isPointInBounds(createPoint(0.5, 0.1), bounds, 0)).toBe(false)
    expect(isPointInBounds(createPoint(0.5, 0.9), bounds, 0)).toBe(false)
  })

  it('returns true for point within threshold of bounds', () => {
    // Point is 0.05 outside bounds, threshold is 0.1
    expect(isPointInBounds(createPoint(0.15, 0.5), bounds, 0.1)).toBe(true)
    expect(isPointInBounds(createPoint(0.85, 0.5), bounds, 0.1)).toBe(true)
  })

  it('returns false for point outside threshold', () => {
    // Point is 0.15 outside bounds, threshold is 0.1
    expect(isPointInBounds(createPoint(0.05, 0.5), bounds, 0.1)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────
// pointToLineSegmentDistance TESTS
// ─────────────────────────────────────────────────────────

describe('pointToLineSegmentDistance', () => {
  it('calculates distance to horizontal line', () => {
    const lineStart = createPoint(0.2, 0.5)
    const lineEnd = createPoint(0.8, 0.5)

    // Point directly above the middle of line
    const dist1 = pointToLineSegmentDistance(createPoint(0.5, 0.6), lineStart, lineEnd)
    expect(dist1).toBeCloseTo(0.1)

    // Point directly below line start
    const dist2 = pointToLineSegmentDistance(createPoint(0.2, 0.3), lineStart, lineEnd)
    expect(dist2).toBeCloseTo(0.2)
  })

  it('calculates distance to vertical line', () => {
    const lineStart = createPoint(0.5, 0.2)
    const lineEnd = createPoint(0.5, 0.8)

    // Point directly to the right of line center
    const dist = pointToLineSegmentDistance(createPoint(0.7, 0.5), lineStart, lineEnd)
    expect(dist).toBeCloseTo(0.2)
  })

  it('calculates distance to line endpoint when point is past end', () => {
    const lineStart = createPoint(0.2, 0.2)
    const lineEnd = createPoint(0.4, 0.4)

    // Point is beyond line end
    const point = createPoint(0.6, 0.6)
    const dist = pointToLineSegmentDistance(point, lineStart, lineEnd)
    // Distance to (0.4, 0.4) should be sqrt(0.2^2 + 0.2^2) ≈ 0.283
    expect(dist).toBeCloseTo(Math.sqrt(0.08))
  })

  it('calculates distance to line start when point is before start', () => {
    const lineStart = createPoint(0.4, 0.4)
    const lineEnd = createPoint(0.6, 0.6)

    // Point is before line start
    const point = createPoint(0.2, 0.2)
    const dist = pointToLineSegmentDistance(point, lineStart, lineEnd)
    // Distance to (0.4, 0.4) should be sqrt(0.2^2 + 0.2^2) ≈ 0.283
    expect(dist).toBeCloseTo(Math.sqrt(0.08))
  })

  it('handles degenerate line (point)', () => {
    const lineStart = createPoint(0.5, 0.5)
    const lineEnd = createPoint(0.5, 0.5)

    const dist = pointToLineSegmentDistance(createPoint(0.6, 0.5), lineStart, lineEnd)
    expect(dist).toBeCloseTo(0.1)
  })

  it('returns zero for point on line', () => {
    const lineStart = createPoint(0.2, 0.2)
    const lineEnd = createPoint(0.8, 0.8)

    // Point on the line
    const dist = pointToLineSegmentDistance(createPoint(0.5, 0.5), lineStart, lineEnd)
    expect(dist).toBeCloseTo(0, 5)
  })
})

// ─────────────────────────────────────────────────────────
// isPointOnStroke TESTS (AC-4.5.3)
// ─────────────────────────────────────────────────────────

describe('isPointOnStroke (AC-4.5.3)', () => {
  it('returns false for empty stroke', () => {
    const stroke = createStroke([])
    expect(isPointOnStroke(createPoint(0.5, 0.5), stroke)).toBe(false)
  })

  it('detects point on single-point stroke', () => {
    const stroke = createStroke([createPoint(0.5, 0.5)])
    // Point close to stroke point
    expect(isPointOnStroke(createPoint(0.51, 0.5), stroke)).toBe(true)
    // Point far from stroke point
    expect(isPointOnStroke(createPoint(0.8, 0.8), stroke)).toBe(false)
  })

  it('detects point directly on stroke path', () => {
    const stroke = createStroke([
      createPoint(0.2, 0.5),
      createPoint(0.8, 0.5),
    ])
    // Point on the line
    expect(isPointOnStroke(createPoint(0.5, 0.5), stroke)).toBe(true)
  })

  it('detects point near stroke path within threshold', () => {
    const stroke = createStroke([
      createPoint(0.2, 0.5),
      createPoint(0.8, 0.5),
    ])
    // Point slightly above line (within default threshold of 0.02)
    expect(isPointOnStroke(createPoint(0.5, 0.51), stroke)).toBe(true)
  })

  it('rejects point far from stroke path', () => {
    const stroke = createStroke([
      createPoint(0.2, 0.5),
      createPoint(0.8, 0.5),
    ])
    // Point far from line
    expect(isPointOnStroke(createPoint(0.5, 0.8), stroke)).toBe(false)
  })

  it('uses custom threshold when provided', () => {
    const stroke = createStroke([
      createPoint(0.2, 0.5),
      createPoint(0.8, 0.5),
    ])
    // Point 0.1 away from line
    const point = createPoint(0.5, 0.6)
    expect(isPointOnStroke(point, stroke, 0.05)).toBe(false)
    expect(isPointOnStroke(point, stroke, 0.15)).toBe(true)
  })

  it('rejects point outside bounding box (fast rejection)', () => {
    const stroke = createStroke([
      createPoint(0.2, 0.2),
      createPoint(0.4, 0.4),
    ])
    // Point well outside bounding box
    expect(isPointOnStroke(createPoint(0.9, 0.9), stroke)).toBe(false)
  })

  it('detects point on complex multi-segment stroke', () => {
    const stroke = createStroke([
      createPoint(0.1, 0.1),
      createPoint(0.3, 0.3),
      createPoint(0.5, 0.1),
      createPoint(0.7, 0.3),
      createPoint(0.9, 0.1),
    ])
    // Point on second segment
    expect(isPointOnStroke(createPoint(0.4, 0.2), stroke)).toBe(true)
    // Point not on any segment
    expect(isPointOnStroke(createPoint(0.3, 0.1), stroke)).toBe(false)
  })

  it('detects point near stroke endpoint', () => {
    const stroke = createStroke([
      createPoint(0.2, 0.2),
      createPoint(0.5, 0.5),
    ])
    // Point near start
    expect(isPointOnStroke(createPoint(0.21, 0.2), stroke)).toBe(true)
    // Point near end
    expect(isPointOnStroke(createPoint(0.5, 0.51), stroke)).toBe(true)
  })

  it('uses DEFAULT_HIT_THRESHOLD when no threshold specified', () => {
    const stroke = createStroke([
      createPoint(0.5, 0.5),
      createPoint(0.6, 0.5),
    ])
    // Point within DEFAULT_HIT_THRESHOLD distance (slightly closer than threshold)
    const point = createPoint(0.55, 0.5 + DEFAULT_HIT_THRESHOLD * 0.9)
    expect(isPointOnStroke(point, stroke)).toBe(true)

    // Point outside DEFAULT_HIT_THRESHOLD distance
    const farPoint = createPoint(0.55, 0.5 + DEFAULT_HIT_THRESHOLD * 1.5)
    expect(isPointOnStroke(farPoint, stroke)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────
// findStrokesAtPoint TESTS
// ─────────────────────────────────────────────────────────

describe('findStrokesAtPoint', () => {
  it('returns empty array when no strokes match', () => {
    const strokes = [
      createStroke([createPoint(0.1, 0.1), createPoint(0.2, 0.2)], { id: 'stroke-1' }),
      createStroke([createPoint(0.8, 0.8), createPoint(0.9, 0.9)], { id: 'stroke-2' }),
    ]
    const result = findStrokesAtPoint(createPoint(0.5, 0.5), strokes)
    expect(result).toHaveLength(0)
  })

  it('returns single matching stroke', () => {
    const strokes = [
      createStroke([createPoint(0.4, 0.5), createPoint(0.6, 0.5)], { id: 'stroke-1' }),
      createStroke([createPoint(0.1, 0.1), createPoint(0.2, 0.2)], { id: 'stroke-2' }),
    ]
    const result = findStrokesAtPoint(createPoint(0.5, 0.5), strokes)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('stroke-1')
  })

  it('returns multiple overlapping strokes', () => {
    const strokes = [
      createStroke([createPoint(0.4, 0.5), createPoint(0.6, 0.5)], { id: 'stroke-1' }),
      createStroke([createPoint(0.5, 0.4), createPoint(0.5, 0.6)], { id: 'stroke-2' }),
    ]
    // Point at intersection
    const result = findStrokesAtPoint(createPoint(0.5, 0.5), strokes)
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id).sort()).toEqual(['stroke-1', 'stroke-2'])
  })

  it('respects custom threshold', () => {
    const strokes = [
      createStroke([createPoint(0.4, 0.5), createPoint(0.6, 0.5)], { id: 'stroke-1' }),
    ]
    // Point 0.1 away from stroke
    const point = createPoint(0.5, 0.6)
    expect(findStrokesAtPoint(point, strokes, 0.05)).toHaveLength(0)
    expect(findStrokesAtPoint(point, strokes, 0.15)).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────
// findTopmostStrokeAtPoint TESTS (AC-4.5.4)
// ─────────────────────────────────────────────────────────

describe('findTopmostStrokeAtPoint (AC-4.5.4)', () => {
  it('returns null when no strokes match', () => {
    const strokes = [
      createStroke([createPoint(0.1, 0.1), createPoint(0.2, 0.2)], { id: 'stroke-1' }),
    ]
    const result = findTopmostStrokeAtPoint(createPoint(0.5, 0.5), strokes)
    expect(result).toBeNull()
  })

  it('returns the stroke when only one matches', () => {
    const strokes = [
      createStroke([createPoint(0.4, 0.5), createPoint(0.6, 0.5)], { id: 'stroke-1' }),
    ]
    const result = findTopmostStrokeAtPoint(createPoint(0.5, 0.5), strokes)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('stroke-1')
  })

  it('returns topmost (last in array) stroke when multiple match', () => {
    const strokes = [
      createStroke([createPoint(0.4, 0.5), createPoint(0.6, 0.5)], {
        id: 'stroke-bottom',
        createdAt: 1000,
      }),
      createStroke([createPoint(0.5, 0.4), createPoint(0.5, 0.6)], {
        id: 'stroke-top',
        createdAt: 2000,
      }),
    ]
    // Point at intersection
    const result = findTopmostStrokeAtPoint(createPoint(0.5, 0.5), strokes)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('stroke-top')
  })

  it('returns null for empty strokes array', () => {
    const result = findTopmostStrokeAtPoint(createPoint(0.5, 0.5), [])
    expect(result).toBeNull()
  })

  it('respects custom threshold', () => {
    const strokes = [
      createStroke([createPoint(0.4, 0.5), createPoint(0.6, 0.5)], { id: 'stroke-1' }),
    ]
    // Point 0.1 away from stroke
    const point = createPoint(0.5, 0.6)
    expect(findTopmostStrokeAtPoint(point, strokes, 0.05)).toBeNull()
    expect(findTopmostStrokeAtPoint(point, strokes, 0.15)?.id).toBe('stroke-1')
  })
})
