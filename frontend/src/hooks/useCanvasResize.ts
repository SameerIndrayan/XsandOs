import { useEffect, useCallback, RefObject, useState } from 'react';
import { CanvasDimensions } from '../types/annotations';
import { calculateCanvasDimensions } from '../utils/coordinates';

/**
 * Hook to handle canvas resizing and maintain proper dimensions
 * relative to the video element
 */
export const useCanvasResize = (
  containerRef: RefObject<HTMLDivElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>
): CanvasDimensions => {
  const [dimensions, setDimensions] = useState<CanvasDimensions>({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });

  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    const containerRect = container.getBoundingClientRect();

    // Use video dimensions if available, otherwise default to 16:9
    const videoWidth = video?.videoWidth || 1920;
    const videoHeight = video?.videoHeight || 1080;

    // Calculate dimensions accounting for aspect ratio
    const newDimensions = calculateCanvasDimensions(
      containerRect.width,
      containerRect.height,
      videoWidth,
      videoHeight
    );

    // Set canvas size for proper rendering (account for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerRect.width * dpr;
    canvas.height = containerRect.height * dpr;
    canvas.style.width = `${containerRect.width}px`;
    canvas.style.height = `${containerRect.height}px`;

    // Scale context for HiDPI displays
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    setDimensions(newDimensions);
  }, [containerRef, videoRef, canvasRef]);

  useEffect(() => {
    // Set up ResizeObserver for container
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also update when video metadata loads
    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', updateCanvasSize);
    }

    // Initial size calculation
    updateCanvasSize();

    return () => {
      resizeObserver.disconnect();
      if (video) {
        video.removeEventListener('loadedmetadata', updateCanvasSize);
      }
    };
  }, [containerRef, videoRef, updateCanvasSize]);

  return dimensions;
};
