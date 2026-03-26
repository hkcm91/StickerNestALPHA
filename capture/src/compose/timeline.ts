/**
 * Timeline Calculator
 *
 * Takes a CaptureResult and optional NarrationResults and produces
 * a frame-accurate timeline with start/end times for each segment.
 *
 * The timeline is the bridge between raw captures and the final video:
 * it determines how long each screenshot is shown, where transitions go,
 * and how narration syncs to visuals.
 */

import * as path from 'node:path';
import type { CaptureResult } from '../types.js';
import type {
  CompositionConfig,
  Timeline,
  TimelineSegment,
  NarrationResult,
} from './types.js';

export interface TimelineOptions {
  captureResult: CaptureResult;
  config: CompositionConfig;
  narrationResults: NarrationResult[];
  /** Base directory where capture assets live */
  captureDir: string;
}

/**
 * Build a timeline from capture results and narration.
 *
 * Algorithm:
 * 1. Title card (if enabled): fixed duration from config
 * 2. For each screenshot/recording step:
 *    - Duration = max(narration duration + buffer, minSegmentDuration)
 *    - This ensures narration never outruns the visual
 * 3. End card (if enabled): fixed duration from config
 */
export function buildTimeline(options: TimelineOptions): Timeline {
  const { captureResult, config, narrationResults, captureDir } = options;
  const segments: TimelineSegment[] = [];

  // Map narration results by stepId for fast lookup
  const narrationMap = new Map<string, NarrationResult>();
  for (const nr of narrationResults) {
    narrationMap.set(nr.stepId, nr);
  }

  let currentTimeSec = 0;
  const transitionDur = config.style.transitionDuration;

  // -----------------------------------------------------------
  // 1. Title Card
  // -----------------------------------------------------------
  if (config.titleCard.enabled) {
    segments.push({
      stepId: '__title-card',
      label: captureResult.metadata.hook,
      type: 'title-card',
      assetPath: '', // Generated dynamically by renderer
      narrationText: captureResult.metadata.hook,
      startSec: currentTimeSec,
      durationSec: config.titleCard.duration,
      transitionIn: 'fade',
    });
    currentTimeSec += config.titleCard.duration;
  }

  // -----------------------------------------------------------
  // 2. Screenshot/Video segments
  // -----------------------------------------------------------
  for (const screenshot of captureResult.screenshots) {
    const narration = narrationMap.get(screenshot.stepId);
    const narrationDuration = narration ? narration.durationSec + 0.5 : 0; // 0.5s buffer
    const segmentDuration = Math.max(narrationDuration, config.minSegmentDuration);

    segments.push({
      stepId: screenshot.stepId,
      label: screenshot.label,
      type: 'screenshot',
      assetPath: path.join(captureDir, screenshot.path),
      narrationPath: narration?.audioPath,
      narrationText: screenshot.narration,
      annotation: screenshot.annotation,
      startSec: currentTimeSec,
      durationSec: segmentDuration,
      transitionIn: currentTimeSec === 0 ? 'cut' : config.style.transitionType,
    });

    currentTimeSec += segmentDuration;

    // Account for transition overlap (next segment starts slightly earlier)
    if (config.style.transitionType === 'fade' && transitionDur > 0) {
      currentTimeSec -= transitionDur * 0.5; // Half overlap
    }
  }

  // -----------------------------------------------------------
  // 3. End Card
  // -----------------------------------------------------------
  if (config.branding.endCard) {
    segments.push({
      stepId: '__end-card',
      label: captureResult.metadata.cta,
      type: 'end-card',
      assetPath: '', // Generated dynamically by renderer
      narrationText: captureResult.metadata.cta,
      startSec: currentTimeSec,
      durationSec: config.branding.endCardDuration,
      transitionIn: 'fade',
    });
    currentTimeSec += config.branding.endCardDuration;
  }

  return {
    segments,
    totalDurationSec: currentTimeSec,
    fps: config.fps,
    resolution: config.resolution,
  };
}

/**
 * Format a timeline as a human-readable summary.
 */
export function formatTimeline(timeline: Timeline): string {
  const lines: string[] = [
    `Timeline: ${timeline.totalDurationSec.toFixed(1)}s total, ${timeline.segments.length} segments, ${timeline.fps}fps`,
    `Resolution: ${timeline.resolution.width}x${timeline.resolution.height}`,
    '',
  ];

  for (const seg of timeline.segments) {
    const endSec = seg.startSec + seg.durationSec;
    const timeStr = `${seg.startSec.toFixed(1)}s - ${endSec.toFixed(1)}s`;
    const narrationTag = seg.narrationPath ? ' [narrated]' : '';
    const annotationTag = seg.annotation ? ` [annotated: "${seg.annotation}"]` : '';
    lines.push(
      `  [${timeStr}] ${seg.type.padEnd(12)} | ${seg.label}${narrationTag}${annotationTag}`,
    );
  }

  return lines.join('\n');
}
