import { spawn } from 'child_process';
import * as path from 'path';
import { ensureDir } from '../utils/fs';
import { ExtractedFrame, FrameExtractionResult, VideoMeta } from '../schema/annotation';

/**
 * FFmpeg service for extracting frames from video files
 * Uses spawn directly for reliability and better error handling
 * 
 * Design decision: Using spawn instead of fluent-ffmpeg for:
 * - More control over process lifecycle
 * - Better error handling and streaming
 * - No additional dependency overhead
 */

interface FFmpegInfo {
  durationSec: number;
  fps: number;
  width: number;
  height: number;
}

/**
 * Extracts video metadata using ffprobe
 */
async function getVideoInfo(videoPath: string): Promise<FFmpegInfo> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate',
      '-show_entries', 'format=duration',
      '-of', 'json',
      videoPath,
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr}`));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const stream = info.streams?.[0];
        const format = info.format;

        if (!stream || !format) {
          reject(new Error('Invalid video info structure'));
          return;
        }

        // Parse frame rate (e.g., "30/1" or "29.97")
        const rFrameRate = stream.r_frame_rate || '30/1';
        const [num, den] = rFrameRate.split('/').map(Number);
        const fps = den ? num / den : parseFloat(rFrameRate);

        const durationSec = parseFloat(format.duration) || 0;
        const width = stream.width || 0;
        const height = stream.height || 0;

        resolve({ durationSec, fps, width, height });
      } catch (error) {
        reject(new Error(`Failed to parse video info: ${error}`));
      }
    });
  });
}

/**
 * Extracts frames from video at specified intervals
 * 
 * @param videoPath - Path to input video file
 * @param outDir - Directory to save extracted frames
 * @param intervalSec - Interval in seconds between frames (default: 0.5)
 * @returns Array of extracted frame paths with timestamps and video metadata
 */
export async function extractFrames(
  videoPath: string,
  outDir: string,
  intervalSec: number = 0.5
): Promise<FrameExtractionResult> {
  // Ensure output directory exists
  await ensureDir(outDir);

  // Get video metadata first
  const videoInfo = await getVideoInfo(videoPath);
  const meta: VideoMeta = {
    durationSec: videoInfo.durationSec,
    fps: videoInfo.fps,
    width: videoInfo.width,
    height: videoInfo.height,
  };

  // Calculate number of frames to extract
  const numFrames = Math.ceil(videoInfo.durationSec / intervalSec);
  const frames: ExtractedFrame[] = [];

  // Extract frames using ffmpeg
  // Using fps filter to extract at specified interval
  // Format: frame_000001.jpg (sequence number, timestamp calculated from index)
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-fps_mode', 'vfr', // Variable frame rate mode (replaces deprecated -vsync)
      '-vf', `fps=1/${intervalSec}`, // Extract 1 frame every intervalSec seconds
      '-q:v', '2', // High quality JPEG
      path.join(outDir, 'frame_%06d.jpg'), // Sequence pattern: frame_000001.jpg, frame_000002.jpg, etc.
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      if (code !== 0 && code !== 1) {
        // Code 1 can occur with some ffmpeg versions but still succeed
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
        return;
      }

      // Read extracted frame files and build frame list with timestamps
      try {
        const fs = await import('fs/promises');
        const files = await fs.readdir(outDir);
        const frameFiles = files
          .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
          .sort((a, b) => {
            // Sort by sequence number: frame_000001.jpg, frame_000002.jpg, etc.
            const numA = parseInt(a.match(/frame_(\d+)\.jpg/)?.[1] || '0');
            const numB = parseInt(b.match(/frame_(\d+)\.jpg/)?.[1] || '0');
            return numA - numB;
          });

        // Calculate timestamps based on frame index and interval
        for (let i = 0; i < frameFiles.length; i++) {
          const file = frameFiles[i];
          const timestamp = i * intervalSec; // First frame at 0, second at intervalSec, etc.
          frames.push({
            path: path.join(outDir, file),
            timestamp: Math.round(timestamp * 1000) / 1000, // Round to 3 decimals
          });
        }

        resolve({ frames, meta });
      } catch (error) {
        reject(new Error(`Failed to process extracted frames: ${error}`));
      }
    });
  });
}
