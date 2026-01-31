import { NormalizedPoint, CanvasPoint, CanvasDimensions } from '../types/annotations';

/**
 * Convert normalized coordinates (0-100) to canvas pixel coordinates
 */
export const toCanvasCoords = (
  normalized: NormalizedPoint,
  dimensions: CanvasDimensions
): CanvasPoint => {
  const { width, height, offsetX, offsetY } = dimensions;
  return {
    x: offsetX + (normalized.x / 100) * width,
    y: offsetY + (normalized.y / 100) * height,
  };
};

/**
 * Convert canvas pixel coordinates to normalized coordinates (0-100)
 */
export const toNormalizedCoords = (
  canvas: CanvasPoint,
  dimensions: CanvasDimensions
): NormalizedPoint => {
  const { width, height, offsetX, offsetY } = dimensions;
  return {
    x: ((canvas.x - offsetX) / width) * 100,
    y: ((canvas.y - offsetY) / height) * 100,
  };
};

/**
 * Calculate canvas dimensions with letterbox/pillarbox offsets
 * to handle aspect ratio differences between container and video
 */
export const calculateCanvasDimensions = (
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number
): CanvasDimensions => {
  const containerAspect = containerWidth / containerHeight;
  const videoAspect = videoWidth / videoHeight;

  let renderWidth: number;
  let renderHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > videoAspect) {
    // Container is wider than video - pillarbox (black bars on sides)
    renderHeight = containerHeight;
    renderWidth = renderHeight * videoAspect;
    offsetX = (containerWidth - renderWidth) / 2;
  } else {
    // Container is taller than video - letterbox (black bars top/bottom)
    renderWidth = containerWidth;
    renderHeight = renderWidth / videoAspect;
    offsetY = (containerHeight - renderHeight) / 2;
  }

  return {
    width: renderWidth,
    height: renderHeight,
    offsetX,
    offsetY,
    scale: renderWidth / videoWidth,
  };
};
