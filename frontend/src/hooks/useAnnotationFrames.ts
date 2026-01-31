import { useMemo } from 'react';
import { AnnotationData, InterpolatedFrame } from '../types/annotations';
import { getInterpolatedFrame } from '../utils/interpolation';

/**
 * Hook to get the interpolated annotation frame for the current video time
 */
export const useAnnotationFrames = (
  annotations: AnnotationData | null,
  currentTime: number
): InterpolatedFrame | null => {
  // Pre-sort frames by timestamp (should already be sorted, but ensure)
  const sortedFrames = useMemo(() => {
    if (!annotations?.frames) return [];
    return [...annotations.frames].sort((a, b) => a.timestamp - b.timestamp);
  }, [annotations]);

  // Get interpolated frame for current time
  const interpolatedFrame = useMemo(() => {
    if (sortedFrames.length === 0) return null;
    return getInterpolatedFrame(sortedFrames, currentTime);
  }, [sortedFrames, currentTime]);

  return interpolatedFrame;
};
