/**
 * Utility functions for percentage-based coordinates (0-100)
 */

/**
 * Clamps a number to the range 0-100
 */
export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Converts pixel coordinate to percentage (0-100)
 * @param pixel - Pixel coordinate
 * @param dimension - Total dimension (width or height)
 */
export function pixelToPercent(pixel: number, dimension: number): number {
  if (dimension === 0) return 0;
  return clampPercent((pixel / dimension) * 100);
}

/**
 * Converts percentage to pixel coordinate
 * @param percent - Percentage (0-100)
 * @param dimension - Total dimension (width or height)
 */
export function percentToPixel(percent: number, dimension: number): number {
  return (clampPercent(percent) / 100) * dimension;
}
