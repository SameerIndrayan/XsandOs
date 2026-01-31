import { CanvasDimensions } from '../types/annotations';

/**
 * Viewport-aware positioning for tooltips/callouts on canvas
 * Ensures tooltips never overflow the video frame bounds
 */

export interface TooltipBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedTooltip {
  x: number;
  y: number;
  placement: 'top' | 'right' | 'bottom' | 'left';
}

const SAFE_MARGIN = 8;
const OFFSET = 8;

/**
 * Calculate tooltip position with viewport-aware clamping
 * Uses flip() and shift() logic similar to Floating UI
 * 
 * @param anchorX - Anchor point X (canvas coordinates)
 * @param anchorY - Anchor point Y (canvas coordinates)
 * @param tooltipWidth - Width of the tooltip
 * @param tooltipHeight - Height of the tooltip
 * @param dimensions - Canvas dimensions and bounds
 * @param preferredPlacement - Preferred placement side
 * @returns Positioned tooltip with clamped coordinates and final placement
 */
export function calculateTooltipPosition(
  anchorX: number,
  anchorY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  dimensions: CanvasDimensions,
  preferredPlacement: 'top' | 'right' | 'bottom' | 'left' = 'top'
): PositionedTooltip {
  const bounds = {
    minX: dimensions.offsetX + SAFE_MARGIN,
    minY: dimensions.offsetY + SAFE_MARGIN,
    maxX: dimensions.offsetX + dimensions.width - SAFE_MARGIN,
    maxY: dimensions.offsetY + dimensions.height - SAFE_MARGIN,
  };

  // Calculate positions for each placement option
  const placements = {
    top: {
      x: anchorX - tooltipWidth / 2,
      y: anchorY - tooltipHeight - OFFSET,
      placement: 'top' as const,
    },
    bottom: {
      x: anchorX - tooltipWidth / 2,
      y: anchorY + OFFSET,
      placement: 'bottom' as const,
    },
    left: {
      x: anchorX - tooltipWidth - OFFSET,
      y: anchorY - tooltipHeight / 2,
      placement: 'left' as const,
    },
    right: {
      x: anchorX + OFFSET,
      y: anchorY - tooltipHeight / 2,
      placement: 'right' as const,
    },
  };

  // Try preferred placement first
  let bestPlacement = placements[preferredPlacement];
  let bestScore = calculatePlacementScore(bestPlacement, tooltipWidth, tooltipHeight, bounds);

  // Try other placements and find the best one (flip logic)
  for (const [placement, pos] of Object.entries(placements)) {
    if (placement === preferredPlacement) continue;
    
    const score = calculatePlacementScore(pos, tooltipWidth, tooltipHeight, bounds);
    if (score > bestScore) {
      bestScore = score;
      bestPlacement = pos;
    }
  }

  // Clamp the final position (shift logic)
  const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX - tooltipWidth, bestPlacement.x));
  const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY - tooltipHeight, bestPlacement.y));

  return {
    x: clampedX,
    y: clampedY,
    placement: bestPlacement.placement,
  };
}

/**
 * Calculate a score for a placement option
 * Higher score = better fit (less overflow)
 */
function calculatePlacementScore(
  position: { x: number; y: number },
  width: number,
  height: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): number {
  const overflowX = Math.max(0, bounds.minX - position.x) + Math.max(0, position.x + width - bounds.maxX);
  const overflowY = Math.max(0, bounds.minY - position.y) + Math.max(0, position.y + height - bounds.maxY);
  
  // Score is inverse of overflow (less overflow = higher score)
  // Add bonus for being within bounds
  const withinBounds = overflowX === 0 && overflowY === 0 ? 1000 : 0;
  
  return withinBounds - overflowX - overflowY;
}

/**
 * Calculate arrow label position with viewport-aware clamping
 * Arrow labels are positioned at the midpoint of the arrow
 */
export function calculateArrowLabelPosition(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  labelWidth: number,
  labelHeight: number,
  dimensions: CanvasDimensions
): PositionedTooltip {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  return calculateTooltipPosition(
    midX,
    midY,
    labelWidth,
    labelHeight,
    dimensions,
    'top'
  );
}

/**
 * Calculate terminology box position with viewport-aware clamping
 * Terminology boxes use the term's x,y as anchor point
 */
export function calculateTerminologyPosition(
  anchorX: number,
  anchorY: number,
  boxWidth: number,
  boxHeight: number,
  dimensions: CanvasDimensions
): PositionedTooltip {
  // Determine preferred placement based on anchor position
  const centerX = dimensions.offsetX + dimensions.width / 2;
  const centerY = dimensions.offsetY + dimensions.height / 2;
  
  let preferredPlacement: 'top' | 'right' | 'bottom' | 'left' = 'top';
  
  if (anchorX < centerX && anchorY < centerY) {
    preferredPlacement = 'right'; // Top-left quadrant -> place right
  } else if (anchorX >= centerX && anchorY < centerY) {
    preferredPlacement = 'left'; // Top-right quadrant -> place left
  } else if (anchorX < centerX && anchorY >= centerY) {
    preferredPlacement = 'right'; // Bottom-left quadrant -> place right
  } else {
    preferredPlacement = 'left'; // Bottom-right quadrant -> place left
  }

  return calculateTooltipPosition(
    anchorX,
    anchorY,
    boxWidth,
    boxHeight,
    dimensions,
    preferredPlacement
  );
}
