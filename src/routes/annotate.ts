import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import { extractFrames } from '../services/ffmpeg';
import { analyzeFrames } from '../services/gemini';
import { formatAnnotationResponse } from '../services/format';
import { ensureDir, removeDir, removeFile, getTempFilePath, getFileExtension } from '../utils/fs';

/**
 * Annotation route handler
 * POST /api/annotate
 * 
 * Handles video upload, frame extraction, Gemini analysis, and response formatting
 * 
 * Design decisions:
 * - Uses multer for file upload handling
 * - Creates temporary directories per request for isolation
 * - Cleans up all temp files after request completes (best-effort)
 * - Returns structured errors with appropriate HTTP status codes
 */

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = process.env.UPLOAD_DIR || './tmp/uploads';
      await ensureDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = getFileExtension(file.originalname);
      const filename = getTempFilePath('video', ext, process.env.UPLOAD_DIR || './tmp/uploads');
      cb(null, path.basename(filename));
    },
  }),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '500') * 1024 * 1024), // Default 500MB
  },
  fileFilter: (req, file, cb) => {
    // Accept common video formats
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const ext = getFileExtension(file.originalname);
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});

/**
 * POST /api/annotate
 * 
 * Request:
 * - multipart/form-data with field "video" containing the video file
 * - Optional query param: intervalSec (default 0.5)
 * - Optional query param: promptContext (text context for Gemini)
 * 
 * Response:
 * - 200: AnnotationResponse with video metadata and frame annotations
 * - 400: Bad request (invalid file, missing file, etc.)
 * - 500: Server error (processing failure)
 */
router.post('/annotate', upload.single('video'), async (req: Request, res: Response) => {
  const videoFile = req.file;
  const intervalSec = parseFloat(req.query.intervalSec as string) || parseFloat(process.env.FRAME_INTERVAL_SEC || '0.5');
  const promptContext = req.query.promptContext as string | undefined;

  // Validate file upload
  if (!videoFile) {
    return res.status(400).json({
      error: 'Missing video file',
      message: 'Please upload a video file using the "video" field in multipart/form-data',
    });
  }

  const videoPath = videoFile.path;
  const frameOutputDir = path.join(
    process.env.FRAME_OUTPUT_DIR || './tmp/frames',
    `frames_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  try {
    // Step 1: Extract frames from video
    console.log(`Extracting frames from ${videoFile.originalname}...`);
    const { frames, meta } = await extractFrames(videoPath, frameOutputDir, intervalSec);

    if (frames.length === 0) {
      throw new Error('No frames extracted from video');
    }

    console.log(`Extracted ${frames.length} frames`);

    // Step 2: Analyze frames with Gemini
    console.log('Analyzing frames with Gemini...');
    const frameData = await analyzeFrames(frames, promptContext);
    console.log(`Analyzed ${frameData.length} frames`);

    // Step 3: Format response
    const response = formatAnnotationResponse(meta, frameData);

    // Step 4: Cleanup temp files (best-effort, don't block response)
    cleanupTempFiles(videoPath, frameOutputDir).catch((err) => {
      console.warn('Cleanup error (non-blocking):', err);
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Annotation error:', error);

    // Cleanup on error
    cleanupTempFiles(videoPath, frameOutputDir).catch((err) => {
      console.warn('Cleanup error (non-blocking):', err);
    });

    // Return appropriate error response
    if (error instanceof Error) {
      return res.status(500).json({
        error: 'Processing failed',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'Unknown error',
      message: 'An unexpected error occurred during video processing',
    });
  }
});

/**
 * Cleans up temporary files and directories
 * Best-effort cleanup - errors are logged but don't throw
 */
async function cleanupTempFiles(videoPath: string, frameOutputDir: string): Promise<void> {
  try {
    await removeFile(videoPath);
    await removeDir(frameOutputDir);
    console.log('Cleaned up temporary files');
  } catch (error) {
    console.warn('Partial cleanup failure:', error);
  }
}

export default router;
