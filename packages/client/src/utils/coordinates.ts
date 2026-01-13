import type { Point } from '@etch/shared'

/**
 * Normalizes pixel coordinates to [0, 1] range relative to canvas dimensions.
 * Used to store resolution-independent coordinates for annotations.
 *
 * Coordinate system: (0, 0) = top-left, (1, 1) = bottom-right
 *
 * @param pixelX - X position in pixels relative to canvas
 * @param pixelY - Y position in pixels relative to canvas
 * @param canvasWidth - Width of the canvas in pixels
 * @param canvasHeight - Height of the canvas in pixels
 * @param pressure - Optional pressure value from pointer event (0-1)
 * @returns Normalized Point with x, y in [0, 1] range
 *
 * @example
 * // Click at position (400, 300) on an 800x600 canvas
 * const point = normalizeCoordinates(400, 300, 800, 600)
 * // Returns: { x: 0.5, y: 0.5 }
 */
export function normalizeCoordinates(
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number,
  pressure?: number
): Point {
  // Handle edge case of zero dimensions
  if (canvasWidth === 0 || canvasHeight === 0) {
    return { x: 0, y: 0, pressure }
  }

  // Calculate normalized coordinates
  const normalizedX = pixelX / canvasWidth
  const normalizedY = pixelY / canvasHeight

  // Clamp to [0, 1] range to handle coordinates outside canvas bounds
  const x = Math.max(0, Math.min(1, normalizedX))
  const y = Math.max(0, Math.min(1, normalizedY))

  return { x, y, pressure }
}

/**
 * Denormalizes [0, 1] coordinates back to pixel coordinates.
 * Used at render time to convert stored coordinates to canvas pixels.
 *
 * Coordinate system: (0, 0) = top-left, (1, 1) = bottom-right
 *
 * @param normX - Normalized X coordinate [0, 1]
 * @param normY - Normalized Y coordinate [0, 1]
 * @param canvasWidth - Current canvas width in pixels
 * @param canvasHeight - Current canvas height in pixels
 * @returns Pixel coordinates { x, y }
 *
 * @example
 * // Convert center point to pixels on an 800x600 canvas
 * const pixel = denormalizeCoordinates(0.5, 0.5, 800, 600)
 * // Returns: { x: 400, y: 300 }
 */
export function denormalizeCoordinates(
  normX: number,
  normY: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: normX * canvasWidth,
    y: normY * canvasHeight,
  }
}

/**
 * Batch converts an array of pixel points to normalized [0, 1] coordinates.
 * Optimized for processing stroke point arrays.
 *
 * @param points - Array of pixel coordinate points
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns Array of normalized Points
 *
 * @example
 * const pixelPoints = [{ x: 400, y: 300 }, { x: 800, y: 600 }]
 * const normalized = normalizeStrokePoints(pixelPoints, 800, 600)
 * // Returns: [{ x: 0.5, y: 0.5 }, { x: 1, y: 1 }]
 */
export function normalizeStrokePoints(
  points: Array<{ x: number; y: number; pressure?: number }>,
  canvasWidth: number,
  canvasHeight: number
): Point[] {
  // Handle empty array
  if (points.length === 0) {
    return []
  }

  // Handle zero dimensions - return array of (0, 0) points
  if (canvasWidth === 0 || canvasHeight === 0) {
    return points.map((p) => ({ x: 0, y: 0, pressure: p.pressure }))
  }

  return points.map((p) => {
    const normalizedX = p.x / canvasWidth
    const normalizedY = p.y / canvasHeight

    return {
      x: Math.max(0, Math.min(1, normalizedX)),
      y: Math.max(0, Math.min(1, normalizedY)),
      pressure: p.pressure,
    }
  })
}

/**
 * Batch converts an array of normalized [0, 1] points to pixel coordinates.
 * Used at render time for efficient stroke rendering with perfect-freehand.
 *
 * @param points - Array of normalized Points
 * @param canvasWidth - Current canvas width in pixels
 * @param canvasHeight - Current canvas height in pixels
 * @returns Array of pixel coordinate points with pressure preserved
 *
 * @example
 * const normalizedPoints = [{ x: 0.5, y: 0.5 }, { x: 1, y: 1 }]
 * const pixels = denormalizeStrokePoints(normalizedPoints, 800, 600)
 * // Returns: [{ x: 400, y: 300 }, { x: 800, y: 600 }]
 */
export function denormalizeStrokePoints(
  points: Point[],
  canvasWidth: number,
  canvasHeight: number
): Array<{ x: number; y: number; pressure?: number }> {
  // Handle empty array
  if (points.length === 0) {
    return []
  }

  return points.map((p) => ({
    x: p.x * canvasWidth,
    y: p.y * canvasHeight,
    pressure: p.pressure,
  }))
}

/**
 * Extracts normalized coordinates from a pointer event relative to a target element.
 * Handles the coordinate transformation from client space to element space to normalized space.
 *
 * @param event - The pointer event
 * @param element - The target element (typically the canvas container)
 * @returns Normalized Point with x, y in [0, 1] range
 */
export function getPointerCoordinates(
  event: PointerEvent | React.PointerEvent,
  element: HTMLElement
): Point {
  const rect = element.getBoundingClientRect()

  // Calculate position relative to element
  const pixelX = event.clientX - rect.left
  const pixelY = event.clientY - rect.top

  // Get pressure from pointer event (defaults to 0.5 for mouse)
  const pressure = event.pressure > 0 ? event.pressure : 0.5

  return normalizeCoordinates(pixelX, pixelY, rect.width, rect.height, pressure)
}
