import { AnnotationFrame, AnalyzeResponse } from '../schema/contract';
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
 * Normalizes the complete analyze response
 * 
 * @param response - Raw response data
 * @returns Normalized response ready for Zod validation
 */
export function normalizeResponse(response: any): AnalyzeResponse {
  // Ensure arrays exist
  const frames = Array.isArray(response.frames) ? response.frames : [];
  
  // Normalize all frames
  const normalizedFrames = frames.map(normalizeFrame);

  // Ensure required fields
  return {
    video_duration: Math.max(0, Number(response.video_duration) || 0),
    video_url: String(response.video_url || ''),
    play_summary: String(response.play_summary || ''),
    frames: normalizedFrames,
    error: response.error ? {
      message: String(response.error.message || ''),
      details: response.error.details,
    } : undefined,
  };
}
