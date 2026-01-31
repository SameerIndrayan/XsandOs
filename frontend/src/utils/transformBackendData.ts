import {
  BackendAnnotationResponse,
  AnnotationData,
  AnnotationFrame,
  EditorialCallout,
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
        duration: 2.0, // Default duration for backend data
      })),
    })),
    callouts: (backendData.callouts || []).map((callout): EditorialCallout => ({
      id: callout.id,
      start_time: callout.start_time,
      end_time: callout.end_time,
      text: callout.text,
      detail: callout.detail,
      anchor: callout.anchor,
      circle: callout.circle,
      arrow: callout.arrow,
    })),
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
