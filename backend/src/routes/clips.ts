import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Clips management routes
 * GET /api/clips - List all clips
 * DELETE /api/clips/:id - Delete a clip
 */

const router = Router();

interface ClipMetadata {
  id: string;
  filename: string;
  originalName: string;
  videoUrl: string;
  uploadDate: string;
  duration?: number;
  playSummary?: string;
  frameCount?: number;
}

const CLIPS_METADATA_FILE = path.join(__dirname, '..', '..', 'clips-metadata.json');

async function loadClipsMetadata(): Promise<ClipMetadata[]> {
  try {
    const data = await fs.readFile(CLIPS_METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, create it with empty array
    try {
      await fs.writeFile(CLIPS_METADATA_FILE, '[]', 'utf-8');
    } catch {
      // Ignore write errors
    }
    return [];
  }
}

async function saveClipsMetadata(clips: ClipMetadata[]): Promise<void> {
  await fs.writeFile(CLIPS_METADATA_FILE, JSON.stringify(clips, null, 2), 'utf-8');
}

/**
 * GET /api/clips
 * Returns list of all uploaded clips
 */
router.get('/clips', async (req: Request, res: Response) => {
  try {
    const clips = await loadClipsMetadata();
    res.json({ clips });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/clips/:id
 * Returns analysis data for a specific clip
 */
router.get('/clips/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clips = await loadClipsMetadata();
    const clip = clips.find(c => c.id === id);
    
    if (!clip) {
      return res.status(404).json({
        error: 'Clip not found',
        message: `Clip with id ${id} not found`,
      });
    }

    // Try to load analysis data from saved output
    const fs = await import('fs/promises');
    const outputPath = path.join(__dirname, '..', '..', `analysis_${id}.json`);
    
    try {
      const analysisData = await fs.readFile(outputPath, 'utf-8');
      const jsonData = JSON.parse(analysisData);
      res.json({ clip, analysis: jsonData });
    } catch (error) {
      // Analysis not available yet
      res.json({ clip, analysis: null });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/clips/:id
 * Deletes a clip and its analysis
 */
router.delete('/clips/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clips = await loadClipsMetadata();
    const clipIndex = clips.findIndex(c => c.id === id);
    
    if (clipIndex === -1) {
      return res.status(404).json({
        error: 'Clip not found',
        message: `Clip with id ${id} not found`,
      });
    }

    const clip = clips[clipIndex];
    
    // Delete video file
    const uploadDir = process.env.UPLOAD_DIR || './tmp/uploads';
    const videoPath = path.join(uploadDir, clip.filename);
    try {
      await fs.unlink(videoPath);
    } catch (error) {
      // File might not exist, continue
    }

    // Delete analysis file
    const analysisPath = path.join(__dirname, '..', '..', `analysis_${id}.json`);
    try {
      await fs.unlink(analysisPath);
    } catch (error) {
      // File might not exist, continue
    }

    // Remove from metadata
    clips.splice(clipIndex, 1);
    await saveClipsMetadata(clips);

    res.json({ message: 'Clip deleted successfully', id });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
