/**
 * Video service for extracting video metadata
 * In mock mode, returns fixed duration
 */

/**
 * Extracts video duration from a video file or URL
 * @param videoPath - Path to local video file (optional)
 * @param videoUrl - URL to remote video (optional)
 * @returns Video duration in seconds
 */
export async function getVideoDuration(
  videoPath?: string,
  videoUrl?: string
): Promise<number> {
  // In mock mode or when not implemented, return fixed duration
  if (process.env.MOCK_MODE === '1') {
    return 12.5;
  }

  // TODO: Implement actual video duration extraction
  // For now, return mock duration
  // Future: Use ffprobe or similar to get actual duration
  // if (videoPath) {
  //   // Extract from local file using ffprobe
  // }
  // if (videoUrl) {
  //   // Extract from remote URL
  // }

  return 12.5;
}
