/**
 * GIF Compilation Utility
 *
 * Compiles a directory of PNG frames into an optimized GIF using FFmpeg.
 * Falls back gracefully if FFmpeg is not installed.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execFileAsync = promisify(execFile);

/**
 * Check if FFmpeg is available on the system.
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compile PNG frames into an optimized GIF.
 *
 * @param framesDir - Directory containing frame-XXXX.png files
 * @param outputPath - Path for the output GIF file
 * @param fps - Framerate of the GIF
 * @param maxWidth - Maximum width (maintains aspect ratio). Defaults to 800px.
 *
 * @throws If FFmpeg is not available or the compilation fails
 */
export async function compileGif(
  framesDir: string,
  outputPath: string,
  fps: number = 10,
  maxWidth: number = 800,
): Promise<void> {
  // Verify FFmpeg is available
  const available = await isFFmpegAvailable();
  if (!available) {
    throw new Error(
      'FFmpeg is not installed. Install it with: brew install ffmpeg (macOS), ' +
        'choco install ffmpeg (Windows), or apt install ffmpeg (Linux)',
    );
  }

  // Verify frames exist
  const files = await fs.readdir(framesDir);
  const frames = files.filter((f) => f.startsWith('frame-') && f.endsWith('.png')).sort();
  if (frames.length === 0) {
    throw new Error(`No frame files found in ${framesDir}`);
  }

  const inputPattern = path.join(framesDir, 'frame-%04d.png');

  // Two-pass GIF generation for better quality:
  // 1. Generate an optimized palette from the actual frames
  // 2. Use that palette to create the final GIF
  const paletteFile = path.join(framesDir, 'palette.png');

  try {
    // Pass 1: Generate palette
    await execFileAsync('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', inputPattern,
      '-vf', `fps=${fps},scale=${maxWidth}:-1:flags=lanczos,palettegen=stats_mode=diff`,
      paletteFile,
    ]);

    // Pass 2: Generate GIF using palette
    await execFileAsync('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', inputPattern,
      '-i', paletteFile,
      '-lavfi', `fps=${fps},scale=${maxWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
      '-loop', '0',
      outputPath,
    ]);
  } finally {
    // Clean up palette file
    try {
      await fs.unlink(paletteFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Optimize an existing GIF file using gifsicle (if available).
 * Returns the optimized file size, or the original size if gifsicle is not available.
 */
export async function optimizeGif(gifPath: string): Promise<{ sizeBytes: number }> {
  try {
    await execFileAsync('gifsicle', [
      '-O3',
      '--colors', '256',
      '-o', gifPath,
      gifPath,
    ]);
  } catch {
    // gifsicle not available — skip optimization silently
  }

  const stat = await fs.stat(gifPath);
  return { sizeBytes: stat.size };
}
