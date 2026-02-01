import {
  BackendAnnotationResponse,
  AnnotationData,
  AnnotationFrame,
} from '../types/annotations';

/**
 * Transform backend Gemini API response to frontend annotation format
 */
export function transformBackendData(
  backendData: BackendAnnotationResponse
): AnnotationData {
  return {
    metadata: {
      videoWidth: 1920,
      videoHeight: 1080,
      frameRate: 30,
    },
    frames: backendData.frames.map((frame): AnnotationFrame => ({
      timestamp: frame.timestamp,
      players: (frame.players || []).map(player => ({
        id: player.id,
        x: player.x,
        y: player.y,
        label: player.label,
        highlight: player.highlight ?? false,
        color: player.color || '#FFFFFF',
      })),
      arrows: (frame.arrows || []).map(arrow => ({
        from: arrow.from,
        to: arrow.to,
        color: arrow.color || '#FFFFFF',
        label: arrow.label,
        dashed: arrow.dashed,
      })),
      terminology: (frame.terminology || []).map(term => ({
        x: term.x,
        y: term.y,
        term: term.term,
        definition: term.definition,
        duration: 3.0, // 3 seconds - enough to read without cluttering
      })),
    })),
    callouts: backendData.callouts || [], // Pass through time-based callouts
  };
}

/**
 * Extract play info from backend response
 */
export function extractPlayInfo(backendData: BackendAnnotationResponse) {
  // Count unique players across all frames
  const uniquePlayers = new Set<string>();
  let totalAnnotations = 0;

  backendData.frames.forEach(frame => {
    frame.players?.forEach(p => uniquePlayers.add(p.id));
    totalAnnotations += (frame.terminology?.length || 0);
  });

  // Extract first sentence of summary as title
  const summaryFirstSentence = backendData.play_summary
    .split(/[.!?]/)[0]
    .trim();

  return {
    title: summaryFirstSentence || 'Football Play Analysis',
    summary: backendData.play_summary,
    duration: backendData.video_duration,
    playerCount: uniquePlayers.size,
    annotationCount: totalAnnotations,
    frameCount: backendData.frames.length,
  };
}
