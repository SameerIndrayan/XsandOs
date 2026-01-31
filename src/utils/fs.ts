import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File system utilities
 */

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Best-effort cleanup - log but don't throw
    console.warn(`Failed to remove directory ${dirPath}:`, error);
  }
}
