import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import { AnalyzeResponseSchema, AnalyzeRequestSchema } from '../schema/contract';
import { generateMockResponse } from '../services/mock';
import { extractFrames } from '../services/frames';
import { analyzeWithVisionAgents } from '../services/visionagents';
import { normalizeResponse } from '../services/normalize';
import { ensureDir, getFileExtension, removeDir } from '../utils/fs';
import { updateAnalysisContext } from './voice';

/**
 * Analyze route handler
 * POST /api/analyze
 * 
 * Supports both:
 * 1. multipart/form-data with field "video" (file upload)
 * 2. JSON body with { "video_url": string }
 */

const router = Router();

// Configure multer for file uploads (max 200MB)
// Save to ./uploads directory for serving as static files
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      await ensureDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = getFileExtension(file.originalname);
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      cb(null, `video_${timestamp}_${random}${ext}`);
    },
  }),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const ext = getFileExtension(file.originalname);
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

/**
 * GET /api/analyze
 * Returns the saved test output if available
 */
router.get('/analyze', async (req: Request, res: Response) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    // Try latest-output.json first, then test-output.json as fallback
    const latestOutputPath = path.join(process.cwd(), 'latest-output.json');
    const testOutputPath = path.join(process.cwd(), 'test-output.json');
    
    try {
      // Try latest-output.json first (most recent)
      const data = await fs.readFile(latestOutputPath, 'utf-8');
      const jsonData = JSON.parse(data);
      return res.json(jsonData);
    } catch (error) {
      // Fallback to test-output.json if latest doesn't exist
      try {
        const data = await fs.readFile(testOutputPath, 'utf-8');
        const jsonData = JSON.parse(data);
        return res.json(jsonData);
      } catch (fallbackError) {
        return res.status(404).json({
          error: 'No analysis output found',
          message: 'No analysis results available. Make a POST request to /api/analyze with a video file first.',
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/analyze
 * 
 * Supports:
 * - multipart/form-data with "video" field
 * - JSON body with { "video_url": string }
 */
router.post('/analyze', upload.single('video'), async (req: Request, res: Response) => {
  const frameOutputDir = path.join(
    process.env.FRAME_OUTPUT_DIR || './tmp/frames',
    `frames_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  const videoFile = req.file;
  let responseVideoUrl = '';

  try {
    let videoUrl: string | undefined;

    // Check if JSON body with video_url was provided
    if (req.body && typeof req.body === 'object' && !req.file) {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const validated = AnalyzeRequestSchema.parse(body);
        videoUrl = validated.video_url;
      } catch (error) {
        // If JSON parsing fails, continue to check for file upload
      }
    }

    // Validate that either file or URL is provided
    if (!videoFile && !videoUrl) {
      return res.status(400).json({
        error: 'Missing video input',
        message: 'Please provide either a video file (multipart/form-data field "video") or a video_url in JSON body',
      });
    }

    let response: any;
    const visionAgentsEnabled = process.env.VISIONAGENTS_ENABLED === '1';
    const mockMode = process.env.MOCK_MODE === '1';

    // Generate video_url for response
    let responseVideoUrl = '';
    if (videoFile) {
      const filename = path.basename(videoFile.path);
      responseVideoUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    } else if (videoUrl) {
      responseVideoUrl = videoUrl;
    }

    // Check if MOCK_MODE is enabled
    if (mockMode) {
      console.log('MOCK_MODE enabled - returning mock annotations');
      response = generateMockResponse();
      response.video_url = responseVideoUrl;
      response.play_summary = 'Mock play summary: This is a sample football play with offensive and defensive players.';
    } else if (visionAgentsEnabled && videoFile) {
      // VisionAgents flow: extract frames -> analyze -> normalize -> validate
      try {
        console.log('VisionAgents enabled - starting analysis...');
        
        // Step 1: Extract frames
        const frameInterval = parseFloat(process.env.FRAME_INTERVAL_SEC || '0.5');
        console.log(`Extracting frames with interval ${frameInterval}s...`);
        const { frames: extractedFrames, meta } = await extractFrames(
          videoFile.path,
          frameOutputDir,
          frameInterval
        );

        console.log(`Extracted ${extractedFrames.length} frames, duration=${meta.durationSec.toFixed(2)}s`);

        // Step 2: Analyze with VisionAgents
        const visionAgentsResult = await analyzeWithVisionAgents(extractedFrames, meta);

        // Step 3: Build response
        response = {
          video_duration: meta.durationSec,
          video_url: responseVideoUrl,
          play_summary: visionAgentsResult.play_summary,
          frames: visionAgentsResult.frames,
        };

        // Step 4: Normalize
        response = normalizeResponse(response);

        console.log('VisionAgents analysis complete');
      } catch (error) {
        console.error('VisionAgents analysis failed, falling back to mock:', error);
        // Fallback to mock with error field
        response = generateMockResponse();
        response.video_url = responseVideoUrl;
        response.play_summary = 'Analysis failed - using mock data';
        response.error = {
          message: 'VisionAgents analysis failed',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    } else {
      // VisionAgents not enabled - return mock with warning
      console.log('VisionAgents not enabled - returning mock annotations');
      response = generateMockResponse();
      response.video_url = responseVideoUrl;
      response.play_summary = 'VisionAgents integration not enabled';
      response.error = {
        message: 'VisionAgents not implemented',
        details: {
          visionAgentsEnabled: visionAgentsEnabled,
          note: 'Set VISIONAGENTS_ENABLED=1 and provide VISIONAGENTS_API_KEY to enable',
        },
      };
    }

    // Validate response with Zod before returning
    try {
      const validatedResponse = AnalyzeResponseSchema.parse(response);

      // Update analysis context for Q&A feature
      updateAnalysisContext({
        playSummary: validatedResponse.play_summary || '',
        videoDuration: validatedResponse.video_duration,
        frames: validatedResponse.frames,
      });

      // Save response to files for GET endpoint
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const outputPath = path.join(process.cwd(), 'latest-output.json');
        await fs.writeFile(outputPath, JSON.stringify(validatedResponse, null, 2));
        console.log(`[Analyze] Saved response to ${outputPath}`);
      } catch (saveError) {
        console.error('[Analyze] Failed to save response:', saveError);
        // Continue even if save fails
      }

      return res.status(200).json(validatedResponse);
    } catch (validationError) {
      console.error('Response validation failed:', validationError);
      // If validation fails, return mock with error
      const mockResponse = generateMockResponse();
      mockResponse.video_url = responseVideoUrl;
      mockResponse.play_summary = 'Validation failed - using mock data';
      mockResponse.error = {
        message: 'Response validation failed',
        details: validationError instanceof Error ? validationError.message : String(validationError),
      };
      
      // Try to validate mock response (should always pass)
      const validatedMock = AnalyzeResponseSchema.parse(mockResponse);
      return res.status(200).json(validatedMock);
    }
  } catch (error) {
    console.error('Error processing analyze request:', error);
    
    // Final fallback: return mock with error
    try {
      const mockResponse = generateMockResponse();
      mockResponse.video_url = responseVideoUrl || (videoFile 
        ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(videoFile.path)}`
        : '');
      mockResponse.play_summary = 'Request processing failed';
      mockResponse.error = {
        message: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      };
      const validated = AnalyzeResponseSchema.parse(mockResponse);
      return res.status(200).json(validated);
    } catch {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      });
    }
  } finally {
    // Cleanup: remove frame extraction directory (best effort)
    try {
      await removeDir(frameOutputDir);
    } catch (error) {
      console.warn('Failed to cleanup frame directory:', error);
    }
  }
});

export default router;
