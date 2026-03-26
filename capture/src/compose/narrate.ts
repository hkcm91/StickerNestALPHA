/**
 * Narration Generator
 *
 * Uses Microsoft Edge TTS (free neural voices) to generate narration
 * audio files for each step in a capture script.
 *
 * Edge TTS produces natural-sounding speech with zero API cost.
 * Voices: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { NarrationConfig, NarrationResult } from './types.js';
import type { CaptureResult } from '../types.js';

const execFileAsync = promisify(execFile);

// =============================================================================
// Edge TTS Availability
// =============================================================================

/**
 * Check if edge-tts CLI is available.
 * Install with: pip install edge-tts
 */
export async function isEdgeTtsAvailable(): Promise<boolean> {
  try {
    await execFileAsync('edge-tts', ['--version']);
    return true;
  } catch {
    // Try python module invoke
    try {
      await execFileAsync('python3', ['-m', 'edge_tts', '--version']);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get the edge-tts command (either direct CLI or python module).
 */
async function getEdgeTtsCommand(): Promise<{ cmd: string; args: string[] }> {
  try {
    await execFileAsync('edge-tts', ['--version']);
    return { cmd: 'edge-tts', args: [] };
  } catch {
    return { cmd: 'python3', args: ['-m', 'edge_tts'] };
  }
}

// =============================================================================
// Audio Duration Detection
// =============================================================================

/**
 * Get the duration of an audio file in seconds using FFprobe.
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      audioPath,
    ]);
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error(`Could not parse duration from ffprobe output: "${stdout.trim()}"`);
    }
    return duration;
  } catch (error) {
    // Fallback: estimate from file size (rough, ~16kbps for mp3)
    const stat = await fs.stat(audioPath);
    return stat.size / (16 * 1024 / 8);
  }
}

// =============================================================================
// Narration Generation
// =============================================================================

export interface NarrationOptions {
  config: NarrationConfig;
  outputDir: string;
}

/**
 * Generate narration audio for all steps that have narration text.
 *
 * @param captureResult - The capture manifest (provides step IDs and narration text)
 * @param options - Narration configuration and output directory
 * @returns Array of NarrationResult with paths and durations
 */
export async function generateNarration(
  captureResult: CaptureResult,
  options: NarrationOptions,
): Promise<NarrationResult[]> {
  const { config, outputDir } = options;

  if (!config.enabled) {
    return [];
  }

  // Check availability
  const available = await isEdgeTtsAvailable();
  if (!available) {
    console.warn(
      '[narrate] edge-tts not found. Install with: pip install edge-tts\n' +
        '  Skipping narration generation. Videos will be silent.',
    );
    return [];
  }

  await fs.mkdir(outputDir, { recursive: true });

  const { cmd, args: baseArgs } = await getEdgeTtsCommand();
  const results: NarrationResult[] = [];

  // Collect all steps with narration text (from screenshots and recordings)
  const stepsWithNarration: Array<{ stepId: string; narration: string }> = [];

  for (const screenshot of captureResult.screenshots) {
    if (screenshot.narration) {
      stepsWithNarration.push({
        stepId: screenshot.stepId,
        narration: screenshot.narration,
      });
    }
  }

  for (const recording of captureResult.recordings) {
    if (recording.narration && !stepsWithNarration.some(s => s.stepId === recording.stepId)) {
      stepsWithNarration.push({
        stepId: recording.stepId,
        narration: recording.narration,
      });
    }
  }

  // Generate audio for each step
  for (const step of stepsWithNarration) {
    const audioFile = path.join(outputDir, `${step.stepId}.mp3`);

    try {
      const ttsArgs = [
        ...baseArgs,
        '--voice', config.voice,
        '--rate', config.rate,
        '--pitch', config.pitch,
        '--text', step.narration,
        '--write-media', audioFile,
      ];

      await execFileAsync(cmd, ttsArgs, { timeout: 30000 });

      // Get actual audio duration
      const durationSec = await getAudioDuration(audioFile);

      results.push({
        stepId: step.stepId,
        audioPath: audioFile,
        durationSec,
        text: step.narration,
      });

      console.log(
        `  ✓ Narration: "${step.stepId}" (${durationSec.toFixed(1)}s)`,
      );
    } catch (error) {
      console.warn(
        `  ⚠ Narration failed for step "${step.stepId}": ` +
          `${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return results;
}

// =============================================================================
// Available Voices (popular subset)
// =============================================================================

/** Popular Edge TTS voices for demo narration */
export const RECOMMENDED_VOICES = {
  // US English
  'en-US-JennyNeural': 'Female, US English, warm and professional',
  'en-US-GuyNeural': 'Male, US English, clear and friendly',
  'en-US-AriaNeural': 'Female, US English, expressive',
  'en-US-DavisNeural': 'Male, US English, casual',
  'en-US-JaneNeural': 'Female, US English, conversational',
  'en-US-JasonNeural': 'Male, US English, confident',
  // UK English
  'en-GB-SoniaNeural': 'Female, UK English, polished',
  'en-GB-RyanNeural': 'Male, UK English, professional',
} as const;
