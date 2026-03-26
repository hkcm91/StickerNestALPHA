/**
 * Video Renderer
 *
 * Takes a Timeline and renders it to a master 16:9 video using FFmpeg.
 * Handles: title cards, screenshot sequences with narration, transitions,
 * caption overlays, and end cards.
 *
 * Uses FFmpeg's filtergraph for all composition. No Remotion dependency
 * in v1 — FFmpeg handles everything. Remotion can be added as an
 * optional renderer for more complex animations in v2.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Timeline, TimelineSegment, CompositionConfig } from './types.js';
import { isFFmpegAvailable } from '../gif.js';

const execFileAsync = promisify(execFile);

// =============================================================================
// Title Card & End Card Generation
// =============================================================================

/**
 * Generate a title card image using FFmpeg's lavfi source.
 * Creates a solid color background with centered text.
 */
async function generateCard(
  text: string,
  outputPath: string,
  config: CompositionConfig,
  type: 'title' | 'end',
): Promise<void> {
  const { width, height } = config.resolution;
  const { bgColor, titleColor, accentColor, titleFont } = config.style;

  // Escape text for FFmpeg drawtext filter
  const escapedText = text
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\\/g, '\\\\');

  // Build the FFmpeg drawtext filter
  const fontSize = type === 'title' ? 48 : 36;
  const subtitleText = type === 'title' ? 'StickerNest' : '';

  let filterChain = `color=c=${bgColor}:s=${width}x${height}:d=1,` +
    `drawtext=text='${escapedText}':` +
    `fontcolor=${titleColor}:fontsize=${fontSize}:` +
    `x=(w-text_w)/2:y=(h-text_h)/2`;

  // Add subtitle for title cards
  if (subtitleText) {
    filterChain += `,drawtext=text='${subtitleText}':` +
      `fontcolor=${accentColor}:fontsize=24:` +
      `x=(w-text_w)/2:y=(h/2)+50`;
  }

  await execFileAsync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', filterChain,
    '-frames:v', '1',
    outputPath,
  ]);
}

// =============================================================================
// Segment Video Generation
// =============================================================================

/**
 * Generate a video segment from a screenshot with optional narration.
 * The screenshot is displayed for the segment's duration, with optional
 * caption overlay and narration audio.
 */
async function renderScreenshotSegment(
  segment: TimelineSegment,
  outputPath: string,
  config: CompositionConfig,
): Promise<void> {
  const { width, height } = config.resolution;
  const durationSec = segment.durationSec;
  const fps = config.fps;

  const inputArgs: string[] = ['-y'];
  const filterParts: string[] = [];
  let inputCount = 0;

  // Input 0: The screenshot, looped for duration
  inputArgs.push(
    '-loop', '1',
    '-t', String(durationSec),
    '-framerate', String(fps),
    '-i', segment.assetPath,
  );
  filterParts.push(`[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${config.style.bgColor}[base]`);
  inputCount++;

  // Optional: Add caption overlay
  let videoLabel = 'base';
  if (segment.annotation && config.style.captionStyle === 'bottom-bar') {
    const escapedAnnotation = segment.annotation
      .replace(/'/g, "'\\''")
      .replace(/:/g, '\\:');
    const captionFontSize = config.style.captionFontSize;
    const barHeight = captionFontSize + 24;

    filterParts.push(
      `[${videoLabel}]drawbox=x=0:y=ih-${barHeight}:w=iw:h=${barHeight}:color=black@0.7:t=fill[boxed]`,
      `[boxed]drawtext=text='${escapedAnnotation}':` +
        `fontcolor=white:fontsize=${captionFontSize}:` +
        `x=(w-text_w)/2:y=h-${barHeight / 2 + captionFontSize / 2}[captioned]`,
    );
    videoLabel = 'captioned';
  }

  // Build the final filter
  const filterComplex = filterParts.join(';');

  const outputArgs: string[] = [];

  // Add narration audio if available
  if (segment.narrationPath) {
    inputArgs.push('-i', segment.narrationPath);
    inputCount++;
    outputArgs.push(
      '-map', `[${videoLabel}]`,
      '-map', `${inputCount - 1}:a`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
    );
  } else {
    outputArgs.push('-map', `[${videoLabel}]`);
  }

  outputArgs.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-t', String(durationSec),
    outputPath,
  );

  const fullArgs = [
    ...inputArgs,
    '-filter_complex', filterComplex,
    ...outputArgs,
  ];

  await execFileAsync('ffmpeg', fullArgs, { timeout: 60000 });
}

/**
 * Generate a card video segment (title or end card).
 */
async function renderCardSegment(
  segment: TimelineSegment,
  outputPath: string,
  config: CompositionConfig,
  tempDir: string,
): Promise<void> {
  const cardType = segment.type === 'title-card' ? 'title' : 'end';
  const cardImagePath = path.join(tempDir, `${segment.stepId}-card.png`);

  // Generate the card image
  await generateCard(segment.label, cardImagePath, config, cardType);

  // Convert to video with duration
  const { width, height } = config.resolution;
  const args = [
    '-y',
    '-loop', '1',
    '-t', String(segment.durationSec),
    '-framerate', String(config.fps),
    '-i', cardImagePath,
    '-vf', `scale=${width}:${height}`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  await execFileAsync('ffmpeg', args, { timeout: 30000 });
}

// =============================================================================
// Concatenation
// =============================================================================

/**
 * Concatenate segment videos into the final master video.
 * Uses FFmpeg's concat demuxer for efficient joining.
 */
async function concatenateSegments(
  segmentPaths: string[],
  outputPath: string,
  tempDir: string,
): Promise<void> {
  // Write concat file list
  const concatList = segmentPaths
    .map((p) => `file '${p}'`)
    .join('\n');
  const concatFilePath = path.join(tempDir, 'concat.txt');
  await fs.writeFile(concatFilePath, concatList, 'utf-8');

  await execFileAsync('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFilePath,
    '-c', 'copy',
    outputPath,
  ], { timeout: 120000 });
}

// =============================================================================
// Main Render Function
// =============================================================================

export interface RenderOptions {
  timeline: Timeline;
  config: CompositionConfig;
  outputPath: string;
}

/**
 * Render a timeline into a final composed video.
 *
 * Process:
 * 1. Check FFmpeg availability
 * 2. For each segment: render to a temporary video file
 * 3. Concatenate all segments into the master video
 * 4. Clean up temp files
 *
 * @returns Path to the rendered video
 */
export async function renderVideo(options: RenderOptions): Promise<string> {
  const { timeline, config, outputPath } = options;

  // Verify FFmpeg
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error(
      'FFmpeg is required for video rendering. Install with:\n' +
        '  macOS: brew install ffmpeg\n' +
        '  Windows: choco install ffmpeg\n' +
        '  Linux: apt install ffmpeg',
    );
  }

  const outputDir = path.dirname(outputPath);
  const tempDir = path.join(outputDir, '.render-temp');
  await fs.mkdir(tempDir, { recursive: true });

  console.log(`\n  Rendering ${timeline.segments.length} segments...`);

  const segmentPaths: string[] = [];

  try {
    // Render each segment
    for (let i = 0; i < timeline.segments.length; i++) {
      const segment = timeline.segments[i];
      const segmentPath = path.join(tempDir, `segment-${String(i).padStart(3, '0')}.mp4`);

      const progress = `[${i + 1}/${timeline.segments.length}]`;

      if (segment.type === 'title-card' || segment.type === 'end-card') {
        console.log(`  ${progress} Rendering ${segment.type}: "${segment.label}"`);
        await renderCardSegment(segment, segmentPath, config, tempDir);
      } else if (segment.type === 'screenshot') {
        console.log(`  ${progress} Rendering screenshot: "${segment.label}" (${segment.durationSec.toFixed(1)}s)`);
        await renderScreenshotSegment(segment, segmentPath, config);
      } else if (segment.type === 'video') {
        // For video segments, just copy/transcode the source
        console.log(`  ${progress} Processing video: "${segment.label}"`);
        await execFileAsync('ffmpeg', [
          '-y', '-i', segment.assetPath,
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-t', String(segment.durationSec),
          segmentPath,
        ], { timeout: 60000 });
      }

      segmentPaths.push(segmentPath);
    }

    // Concatenate all segments
    console.log(`\n  Concatenating ${segmentPaths.length} segments into master video...`);
    await concatenateSegments(segmentPaths, outputPath, tempDir);

    console.log(`  ✓ Master video rendered: ${outputPath}`);
    return outputPath;
  } finally {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
