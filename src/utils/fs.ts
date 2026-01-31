import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Utility functions for file system operations
 * Handles directory creation and cleanup for temporary files
 */

/**
 * Ensures a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Recursively removes a directory and all its contents
 * Best-effort cleanup - errors are logged but don't throw
 */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Best-effort cleanup - log but don't fail
    console.warn(`Failed to remove directory ${dirPath}:`, error);
  }
}

/**
 * Removes a single file
 * Best-effort cleanup - errors are logged but don't throw
 */
export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn(`Failed to remove file ${filePath}:`, error);
  }
}

/**
 * Gets a unique temporary file path
 */
export function getTempFilePath(prefix: string, extension: string, baseDir: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return path.join(baseDir, `${prefix}_${timestamp}_${random}${extension}`);
}

/**
 * Gets file extension from a filename
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}
