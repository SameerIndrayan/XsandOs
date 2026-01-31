import { AnalyzeResponse } from '../schema/contract';
import { generateMockResponse } from './mock';

/**
 * Gemini service for video analysis
 * Currently stubbed - returns mock data with error field
 */

interface AnalyzeVideoOptions {
  videoPath?: string;
  videoUrl?: string;
}

/**
 * Analyzes video using Gemini Vision API
 * Currently stubbed - returns mock response with error field
 */
export async function analyzeVideo(
  options: AnalyzeVideoOptions
): Promise<AnalyzeResponse> {
  const { videoPath, videoUrl } = options;

  // Log that Gemini is not fully implemented
  console.log('Gemini not implemented - returning mock output');

  // Return mock response with error field indicating Gemini is not implemented
  const mockResponse = generateMockResponse();
  
  return {
    ...mockResponse,
    error: {
      message: 'Gemini integration not fully implemented',
      details: {
        videoPath: videoPath || null,
        videoUrl: videoUrl || null,
        note: 'Currently returning mock data. Implement Gemini Vision API integration.',
      },
    },
  };

  // TODO: Implement actual Gemini integration
  // 1. Extract frames from video (videoPath or download from videoUrl)
  // 2. Send frames to Gemini Vision API
  // 3. Parse response and convert to AnnotationFrame format
  // 4. Ensure coordinates are percentage-based (0-100)
  // 5. Validate with Zod schemas
  // 6. Return AnalyzeResponse
}
