import {
  AnnotationFrame,
  InterpolatedFrame,
  InterpolatedPlayer,
  InterpolatedArrow,
  InterpolatedTerminology,
  PlayerAnnotation,
  ArrowAnnotation,
  TerminologyAnnotation,
} from '../types/annotations';

/**
 * Linear interpolation between two values
 */
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Find the two frames that bracket the current time
 */
export const findBracketingFrames = (
  frames: AnnotationFrame[],
  currentTime: number
): { before: AnnotationFrame | null; after: AnnotationFrame | null; t: number } => {
  if (frames.length === 0) {
    return { before: null, after: null, t: 0 };
  }

  // Binary search for efficiency
  let low = 0;
  let high = frames.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].timestamp < currentTime) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const afterIndex = low;
  const beforeIndex = afterIndex - 1;

  // Before first frame
  if (beforeIndex < 0) {
    return { before: null, after: frames[0], t: 0 };
  }

  // After last frame
  if (afterIndex >= frames.length || frames[afterIndex].timestamp <= currentTime) {
    return { before: frames[frames.length - 1], after: null, t: 1 };
  }

  const before = frames[beforeIndex];
  const after = frames[afterIndex];
  const t = (currentTime - before.timestamp) / (after.timestamp - before.timestamp);

  return { before, after, t };
};

/**
 * Interpolate player positions between two frames
 */
const interpolatePlayers = (
  before: PlayerAnnotation[],
  after: PlayerAnnotation[],
  t: number
): InterpolatedPlayer[] => {
  const result: InterpolatedPlayer[] = [];
  const afterById = new Map(after.map((p) => [p.id, p]));
  const beforeById = new Map(before.map((p) => [p.id, p]));

  // Interpolate players present in both frames
  for (const bp of before) {
    const ap = afterById.get(bp.id);
    if (ap) {
      result.push({
        id: bp.id,
        x: lerp(bp.x, ap.x, t),
        y: lerp(bp.y, ap.y, t),
        label: t < 0.5 ? bp.label : ap.label,
        highlight: t < 0.5 ? bp.highlight : ap.highlight,
        color: t < 0.5 ? bp.color : ap.color,
        opacity: 1,
      });
    } else {
      // Player fading out
      result.push({ ...bp, opacity: 1 - t });
    }
  }

  // Players fading in (only in 'after')
  for (const ap of after) {
    if (!beforeById.has(ap.id)) {
      result.push({ ...ap, opacity: t });
    }
  }

  return result;
};

/**
 * Interpolate arrows between two frames
 */
const interpolateArrows = (
  before: ArrowAnnotation[],
  after: ArrowAnnotation[],
  t: number
): InterpolatedArrow[] => {
  const result: InterpolatedArrow[] = [];

  // For arrows, we use a simpler approach: crossfade
  // Show 'before' arrows fading out and 'after' arrows fading in
  for (const arrow of before) {
    const matchingAfter = after.find(
      (a) =>
        a.from[0] === arrow.from[0] &&
        a.from[1] === arrow.from[1] &&
        a.to[0] === arrow.to[0] &&
        a.to[1] === arrow.to[1]
    );

    if (matchingAfter) {
      // Same arrow in both frames
      result.push({ ...arrow, opacity: 1 });
    } else {
      // Arrow fading out
      result.push({ ...arrow, opacity: 1 - t });
    }
  }

  // New arrows fading in
  for (const arrow of after) {
    const matchingBefore = before.find(
      (a) =>
        a.from[0] === arrow.from[0] &&
        a.from[1] === arrow.from[1] &&
        a.to[0] === arrow.to[0] &&
        a.to[1] === arrow.to[1]
    );

    if (!matchingBefore) {
      result.push({ ...arrow, opacity: t });
    }
  }

  return result;
};

/**
 * Select which terminology boxes to show based on duration
 */
const selectTerminology = (
  before: TerminologyAnnotation[],
  after: TerminologyAnnotation[],
  t: number,
  currentTime: number,
  beforeTimestamp: number
): InterpolatedTerminology[] => {
  const result: InterpolatedTerminology[] = [];
  const fadeTime = 0.3; // Fade duration in seconds

  // Process terminology from 'before' frame
  for (const term of before) {
    const startTime = beforeTimestamp;
    const endTime = startTime + term.duration;

    if (currentTime <= endTime) {
      // Calculate opacity based on fade in/out
      let opacity = 1;
      if (currentTime < startTime + fadeTime) {
        opacity = (currentTime - startTime) / fadeTime;
      } else if (currentTime > endTime - fadeTime) {
        opacity = (endTime - currentTime) / fadeTime;
      }
      opacity = Math.max(0, Math.min(1, opacity));

      result.push({ ...term, opacity, startTime });
    }
  }

  // Add terminology from 'after' frame if different
  for (const term of after) {
    const exists = before.some((b) => b.term === term.term);
    if (!exists && t > 0.3) {
      result.push({ ...term, opacity: Math.min(1, (t - 0.3) / 0.3), startTime: currentTime });
    }
  }

  return result;
};

/**
 * Convert a single frame to interpolated format (for edge cases)
 */
export const frameToInterpolated = (frame: AnnotationFrame): InterpolatedFrame => {
  return {
    players: frame.players.map((p) => ({ ...p, opacity: 1 })),
    arrows: frame.arrows.map((a) => ({ ...a, opacity: 1 })),
    terminology: frame.terminology.map((t) => ({ ...t, opacity: 1, startTime: frame.timestamp })),
  };
};

/**
 * Interpolate between two annotation frames
 */
export const interpolateFrame = (
  before: AnnotationFrame,
  after: AnnotationFrame,
  t: number,
  currentTime: number
): InterpolatedFrame => {
  return {
    players: interpolatePlayers(before.players, after.players, t),
    arrows: interpolateArrows(before.arrows, after.arrows, t),
    terminology: selectTerminology(
      before.terminology,
      after.terminology,
      t,
      currentTime,
      before.timestamp
    ),
  };
};

/**
 * Get the interpolated frame for a given time
 */
export const getInterpolatedFrame = (
  frames: AnnotationFrame[],
  currentTime: number
): InterpolatedFrame | null => {
  if (frames.length === 0) return null;

  const { before, after, t } = findBracketingFrames(frames, currentTime);

  if (!before && !after) return null;
  if (!before) return frameToInterpolated(after!);
  if (!after) return frameToInterpolated(before);

  return interpolateFrame(before, after, t, currentTime);
};
