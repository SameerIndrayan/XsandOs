import { AnnotationFrame, AnalyzeResponse, EditorialCallout } from '../schema/contract';
import { clampPercent } from '../utils/percent';
import { isValidHex, COLORS } from '../utils/hex';

/**
 * Normalization service for schema enforcement
 * Ensures all data conforms to contract requirements before validation
 */

/**
 * Normalizes a single annotation frame
 */
function normalizeFrame(frame: AnnotationFrame): AnnotationFrame {
  // Normalize players
  const normalizedPlayers = (frame.players || []).map((player) => ({
    id: String(player.id || 'unknown'),
    x: clampPercent(player.x),
    y: clampPercent(player.y),
    label: String(player.label || ''),
    highlight: Boolean(player.highlight),
    color: isValidHex(player.color) ? player.color : COLORS.PLAYER_NORMAL,
  }));

  // Dedupe players by ID (keep first occurrence)
  const seenIds = new Set<string>();
  const uniquePlayers = normalizedPlayers.filter((player) => {
    if (seenIds.has(player.id)) {
      return false;
    }
    seenIds.add(player.id);
    return true;
  });

  // Normalize arrows
  const normalizedArrows = (frame.arrows || []).map((arrow) => ({
    from: [
      clampPercent(arrow.from[0]),
      clampPercent(arrow.from[1]),
    ] as [number, number],
    to: [
      clampPercent(arrow.to[0]),
      clampPercent(arrow.to[1]),
    ] as [number, number],
    color: isValidHex(arrow.color) ? arrow.color : COLORS.ARROW,
    label: arrow.label ? String(arrow.label) : undefined,
  }));

  // Normalize terminology
  const normalizedTerminology = (frame.terminology || []).map((term) => ({
    x: clampPercent(term.x),
    y: clampPercent(term.y),
    term: String(term.term || ''),
    definition: String(term.definition || ''),
  }));

  return {
    timestamp: Math.max(0, Number(frame.timestamp) || 0),
    players: uniquePlayers,
    arrows: normalizedArrows,
    terminology: normalizedTerminology,
  };
}

/**
 * Normalizes editorial callouts
 */
function normalizeCallout(callout: any, videoDuration: number): EditorialCallout | null {
  if (!callout || !callout.id) return null;
  
  const startTime = Math.max(0, Number(callout.start_time) || 0);
  const endTime = Math.min(videoDuration, Number(callout.end_time) || startTime + 3.0);
  
  // Ensure minimum 3.0s duration
  if (endTime < startTime + 3.0) {
    return null;
  }
  
  if (!callout.anchor || typeof callout.anchor.x !== 'number' || typeof callout.anchor.y !== 'number') {
    return null;
  }
  
  const normalized: EditorialCallout = {
    id: String(callout.id),
    start_time: startTime,
    end_time: endTime,
    text: String(callout.text || '').substring(0, 50),
    detail: String(callout.detail || '').substring(0, 200),
    anchor: {
      x: clampPercent(callout.anchor.x),
      y: clampPercent(callout.anchor.y),
      player_id: callout.anchor.player_id ? String(callout.anchor.player_id) : undefined,
    },
  };
  
  // Optional: circle (max 1 per callout)
  if (callout.circle && callout.circle.player_id && 
      typeof callout.circle.x === 'number' && typeof callout.circle.y === 'number') {
    normalized.circle = {
      player_id: String(callout.circle.player_id),
      x: clampPercent(callout.circle.x),
      y: clampPercent(callout.circle.y),
    };
  }
  
  // Optional: arrow (max 1 per callout, not both circle and arrow)
  if (callout.arrow && !normalized.circle &&
      Array.isArray(callout.arrow.from) && Array.isArray(callout.arrow.to) &&
      callout.arrow.from.length === 2 && callout.arrow.to.length === 2) {
    normalized.arrow = {
      from: [
        clampPercent(callout.arrow.from[0]),
        clampPercent(callout.arrow.from[1]),
      ] as [number, number],
      to: [
        clampPercent(callout.arrow.to[0]),
        clampPercent(callout.arrow.to[1]),
      ] as [number, number],
    };
  }
  
  return normalized;
}

/**
 * Normalizes the complete analyze response
 * 
 * @param response - Raw response data
 * @returns Normalized response ready for Zod validation
 */
export function normalizeResponse(response: any): AnalyzeResponse {
  // Ensure arrays exist
  const frames = Array.isArray(response.frames) ? response.frames : [];
  const callouts = Array.isArray(response.callouts) ? response.callouts : [];
  
  // Normalize all frames
  const normalizedFrames = frames.map(normalizeFrame);
  
  // Normalize callouts (max 3, ensure >= 3s duration)
  const videoDuration = Math.max(0, Number(response.video_duration) || 0);
  const normalizedCallouts = callouts
    .map((c: any) => normalizeCallout(c, videoDuration))
    .filter((c: EditorialCallout | null): c is EditorialCallout => c !== null)
    .slice(0, 3); // Max 3 callouts

  // Ensure required fields
  return {
    video_duration: videoDuration,
    video_url: String(response.video_url || ''),
    play_summary: String(response.play_summary || ''),
    frames: normalizedFrames,
    callouts: normalizedCallouts,
    error: response.error ? {
      message: String(response.error.message || ''),
      details: response.error.details,
    } : undefined,
  };
}
