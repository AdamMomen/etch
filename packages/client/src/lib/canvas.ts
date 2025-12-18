/**
 * Canvas rendering and hit-testing utilities for annotations.
 *
 * Per tech spec:
 * - Hit-testing uses bounding box for fast rejection
 * - Precise detection via point-to-line-segment distance
 * - Coordinates are normalized [0,1]
 *
 * @see docs/sprint-artifacts/tech-spec-epic-4.md
 */

import type { Point, Stroke } from '@nameless/shared'

/**
 * Bounding box interface for stroke hit-testing.
 */
export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Default hit threshold for eraser tool (normalized coordinates).
 * Represents approximately 2% of canvas width/height.
 */
export const DEFAULT_HIT_THRESHOLD = 0.02

/**
 * Calculates the bounding box of a stroke.
 *
 * @param stroke - The stroke to calculate bounds for
 * @returns Bounding box with min/max coordinates
 */
export function getStrokeBounds(stroke: Stroke): BoundingBox {
  if (stroke.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of stroke.points) {
    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Checks if a point is within the expanded bounding box of a stroke.
 *
 * @param point - The point to test
 * @param bounds - The bounding box
 * @param threshold - Expansion threshold for the bounding box
 * @returns True if point is within expanded bounds
 */
export function isPointInBounds(
  point: Point,
  bounds: BoundingBox,
  threshold: number
): boolean {
  return (
    point.x >= bounds.minX - threshold &&
    point.x <= bounds.maxX + threshold &&
    point.y >= bounds.minY - threshold &&
    point.y <= bounds.maxY + threshold
  )
}

/**
 * Calculates the shortest distance from a point to a line segment.
 *
 * @param point - The point to measure from
 * @param lineStart - Start of the line segment
 * @param lineEnd - End of the line segment
 * @returns Distance from point to nearest point on line segment
 */
export function pointToLineSegmentDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  // Handle degenerate case where line segment is a point
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    const pdx = point.x - lineStart.x
    const pdy = point.y - lineStart.y
    return Math.sqrt(pdx * pdx + pdy * pdy)
  }

  // Calculate projection parameter t
  // t = 0 means closest point is lineStart
  // t = 1 means closest point is lineEnd
  // t in (0,1) means closest point is on the segment
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
        lengthSquared
    )
  )

  // Find the closest point on the line segment
  const closestX = lineStart.x + t * dx
  const closestY = lineStart.y + t * dy

  // Calculate distance to closest point
  const distX = point.x - closestX
  const distY = point.y - closestY
  return Math.sqrt(distX * distX + distY * distY)
}

/**
 * Determines if a point is on or near a stroke path.
 *
 * Algorithm:
 * 1. Fast rejection: check bounding box first
 * 2. Precise check: minimum distance to any line segment in stroke path
 *
 * @param point - The point to test (normalized [0,1] coordinates)
 * @param stroke - The stroke to test against
 * @param threshold - Maximum distance to consider "on" stroke (default: 0.02)
 * @returns True if point is within threshold distance of stroke
 */
export function isPointOnStroke(
  point: Point,
  stroke: Stroke,
  threshold: number = DEFAULT_HIT_THRESHOLD
): boolean {
  // Need at least 2 points to form a line segment
  if (stroke.points.length < 2) {
    // For single point, check distance to that point
    if (stroke.points.length === 1) {
      const dx = point.x - stroke.points[0].x
      const dy = point.y - stroke.points[0].y
      return Math.sqrt(dx * dx + dy * dy) <= threshold
    }
    return false
  }

  // Step 1: Fast rejection using bounding box
  const bounds = getStrokeBounds(stroke)
  if (!isPointInBounds(point, bounds, threshold)) {
    return false
  }

  // Step 2: Precise check - find minimum distance to any line segment
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i]
    const p2 = stroke.points[i + 1]
    const distance = pointToLineSegmentDistance(point, p1, p2)
    if (distance <= threshold) {
      return true
    }
  }

  return false
}

/**
 * Finds all strokes that contain a given point.
 *
 * @param point - The point to test
 * @param strokes - Array of strokes to search
 * @param threshold - Hit threshold (default: 0.02)
 * @returns Array of strokes that the point hits
 */
export function findStrokesAtPoint(
  point: Point,
  strokes: Stroke[],
  threshold: number = DEFAULT_HIT_THRESHOLD
): Stroke[] {
  return strokes.filter((stroke) => isPointOnStroke(point, stroke, threshold))
}

/**
 * Finds the topmost (most recently drawn) stroke at a point.
 * Since strokes are rendered in array order, the last matching stroke
 * is visually on top.
 *
 * @param point - The point to test
 * @param strokes - Array of strokes to search
 * @param threshold - Hit threshold (default: 0.02)
 * @returns The topmost stroke at point, or null if none found
 */
export function findTopmostStrokeAtPoint(
  point: Point,
  strokes: Stroke[],
  threshold: number = DEFAULT_HIT_THRESHOLD
): Stroke | null {
  // Iterate in reverse to find topmost (last drawn) stroke first
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (isPointOnStroke(point, strokes[i], threshold)) {
      return strokes[i]
    }
  }
  return null
}
