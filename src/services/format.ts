import { FrameData, AnnotationResponse, VideoMeta } from '../schema/annotation';
import { AnnotationResponseSchema } from '../schema/annotation';

/**
 * Format service for normalizing and validating Gemini output
 * Ensures all responses conform to the API contract
 * 
 * Design decision: Centralized formatting logic makes it easier to:
 * - Validate responses before sending
 * - Handle edge cases and data normalization
 * - Update response format in one place
 */

/**
 * Normalizes frame data to ensure all required fields are present
 */
function normalizeFrameData(frame: FrameData): FrameData {
  return {
    timestamp: frame.timestamp,
    players: frame.players || [],
    annotations: frame.annotations || [],
  };
}

/**
 * Formats and validates the complete annotation response
 * 
 * @param videoMeta - Video metadata from FFmpeg
 * @param frames - Array of analyzed frame data
 * @returns Validated and formatted annotation response
 */
export function formatAnnotationResponse(
  videoMeta: VideoMeta,
  frames: FrameData[]
): AnnotationResponse {
  // Normalize all frames
  const normalizedFrames = frames.map(normalizeFrameData);

  // Build response object
  const response: AnnotationResponse = {
    videoMeta: {
      durationSec: videoMeta.durationSec,
      fps: videoMeta.fps,
      width: videoMeta.width,
      height: videoMeta.height,
    },
    frames: normalizedFrames,
  };

  // Validate with Zod schema
  const validationResult = AnnotationResponseSchema.safeParse(response);
  if (!validationResult.success) {
    throw new Error(
      `Response validation failed: ${validationResult.error.message}`
    );
  }

  return validationResult.data;
}
