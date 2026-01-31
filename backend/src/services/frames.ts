import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ensureDir } from '../utils/fs';

/**
 * Frame extraction service using FFmpeg
 * Extracts frames from video at specified intervals
 */

export interface ExtractedFrame {
  path: string;
  timestamp: number;
}

export interface VideoMeta {
  durationSec: number;
  width: number;
  height: number;
  fps: number;
}

export interface FrameExtractionResult {
  frames: ExtractedFrame[];
  meta: VideoMeta;
}

/**
 * Gets video metadata using ffprobe
 */
async function getVideoInfo(videoPath: string): Promise<VideoMeta> {
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

        // Parse frame rate
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
 * Automatically adjusts interval if frame count exceeds max (30)
 * 
 * @param videoPath - Path to input video file
 * @param outDir - Directory to save extracted frames
 * @param intervalSec - Desired interval in seconds between frames (default: 0.5)
 * @param maxFrames - Maximum number of frames to extract (default: 30)
 * @returns Array of extracted frame paths with timestamps and video metadata
 */
export async function extractFrames(
  videoPath: string,
  outDir: string,
  intervalSec: number = 0.5,
  maxFrames: number = 30
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

  // Calculate optimal interval to cap frame count
  const estimatedFrames = Math.ceil(videoInfo.durationSec / intervalSec);
  const actualInterval = estimatedFrames > maxFrames
    ? videoInfo.durationSec / maxFrames
    : intervalSec;

  console.log(`Extracting frames: duration=${videoInfo.durationSec.toFixed(2)}s, interval=${actualInterval.toFixed(2)}s, estimated=${Math.ceil(videoInfo.durationSec / actualInterval)} frames`);

  // Extract frames using ffmpeg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-fps_mode', 'vfr',
      '-vf', `fps=1/${actualInterval}`,
      '-q:v', '2', // High quality JPEG
      path.join(outDir, 'frame_%06d.jpg'),
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      if (code !== 0 && code !== 1) {
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
        return;
      }

      // Read extracted frame files and build frame list with timestamps
      try {
        const files = await fs.readdir(outDir);
        const frameFiles = files
          .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
          .sort((a, b) => {
            const numA = parseInt(a.match(/frame_(\d+)\.jpg/)?.[1] || '0');
            const numB = parseInt(b.match(/frame_(\d+)\.jpg/)?.[1] || '0');
            return numA - numB;
          });

        const frames: ExtractedFrame[] = [];
        
        // Calculate timestamps based on frame index and interval
        for (let i = 0; i < frameFiles.length; i++) {
          const file = frameFiles[i];
          const timestamp = i * actualInterval;
          frames.push({
            path: path.join(outDir, file),
            timestamp: Math.round(timestamp * 100) / 100, // Round to 2 decimals
          });
        }

        console.log(`Extracted ${frames.length} frames successfully`);

        resolve({ frames, meta });
      } catch (error) {
        reject(new Error(`Failed to process extracted frames: ${error}`));
      }
    });
  });
}
