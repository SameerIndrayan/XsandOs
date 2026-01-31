import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateQAResponse, getFrameAtTimestamp, QAContext } from '../services/qa';
import { transcribeAudio } from '../services/whisper';
import { generateSpeech, getAvailableVoices } from '../services/elevenlabs';

const router = Router();

// Configure multer for audio uploads
const audioStorage = multer.memoryStorage();
const audioUpload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
      'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-wav',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|mp4|m4a|wav|webm|ogg|mpeg|mpga)$/i)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio format: ${file.mimetype}`));
    }
  },
});

// Store for latest analysis context (shared with analyze endpoint)
let latestAnalysisContext: {
  playSummary: string;
  videoDuration: number;
  frames: any[];
} | null = null;

/**
 * Update the analysis context (called from analyze route after successful analysis)
 */
export function updateAnalysisContext(context: typeof latestAnalysisContext) {
  latestAnalysisContext = context;
}

/**
 * POST /api/qa
 * Ask a question about the current play
 *
 * Body: {
 *   question: string,
 *   timestamp: number (current video timestamp),
 *   context?: { playSummary, videoDuration, frames } (optional override)
 * }
 */
router.post('/qa', async (req: Request, res: Response) => {
  try {
    const { question, timestamp = 0, context: providedContext } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Use provided context, latest analysis, or a default context for general questions
    const analysisContext = providedContext || latestAnalysisContext || {
      playSummary: 'No video has been analyzed yet. Answering general football questions.',
      videoDuration: 0,
      frames: [],
    };

    // Build Q&A context
    const qaContext: QAContext = {
      playSummary: analysisContext.playSummary || '',
      currentTimestamp: timestamp,
      videoDuration: analysisContext.videoDuration || 0,
      currentFrame: analysisContext.frames ? getFrameAtTimestamp(analysisContext.frames, timestamp) : undefined,
      allFrames: analysisContext.frames || [],
    };

    const response = await generateQAResponse(question, qaContext);

    res.json({
      answer: response.answer,
      confidence: response.confidence,
      timestamp,
    });
  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/transcribe
 * Transcribe audio using Whisper API
 *
 * Body: multipart/form-data with 'audio' file field
 */
router.post('/transcribe', audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const result = await transcribeAudio(
      req.file.buffer,
      req.file.originalname || 'audio.webm'
    );

    res.json({
      text: result.text,
      language: result.language,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/speak
 * Convert text to speech using Eleven Labs API
 *
 * Body: {
 *   text: string,
 *   voiceId?: string (optional voice ID)
 * }
 *
 * Returns: audio/mpeg binary
 */
router.post('/speak', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    const result = await generateSpeech(text, { voiceId });

    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.audioBuffer.length,
      'Cache-Control': 'no-cache',
    });

    res.send(result.audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/voices
 * Get available Eleven Labs voices
 */
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = await getAvailableVoices();
    res.json({ voices });
  } catch (error) {
    console.error('Voices error:', error);
    res.status(500).json({
      error: 'Failed to fetch voices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
