import { useRef, useEffect, RefObject } from 'react';
import { InterpolatedFrame, CanvasDimensions } from '../../types/annotations';
import { renderPlayers, renderArrows, renderTerminology, renderEditorialCallouts } from '../../renderers';
import styles from './AnnotationCanvas.module.css';

interface AnnotationCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  frame: InterpolatedFrame | null;
  dimensions: CanvasDimensions;
  visible: boolean;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  canvasRef,
  frame,
  dimensions,
  visible,
}) => {
  const animationTimeRef = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame || !visible) {
      // Clear canvas if not visible
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update animation time for pulsing effects
    animationTimeRef.current = Date.now();

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render each annotation type (order matters for layering)
    renderArrows(ctx, frame.arrows, dimensions);
    renderPlayers(ctx, frame.players, dimensions, animationTimeRef.current);
    renderTerminology(ctx, frame.terminology, dimensions);
    // Render callouts on top of everything
    if (frame.callouts && frame.callouts.length > 0) {
      renderEditorialCallouts(ctx, frame.callouts, dimensions);
    }
  }, [canvasRef, frame, dimensions, visible]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
};
