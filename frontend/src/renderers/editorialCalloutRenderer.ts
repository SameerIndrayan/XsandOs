import { EditorialCallout, CanvasDimensions } from '../types/annotations';
import { toCanvasCoords } from '../utils/coordinates';
import { calculateTerminologyPosition } from '../utils/tooltipPositioning';

/**
 * Render editorial callouts (time-based, max 3 total)
 * These are the only callouts shown - no frame-based terminology
 */
export const renderEditorialCallouts = (
  ctx: CanvasRenderingContext2D,
  callouts: EditorialCallout[],
  dimensions: CanvasDimensions
): void => {
  if (callouts.length === 0) {
    return;
  }
  
  console.log('[EditorialCalloutRenderer] Rendering', callouts.length, 'callouts:', callouts.map(c => ({ id: c.id, text: c.text })));
  
  for (const callout of callouts) {
    const anchorPos = toCanvasCoords({ x: callout.anchor.x, y: callout.anchor.y }, dimensions);

    // Responsive sizing
    const titleFontSize = Math.max(16, dimensions.width * 0.020);
    const detailFontSize = Math.max(12, dimensions.width * 0.014);
    const padding = Math.max(16, dimensions.width * 0.020);
    const maxWidth = Math.min(300, dimensions.width * 0.30);

    ctx.save();

    // Measure text to size box
    ctx.font = `bold ${titleFontSize}px Inter, sans-serif`;
    const titleWidth = ctx.measureText(callout.text).width;

    ctx.font = `${detailFontSize}px Inter, sans-serif`;
    const detailWidth = ctx.measureText(callout.detail).width;
    const detailHeight = detailFontSize * 1.4;

    const boxWidth = Math.max(titleWidth + padding * 2, Math.min(maxWidth, detailWidth + padding * 2));
    const boxHeight = titleFontSize + detailHeight + padding * 2.5;

    // Calculate viewport-aware position
    const boxPos = calculateTerminologyPosition(
      anchorPos.x,
      anchorPos.y,
      boxWidth,
      boxHeight,
      dimensions
    );

    // Draw box with gradient background
    const gradient = ctx.createLinearGradient(boxPos.x, boxPos.y, boxPos.x, boxPos.y + boxHeight);
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.95)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.98)');

    // Box shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    ctx.beginPath();
    ctx.roundRect(boxPos.x, boxPos.y, boxWidth, boxHeight, 10);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Border with accent color
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Accent bar on left side
    ctx.beginPath();
    ctx.roundRect(boxPos.x, boxPos.y, 4, boxHeight, [10, 0, 0, 10]);
    ctx.fillStyle = '#6366f1';
    ctx.fill();

    // Title (callout text)
    ctx.font = `bold ${titleFontSize}px Inter, sans-serif`;
    ctx.fillStyle = '#a5b4fc'; // Indigo-300
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(callout.text, boxPos.x + padding + 4, boxPos.y + padding);

    // Detail (explanation)
    ctx.font = `${detailFontSize}px Inter, sans-serif`;
    ctx.fillStyle = '#e2e8f0'; // Slate-200
    const detailY = boxPos.y + padding + titleFontSize + 8;
    ctx.fillText(callout.detail, boxPos.x + padding + 4, detailY);

    ctx.restore();
  }
};
