import { describe, it, expect } from 'vitest';
import { buildTimeline, formatTimeline } from './timeline.js';
import type { CaptureResult } from '../types.js';
import type { CompositionConfig, NarrationResult } from './types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function makeConfig(overrides: Partial<CompositionConfig> = {}): CompositionConfig {
  return {
    captureManifest: '/test/manifest.json',
    style: {
      titleFont: 'Inter',
      titleColor: '#FFFFFF',
      bgColor: '#1a1a2e',
      accentColor: '#e94560',
      transitionType: 'fade',
      transitionDuration: 0.5,
      captionStyle: 'bottom-bar',
      captionFontSize: 32,
    },
    narration: {
      voice: 'en-US-JennyNeural',
      rate: '+0%',
      pitch: '+0Hz',
      enabled: true,
    },
    branding: {
      watermark: false,
      endCard: true,
      endCardDuration: 3,
    },
    titleCard: {
      enabled: true,
      duration: 3,
    },
    minSegmentDuration: 3,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    ...overrides,
  };
}

function makeCaptureResult(screenshots: Array<{
  stepId: string;
  label: string;
  narration?: string;
  annotation?: string;
}>): CaptureResult {
  return {
    screenshots: screenshots.map((s) => ({
      stepId: s.stepId,
      label: s.label,
      path: `screenshots/${s.stepId}.png`,
      narration: s.narration,
      annotation: s.annotation,
    })),
    recordings: [],
    gifs: [],
    totalDurationMs: 10000,
    capturedAt: '2026-03-24T00:00:00Z',
    metadata: {
      hook: 'Test Hook',
      cta: 'Try it now',
      tags: ['test'],
    },
    targetUrl: 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
  };
}

// =============================================================================
// buildTimeline
// =============================================================================

describe('buildTimeline', () => {
  it('should create title card when enabled', () => {
    const config = makeConfig();
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First step' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    expect(timeline.segments[0].type).toBe('title-card');
    expect(timeline.segments[0].label).toBe('Test Hook');
    expect(timeline.segments[0].durationSec).toBe(3);
    expect(timeline.segments[0].startSec).toBe(0);
  });

  it('should skip title card when disabled', () => {
    const config = makeConfig({ titleCard: { enabled: false, duration: 3 } });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First step' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    expect(timeline.segments[0].type).toBe('screenshot');
  });

  it('should create end card when enabled', () => {
    const config = makeConfig();
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First step' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    const lastSegment = timeline.segments[timeline.segments.length - 1];
    expect(lastSegment.type).toBe('end-card');
    expect(lastSegment.label).toBe('Try it now');
    expect(lastSegment.durationSec).toBe(3);
  });

  it('should skip end card when disabled', () => {
    const config = makeConfig({
      branding: { watermark: false, endCard: false, endCardDuration: 3 },
    });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First step' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    const lastSegment = timeline.segments[timeline.segments.length - 1];
    expect(lastSegment.type).toBe('screenshot');
  });

  it('should use minSegmentDuration when no narration', () => {
    const config = makeConfig({ minSegmentDuration: 5 });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First step' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    const screenshotSeg = timeline.segments.find((s) => s.type === 'screenshot');
    expect(screenshotSeg?.durationSec).toBe(5);
  });

  it('should extend duration to fit narration', () => {
    const config = makeConfig({ minSegmentDuration: 3 });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First step' },
    ]);

    const narrationResults: NarrationResult[] = [
      { stepId: 'step-1', audioPath: '/test/step-1.mp3', durationSec: 8, text: 'Long narration' },
    ];

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults,
      captureDir: '/test',
    });

    const screenshotSeg = timeline.segments.find((s) => s.type === 'screenshot');
    // Duration should be narration (8s) + buffer (0.5s) = 8.5s
    expect(screenshotSeg?.durationSec).toBe(8.5);
  });

  it('should correctly sequence multiple segments', () => {
    const config = makeConfig({
      titleCard: { enabled: false, duration: 3 },
      branding: { watermark: false, endCard: false, endCardDuration: 3 },
      style: {
        titleFont: 'Inter',
        titleColor: '#FFFFFF',
        bgColor: '#1a1a2e',
        accentColor: '#e94560',
        transitionType: 'cut', // No transition overlap
        transitionDuration: 0,
        captionStyle: 'bottom-bar',
        captionFontSize: 32,
      },
      minSegmentDuration: 3,
    });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First' },
      { stepId: 'step-2', label: 'Second' },
      { stepId: 'step-3', label: 'Third' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    expect(timeline.segments).toHaveLength(3);
    expect(timeline.segments[0].startSec).toBe(0);
    expect(timeline.segments[1].startSec).toBe(3);
    expect(timeline.segments[2].startSec).toBe(6);
    expect(timeline.totalDurationSec).toBe(9);
  });

  it('should handle fade transition overlap', () => {
    const config = makeConfig({
      titleCard: { enabled: false, duration: 3 },
      branding: { watermark: false, endCard: false, endCardDuration: 3 },
      style: {
        titleFont: 'Inter',
        titleColor: '#FFFFFF',
        bgColor: '#1a1a2e',
        accentColor: '#e94560',
        transitionType: 'fade',
        transitionDuration: 1, // 1s transition
        captionStyle: 'bottom-bar',
        captionFontSize: 32,
      },
      minSegmentDuration: 4,
    });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First' },
      { stepId: 'step-2', label: 'Second' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    // First segment starts at 0, duration 4
    // With 1s fade, half overlap = 0.5s
    // Second segment starts at 3.5 (4 - 0.5)
    expect(timeline.segments[0].startSec).toBe(0);
    expect(timeline.segments[1].startSec).toBe(3.5);
  });

  it('should include narration path in timeline segment', () => {
    const config = makeConfig({
      titleCard: { enabled: false, duration: 3 },
      branding: { watermark: false, endCard: false, endCardDuration: 3 },
    });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First', narration: 'Hello world' },
    ]);
    const narrationResults: NarrationResult[] = [
      { stepId: 'step-1', audioPath: '/test/narration/step-1.mp3', durationSec: 2, text: 'Hello world' },
    ];

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults,
      captureDir: '/test',
    });

    expect(timeline.segments[0].narrationPath).toBe('/test/narration/step-1.mp3');
    expect(timeline.segments[0].narrationText).toBe('Hello world');
  });

  it('should include annotation in timeline segment', () => {
    const config = makeConfig({
      titleCard: { enabled: false, duration: 3 },
      branding: { watermark: false, endCard: false, endCardDuration: 3 },
    });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First', annotation: 'Click here' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    expect(timeline.segments[0].annotation).toBe('Click here');
  });

  it('should set resolution and fps from config', () => {
    const config = makeConfig({ fps: 60, resolution: { width: 1280, height: 720 } });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    expect(timeline.fps).toBe(60);
    expect(timeline.resolution).toEqual({ width: 1280, height: 720 });
  });
});

// =============================================================================
// formatTimeline
// =============================================================================

describe('formatTimeline', () => {
  it('should produce human-readable output', () => {
    const config = makeConfig({
      titleCard: { enabled: false, duration: 3 },
      branding: { watermark: false, endCard: false, endCardDuration: 3 },
      style: {
        titleFont: 'Inter',
        titleColor: '#FFFFFF',
        bgColor: '#1a1a2e',
        accentColor: '#e94560',
        transitionType: 'cut',
        transitionDuration: 0,
        captionStyle: 'bottom-bar',
        captionFontSize: 32,
      },
    });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First' },
    ]);

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults: [],
      captureDir: '/test',
    });

    const output = formatTimeline(timeline);
    expect(output).toContain('Timeline:');
    expect(output).toContain('segments');
    expect(output).toContain('First');
    expect(output).toContain('screenshot');
    expect(output).toContain('1920x1080');
  });

  it('should show narrated and annotated tags', () => {
    const config = makeConfig({
      titleCard: { enabled: false, duration: 3 },
      branding: { watermark: false, endCard: false, endCardDuration: 3 },
    });
    const captureResult = makeCaptureResult([
      { stepId: 'step-1', label: 'First', annotation: 'Note' },
    ]);
    const narrationResults: NarrationResult[] = [
      { stepId: 'step-1', audioPath: '/test/step-1.mp3', durationSec: 2, text: 'Hello' },
    ];

    const timeline = buildTimeline({
      captureResult,
      config,
      narrationResults,
      captureDir: '/test',
    });

    const output = formatTimeline(timeline);
    expect(output).toContain('[narrated]');
    expect(output).toContain('[annotated: "Note"]');
  });
});
