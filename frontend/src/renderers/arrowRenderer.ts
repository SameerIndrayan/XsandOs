import { InterpolatedArrow, CanvasDimensions } from '../types/annotations';
import { toCanvasCoords } from '../utils/coordinates';

/**
 * Render movement arrows on the canvas
 */
export const renderArrows = (
  ctx: CanvasRenderingContext2D,
  arrows: InterpolatedArrow[],
  dimensions: CanvasDimensions
): void => {
  for (const arrow of arrows) {
    if (arrow.opacity <= 0) continue;

    const from = toCanvasCoords({ x: arrow.from[0], y: arrow.from[1] }, dimensions);
    const to = toCanvasCoords({ x: arrow.to[0], y: arrow.to[1] }, dimensions);

    // Responsive sizing
    const lineWidth = Math.max(3, dimensions.width * 0.004);
    const arrowHeadSize = Math.max(12, dimensions.width * 0.015);

    ctx.save();
    ctx.globalAlpha = arrow.opacity;

    // Calculate angle for arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = arrow.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    if (arrow.dashed) {
      ctx.setLineDash([12, 6]);
    }

    // Add glow effect
    ctx.shadowColor = arrow.color;
    ctx.shadowBlur = 8;

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowHeadSize * Math.cos(angle - Math.PI / 6),
      to.y - arrowHeadSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - arrowHeadSize * Math.cos(angle + Math.PI / 6),
      to.y - arrowHeadSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = arrow.color;
    ctx.fill();

    // Draw label if present
    if (arrow.label) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const fontSize = Math.max(11, dimensions.width * 0.012);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      const textMetrics = ctx.measureText(arrow.label);
      const padding = 5;
      const pillHeight = fontSize + padding * 2;
      const pillWidth = textMetrics.width + padding * 3;

      // Background pill
      ctx.beginPath();
      const pillRadius = pillHeight / 2;
      ctx.roundRect(
        midX - pillWidth / 2,
        midY - pillHeight / 2,
        pillWidth,
        pillHeight,
        pillRadius
      );
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fill();

      // Border
      ctx.strokeStyle = arrow.color + '80';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arrow.label, midX, midY);
    }

    ctx.restore();
  }
};
