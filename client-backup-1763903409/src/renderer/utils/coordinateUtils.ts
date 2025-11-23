/**
 * Coordinate normalization utilities
 * All coordinates are normalized to [0,1] space for resolution independence
 */

/**
 * Normalize x coordinate to [0,1] range
 */
export function normalizeX(x: number, width: number): number {
  return Math.max(0, Math.min(1, x / width));
}

/**
 * Normalize y coordinate to [0,1] range
 */
export function normalizeY(y: number, height: number): number {
  return Math.max(0, Math.min(1, y / height));
}

/**
 * Normalize coordinates [x, y] to [0,1] range
 */
export function normalizeCoordinates(
  x: number,
  y: number,
  width: number,
  height: number
): [number, number] {
  return [normalizeX(x, width), normalizeY(y, height)];
}

/**
 * Denormalize x coordinate from [0,1] to pixel space
 */
export function denormalizeX(xNorm: number, width: number): number {
  return xNorm * width;
}

/**
 * Denormalize y coordinate from [0,1] to pixel space
 */
export function denormalizeY(yNorm: number, height: number): number {
  return yNorm * height;
}

/**
 * Denormalize coordinates from [0,1] to pixel space
 */
export function denormalizeCoordinates(
  xNorm: number,
  yNorm: number,
  width: number,
  height: number
): [number, number] {
  return [denormalizeX(xNorm, width), denormalizeY(yNorm, height)];
}

