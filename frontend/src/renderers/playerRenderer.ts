import { InterpolatedPlayer, CanvasDimensions } from '../types/annotations';
import { toCanvasCoords } from '../utils/coordinates';

/**
 * Render 3D-style elliptical highlights beneath players
 * Style: oval/ellipse on the ground plane like a spotlight or shadow
 */
export const renderPlayers = (
  ctx: CanvasRenderingContext2D,
  players: InterpolatedPlayer[],
  dimensions: CanvasDimensions,
  animationTime: number
): void => {
  for (const player of players) {
    if (player.opacity <= 0) continue;

    const pos = toCanvasCoords({ x: player.x, y: player.y }, dimensions);

    // Ellipse dimensions - wider than tall to simulate perspective on ground
    const ellipseWidth = Math.max(38, dimensions.width * 0.045);
    const ellipseHeight = ellipseWidth * 0.45; // Flattened for 3D ground perspective
    const strokeWidth = Math.max(3, dimensions.width * 0.0035);

    // Position ellipse at player's feet (below center point)
    const ellipseY = pos.y + ellipseHeight * 0.5;

    ctx.save();
    ctx.globalAlpha = player.opacity;

    // Highlighted players get extra glow effect
    if (player.highlight) {
      const pulse = Math.sin(animationTime / 300) * 0.1 + 0.9;

      // Outer glow ellipse
      ctx.beginPath();
      ctx.ellipse(pos.x, ellipseY, ellipseWidth + 6, (ellipseHeight + 4) * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = player.color + '30';
      ctx.fill();
    }

    // Main ellipse - semi-transparent fill for ground effect
    ctx.beginPath();
    ctx.ellipse(pos.x, ellipseY, ellipseWidth, ellipseHeight, 0, 0, Math.PI * 2);

    // Gradient fill for 3D depth effect
    const gradient = ctx.createRadialGradient(
      pos.x, ellipseY, 0,
      pos.x, ellipseY, ellipseWidth
    );
    gradient.addColorStop(0, player.color + '50'); // 30% opacity center
    gradient.addColorStop(0.7, player.color + '35'); // 20% opacity
    gradient.addColorStop(1, player.color + '15'); // 8% opacity edge

    ctx.fillStyle = gradient;
    ctx.fill();

    // Solid stroke ring
    ctx.strokeStyle = player.color;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();

    ctx.restore();
  }
};
