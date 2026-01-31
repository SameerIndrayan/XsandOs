import { InterpolatedTerminology, CanvasDimensions } from '../types/annotations';
import { toCanvasCoords } from '../utils/coordinates';
import { calculateTerminologyPosition } from '../utils/tooltipPositioning';

/**
 * Wrap text to fit within a maximum width
 */
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

/**
 * Render terminology boxes on the canvas
 */
export const renderTerminology = (
  ctx: CanvasRenderingContext2D,
  terminology: InterpolatedTerminology[],
  dimensions: CanvasDimensions
): void => {
  for (const term of terminology) {
    if (term.opacity <= 0) continue;

    const anchorPos = toCanvasCoords({ x: term.x, y: term.y }, dimensions);

    // Responsive sizing
    const titleFontSize = Math.max(14, dimensions.width * 0.018);
    const defFontSize = Math.max(11, dimensions.width * 0.013);
    const padding = Math.max(14, dimensions.width * 0.018);
    const maxWidth = Math.min(280, dimensions.width * 0.28);

    ctx.save();
    ctx.globalAlpha = term.opacity;

    // Measure text to size box
    ctx.font = `bold ${titleFontSize}px Inter, sans-serif`;
    const titleWidth = ctx.measureText(term.term).width;

    ctx.font = `${defFontSize}px Inter, sans-serif`;
    const defLines = wrapText(ctx, term.definition, maxWidth - padding * 2);
    const lineHeight = defFontSize * 1.4;
    const defHeight = defLines.length * lineHeight;

    const boxWidth = Math.max(titleWidth + padding * 2, maxWidth);
    const boxHeight = titleFontSize + defHeight + padding * 2.5;

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

    // Title
    ctx.font = `bold ${titleFontSize}px Inter, sans-serif`;
    ctx.fillStyle = '#a5b4fc'; // Indigo-300
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(term.term, boxPos.x + padding + 4, boxPos.y + padding);

    // Definition
    ctx.font = `${defFontSize}px Inter, sans-serif`;
    ctx.fillStyle = '#e2e8f0'; // Slate-200
    let yOffset = boxPos.y + padding + titleFontSize + 8;
    for (const line of defLines) {
      ctx.fillText(line, boxPos.x + padding + 4, yOffset);
      yOffset += lineHeight;
    }

    ctx.restore();
  }
};
