/**
 * Utility functions for hex color validation and generation
 */

/**
 * Validates if a string is a valid hex color (e.g., "#FFD700")
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Generates a random hex color
 */
export function randomHex(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
}

/**
 * Common football annotation colors
 */
export const COLORS = {
  PLAYER_HIGHLIGHT: '#FFD700', // Gold
  PLAYER_NORMAL: '#FFFFFF',     // White
  ARROW: '#FF0000',              // Red
  TERMINOLOGY: '#00FF00',        // Green
} as const;
