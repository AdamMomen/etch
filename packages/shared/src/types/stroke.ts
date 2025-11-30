/**
 * Normalized point for resolution-independent coordinates.
 * All values are in the range [0.0, 1.0] representing
 * relative position on the canvas.
 */
export interface Point {
  /** X coordinate, normalized [0.0 - 1.0] */
  x: number
  /** Y coordinate, normalized [0.0 - 1.0] */
  y: number
  /** Optional pressure value for pressure-sensitive input */
  pressure?: number
}

/**
 * A stroke represents a single continuous drawing action.
 * Used for annotations on shared screens.
 */
export interface Stroke {
  /** Unique identifier for the stroke */
  id: string
  /** ID of the participant who created this stroke */
  participantId: string
  /** Drawing tool used */
  tool: 'pen' | 'highlighter'
  /** Hex color string for the stroke */
  color: string
  /** Array of points making up the stroke path */
  points: Point[]
  /** Unix timestamp in milliseconds when stroke was created */
  createdAt: number
}
