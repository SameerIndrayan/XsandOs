import { useRef, useEffect, RefObject } from 'react';
import { InterpolatedFrame, CanvasDimensions, EditorialCallout } from '../../types/annotations';
import { renderPlayers, renderArrows, renderTerminology } from '../../renderers';
import { renderEditorialCallouts } from '../../renderers/editorialCalloutRenderer';
import styles from './AnnotationCanvas.module.css';

interface AnnotationCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  frame: InterpolatedFrame | null;
  dimensions: CanvasDimensions;
  visible: boolean;
  callouts?: EditorialCallout[]; // Editorial callouts (time-based, max 3)
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  canvasRef,
  frame,
  dimensions,
  visible,
  callouts = [],
}) => {
  const animationTimeRef = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) {
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
    if (frame) {
      renderArrows(ctx, frame.arrows, dimensions);
      renderPlayers(ctx, frame.players, dimensions, animationTimeRef.current);
      renderTerminology(ctx, frame.terminology, dimensions); // Show play terms from frames
    }
    
    // Also render editorial callouts if any (optional)
    if (callouts && callouts.length > 0) {
      renderEditorialCallouts(ctx, callouts, dimensions);
    }
  }, [canvasRef, frame, dimensions, visible, callouts]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
};
