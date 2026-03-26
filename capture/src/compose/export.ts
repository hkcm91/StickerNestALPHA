/**
 * Multi-Format Exporter
 *
 * Takes a rendered master video and re-encodes it into platform-specific
 * formats: YouTube, TikTok, Twitter, Instagram, GIF, and screenshot sets.
 *
 * Each format has specific resolution, duration, and codec requirements
 * defined in FORMAT_SPECS. The exporter handles:
 * - Resolution scaling and aspect ratio conversion (letterbox/crop)
 * - Duration trimming for platform limits
 * - GIF conversion with palette optimization
 * - Screenshot extraction from capture manifests
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ExportConfig, ExportFormat } from './types.js';
import { FORMAT_SPECS } from './types.js';
import type { CaptureResult } from '../types.js';
import { isFFmpegAvailable } from '../gif.js';

const execFileAsync = promisify(execFile);

// =============================================================================
// Video Duration Detection
// =============================================================================

/**
 * Get the duration of a video file in seconds using FFprobe.
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    videoPath,
  ]);
  const duration = parseFloat(stdout.trim());
  if (isNaN(duration)) {
    throw new Error(`Could not determine video duration: "${stdout.trim()}"`);
  }
  return duration;
}

// =============================================================================
// Video Format Export
// =============================================================================

/**
 * Export a video to a specific format with resolution and duration constraints.
 * Uses FFmpeg scale filter with padding to maintain aspect ratio.
 */
async function exportVideoFormat(
  masterVideo: string,
  outputPath: string,
  format: ExportFormat,
  sourceDuration: number,
): Promise<void> {
  const spec = FORMAT_SPECS[format];
  const { width, height, maxDurationSec } = spec;

  // Determine effective duration
  const effectiveDuration = maxDurationSec
    ? Math.min(sourceDuration, maxDurationSec)
    : sourceDuration;

  // Build scale + pad filter to handle aspect ratio conversion
  // scale to fit within target, then pad to exact target dimensions
  const scaleFilter =
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
    `setsar=1`;

  const args: string[] = [
    '-y',
    '-i', masterVideo,
    '-vf', scaleFilter,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-t', String(effectiveDuration),
    '-movflags', '+faststart', // Enable streaming for web
    outputPath,
  ];

  await execFileAsync('ffmpeg', args, { timeout: 180000 });
}

// =============================================================================
// GIF Export
// =============================================================================

/**
 * Export a video segment as an optimized GIF.
 * Two-pass encoding with palette generation for quality.
 */
async function exportGifFormat(
  masterVideo: string,
  outputPath: string,
  format: ExportFormat,
  sourceDuration: number,
): Promise<void> {
  const spec = FORMAT_SPECS[format];
  const { width, maxDurationSec } = spec;
  const effectiveDuration = maxDurationSec
    ? Math.min(sourceDuration, maxDurationSec)
    : sourceDuration;

  const outputDir = path.dirname(outputPath);
  const palettePath = path.join(outputDir, `.palette-${format}.png`);

  const fps = 12; // Balanced quality/size for GIFs

  try {
    // Pass 1: Generate palette
    await execFileAsync('ffmpeg', [
      '-y',
      '-t', String(effectiveDuration),
      '-i', masterVideo,
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff`,
      '-frames:v', '1',
      palettePath,
    ], { timeout: 60000 });

    // Pass 2: Encode with palette
    await execFileAsync('ffmpeg', [
      '-y',
      '-t', String(effectiveDuration),
      '-i', masterVideo,
      '-i', palettePath,
      '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
      outputPath,
    ], { timeout: 60000 });
  } finally {
    // Clean up palette file
    await fs.rm(palettePath, { force: true });
  }
}

// =============================================================================
// Screenshot Set Export
// =============================================================================

/**
 * Export annotated screenshots from the capture manifest.
 * Scales each screenshot to the target resolution and adds annotation overlays.
 */
async function exportScreenshotSet(
  outputDir: string,
  captureManifest: string,
): Promise<string[]> {
  // Load the capture manifest
  const manifestData = await fs.readFile(captureManifest, 'utf-8');
  const captureResult: CaptureResult = JSON.parse(manifestData);

  const spec = FORMAT_SPECS['screenshot-set'];
  const { width, height } = spec;
  const exportedPaths: string[] = [];

  for (const screenshot of captureResult.screenshots) {
    const sourcePath = path.resolve(
      path.dirname(captureManifest),
      screenshot.path,
    );
    const outputPath = path.join(
      outputDir,
      `${screenshot.stepId}.png`,
    );

    // Check if source exists
    try {
      await fs.access(sourcePath);
    } catch {
      console.warn(`  ⚠ Screenshot not found: ${sourcePath}`);
      continue;
    }

    // Scale and optionally add annotation
    const filterParts: string[] = [
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white`,
    ];

    if (screenshot.annotation) {
      const escapedAnnotation = screenshot.annotation
        .replace(/'/g, "'\\''")
        .replace(/:/g, '\\:');
      const barHeight = 48;
      filterParts.push(
        `drawbox=x=0:y=ih-${barHeight}:w=iw:h=${barHeight}:color=black@0.7:t=fill`,
        `drawtext=text='${escapedAnnotation}':fontcolor=white:fontsize=20:x=(w-text_w)/2:y=h-34`,
      );
    }

    await execFileAsync('ffmpeg', [
      '-y',
      '-i', sourcePath,
      '-vf', filterParts.join(','),
      '-frames:v', '1',
      outputPath,
    ], { timeout: 15000 });

    exportedPaths.push(outputPath);
    console.log(`  ✓ Screenshot: ${screenshot.stepId} (${screenshot.label})`);
  }

  return exportedPaths;
}

// =============================================================================
// Main Export Function
// =============================================================================

export interface ExportResult {
  format: ExportFormat;
  path: string;
  width: number;
  height: number;
  fileExtension: string;
  durationSec?: number;
}

/**
 * Export a master video into multiple platform-specific formats.
 *
 * @returns Array of ExportResult with paths and metadata for each exported file
 */
export async function exportFormats(config: ExportConfig): Promise<ExportResult[]> {
  // Verify FFmpeg
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error(
      'FFmpeg is required for exporting. Install with:\n' +
        '  macOS: brew install ffmpeg\n' +
        '  Windows: choco install ffmpeg\n' +
        '  Linux: apt install ffmpeg',
    );
  }

  await fs.mkdir(config.outputDir, { recursive: true });

  // Get source video duration (needed for trimming decisions)
  let sourceDuration = 0;
  try {
    sourceDuration = await getVideoDuration(config.masterVideo);
  } catch {
    console.warn('  ⚠ Could not determine master video duration. Duration limits may not apply.');
    sourceDuration = 999; // Fallback — let FFmpeg handle it
  }

  console.log(`\n  Exporting ${config.formats.length} formats from master video...`);
  console.log(`  Master duration: ${sourceDuration.toFixed(1)}s\n`);

  const results: ExportResult[] = [];

  for (const format of config.formats) {
    const spec = FORMAT_SPECS[format];
    const outputPath = path.join(
      config.outputDir,
      `${format}.${spec.fileExtension}`,
    );

    try {
      if (format === 'screenshot-set') {
        // Screenshot set: extract from capture manifest
        if (!config.captureManifest) {
          console.warn(`  ⚠ Skipping screenshot-set: no captureManifest provided`);
          continue;
        }
        const screenshotDir = path.join(config.outputDir, 'screenshots');
        await fs.mkdir(screenshotDir, { recursive: true });

        console.log(`  [screenshot-set] Exporting annotated screenshots...`);
        const paths = await exportScreenshotSet(screenshotDir, config.captureManifest);

        // Add each screenshot as a separate result
        for (const p of paths) {
          results.push({
            format: 'screenshot-set',
            path: p,
            width: spec.width,
            height: spec.height,
            fileExtension: 'png',
          });
        }
        console.log(`  ✓ screenshot-set: ${paths.length} screenshots exported`);
      } else if (spec.codec === 'gif') {
        // GIF formats
        console.log(`  [${format}] Encoding GIF (${spec.width}px wide, max ${spec.maxDurationSec}s)...`);
        await exportGifFormat(config.masterVideo, outputPath, format, sourceDuration);

        const stat = await fs.stat(outputPath);
        const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
        console.log(`  ✓ ${format}: ${outputPath} (${sizeMB}MB)`);

        results.push({
          format,
          path: outputPath,
          width: spec.width,
          height: spec.height,
          fileExtension: spec.fileExtension,
          durationSec: spec.maxDurationSec
            ? Math.min(sourceDuration, spec.maxDurationSec)
            : sourceDuration,
        });
      } else {
        // Video formats (MP4)
        const effectiveDuration = spec.maxDurationSec
          ? Math.min(sourceDuration, spec.maxDurationSec)
          : sourceDuration;

        console.log(
          `  [${format}] Encoding ${spec.width}x${spec.height} MP4 ` +
          `(${effectiveDuration.toFixed(1)}s)...`,
        );
        await exportVideoFormat(config.masterVideo, outputPath, format, sourceDuration);

        const stat = await fs.stat(outputPath);
        const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
        console.log(`  ✓ ${format}: ${outputPath} (${sizeMB}MB)`);

        results.push({
          format,
          path: outputPath,
          width: spec.width,
          height: spec.height,
          fileExtension: spec.fileExtension,
          durationSec: effectiveDuration,
        });
      }
    } catch (error) {
      console.error(
        `  ✗ ${format} export failed: ` +
          `${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`\n  Export complete: ${results.length}/${config.formats.length} formats succeeded`);
  return results;
}

/**
 * Format export results as a human-readable summary.
 */
export function formatExportResults(results: ExportResult[]): string {
  const lines: string[] = [
    `Export Summary: ${results.length} files`,
    '',
  ];

  for (const r of results) {
    const duration = r.durationSec ? ` (${r.durationSec.toFixed(1)}s)` : '';
    lines.push(
      `  ${r.format.padEnd(20)} ${r.width}x${r.height} .${r.fileExtension}${duration}`,
    );
    lines.push(`    → ${r.path}`);
  }

  return lines.join('\n');
}
