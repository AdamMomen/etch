import type { Point } from '@nameless/shared'

/**
 * Normalizes pixel coordinates to [0, 1] range relative to canvas dimensions.
 * Used to store resolution-independent coordinates for annotations.
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
