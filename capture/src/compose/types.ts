/**
 * Video Composition Types
 *
 * Schemas for configuring how capture results are composed into
 * finished videos with narration, transitions, and branding.
 */

import { z } from 'zod';

// =============================================================================
// Style Configuration
// =============================================================================

export const StyleConfigSchema = z.object({
  /** Font for title cards and captions */
  titleFont: z.string().default('Inter'),
  /** Title text color (hex) */
  titleColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FFFFFF'),
  /** Background color for title cards and padding (hex) */
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#1a1a2e'),
  /** Accent color for highlights and progress bars (hex) */
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#e94560'),
  /** Transition between segments */
  transitionType: z.enum(['fade', 'cut']).default('fade'),
  /** Transition duration in seconds */
  transitionDuration: z.number().min(0).max(3).default(0.5),
  /** Caption style */
  captionStyle: z.enum(['bottom-bar', 'none']).default('bottom-bar'),
  /** Caption font size in pixels */
  captionFontSize: z.number().int().min(16).max(72).default(32),
});

export type StyleConfig = z.infer<typeof StyleConfigSchema>;

// =============================================================================
// Narration Configuration
// =============================================================================

export const NarrationConfigSchema = z.object({
  /** Edge TTS voice name */
  voice: z.string().default('en-US-JennyNeural'),
  /** Speaking rate adjustment (e.g., '+10%', '-5%', '+0%') */
  rate: z.string().regex(/^[+-]\d+%$/).default('+0%'),
  /** Pitch adjustment (e.g., '+5Hz', '-10Hz', '+0Hz') */
  pitch: z.string().regex(/^[+-]\d+Hz$/).default('+0Hz'),
  /** Whether narration is enabled */
  enabled: z.boolean().default(true),
});

export type NarrationConfig = z.infer<typeof NarrationConfigSchema>;

// =============================================================================
// Music Configuration
// =============================================================================

export const MusicConfigSchema = z.object({
  /** Path to background music file (.mp3 or .wav) */
  track: z.string().optional(),
  /** Volume level (0.0 to 1.0), mixed under narration */
  volume: z.number().min(0).max(1).default(0.15),
  /** Fade in duration in seconds */
  fadeIn: z.number().min(0).max(5).default(1),
  /** Fade out duration in seconds */
  fadeOut: z.number().min(0).max(5).default(2),
});

export type MusicConfig = z.infer<typeof MusicConfigSchema>;

// =============================================================================
// Branding Configuration
// =============================================================================

export const BrandingConfigSchema = z.object({
  /** Path to logo PNG (placed in title card and end card) */
  logo: z.string().optional(),
  /** Whether to show a subtle watermark */
  watermark: z.boolean().default(false),
  /** Whether to show the StickerNest end card */
  endCard: z.boolean().default(true),
  /** End card duration in seconds */
  endCardDuration: z.number().min(1).max(10).default(3),
});

export type BrandingConfig = z.infer<typeof BrandingConfigSchema>;

// =============================================================================
// Composition Configuration (top-level)
// =============================================================================

export const CompositionConfigSchema = z.object({
  /** Path to the CaptureResult manifest.json */
  captureManifest: z.string(),
  /** Visual style settings */
  style: StyleConfigSchema.default({
    titleFont: 'Inter',
    titleColor: '#FFFFFF',
    bgColor: '#1a1a2e',
    accentColor: '#e94560',
    transitionType: 'fade',
    transitionDuration: 0.5,
    captionStyle: 'bottom-bar',
    captionFontSize: 32,
  }),
  /** Narration settings */
  narration: NarrationConfigSchema.default({
    voice: 'en-US-JennyNeural',
    rate: '+0%',
    pitch: '+0Hz',
    enabled: true,
  }),
  /** Background music settings */
  music: MusicConfigSchema.optional(),
  /** Branding settings */
  branding: BrandingConfigSchema.default({
    watermark: false,
    endCard: true,
    endCardDuration: 3,
  }),
  /** Title card settings */
  titleCard: z.object({
    /** Whether to show a title card at the start */
    enabled: z.boolean().default(true),
    /** Duration in seconds */
    duration: z.number().min(1).max(10).default(3),
  }).default({ enabled: true, duration: 3 }),
  /** Minimum display time per screenshot in seconds */
  minSegmentDuration: z.number().min(1).max(30).default(3),
  /** Output FPS */
  fps: z.number().int().min(15).max(60).default(30),
  /** Output resolution (the master 16:9 video) */
  resolution: z.object({
    width: z.number().int().default(1920),
    height: z.number().int().default(1080),
  }).default({ width: 1920, height: 1080 }),
});

export type CompositionConfig = z.infer<typeof CompositionConfigSchema>;

// =============================================================================
// Timeline Types (internal, not user-facing)
// =============================================================================

export interface TimelineSegment {
  stepId: string;
  label: string;
  type: 'title-card' | 'screenshot' | 'video' | 'end-card';
  /** Path to the visual asset */
  assetPath: string;
  /** Path to narration audio file (if any) */
  narrationPath?: string;
  /** Narration text */
  narrationText?: string;
  /** Annotation text to overlay */
  annotation?: string;
  /** Start time in seconds from video start */
  startSec: number;
  /** Duration in seconds */
  durationSec: number;
  /** Transition in type */
  transitionIn: 'fade' | 'cut';
}

export interface Timeline {
  segments: TimelineSegment[];
  totalDurationSec: number;
  fps: number;
  resolution: { width: number; height: number };
}

// =============================================================================
// Narration Result (per-step audio files)
// =============================================================================

export interface NarrationResult {
  stepId: string;
  audioPath: string;
  durationSec: number;
  text: string;
}

// =============================================================================
// Export Format Configuration
// =============================================================================

export const ExportFormatSchema = z.enum([
  'youtube-standard',   // 1920x1080, 16:9, MP4, H.264
  'youtube-short',      // 1080x1920, 9:16, < 60s, MP4
  'tiktok',             // 1080x1920, 9:16, 15-60s, MP4
  'twitter-video',      // 1280x720, 16:9, < 140s, MP4
  'twitter-square',     // 1080x1080, 1:1, < 140s, MP4
  'gif-hero',           // 800x450, 16:9, < 15s, GIF (README/docs)
  'gif-feature',        // 480x270, 16:9, < 10s, GIF (tweets)
  'screenshot-set',     // Annotated PNGs at 1280x720
  'instagram-reel',     // 1080x1920, 9:16, < 90s, MP4
]);

export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportConfigSchema = z.object({
  /** Which formats to export */
  formats: z.array(ExportFormatSchema).default([
    'youtube-standard',
    'tiktok',
    'gif-hero',
    'screenshot-set',
  ]),
  /** Output directory */
  outputDir: z.string(),
  /** Path to the composed master video */
  masterVideo: z.string(),
  /** Path to the capture manifest (for screenshot-set) */
  captureManifest: z.string().optional(),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;

/** Resolution and constraints for each export format */
export const FORMAT_SPECS: Record<ExportFormat, {
  width: number;
  height: number;
  maxDurationSec: number | null;
  codec: string;
  fileExtension: string;
}> = {
  'youtube-standard':  { width: 1920, height: 1080, maxDurationSec: null,  codec: 'h264', fileExtension: 'mp4' },
  'youtube-short':     { width: 1080, height: 1920, maxDurationSec: 60,    codec: 'h264', fileExtension: 'mp4' },
  'tiktok':            { width: 1080, height: 1920, maxDurationSec: 60,    codec: 'h264', fileExtension: 'mp4' },
  'twitter-video':     { width: 1280, height: 720,  maxDurationSec: 140,   codec: 'h264', fileExtension: 'mp4' },
  'twitter-square':    { width: 1080, height: 1080, maxDurationSec: 140,   codec: 'h264', fileExtension: 'mp4' },
  'gif-hero':          { width: 800,  height: 450,  maxDurationSec: 15,    codec: 'gif',  fileExtension: 'gif' },
  'gif-feature':       { width: 480,  height: 270,  maxDurationSec: 10,    codec: 'gif',  fileExtension: 'gif' },
  'screenshot-set':    { width: 1280, height: 720,  maxDurationSec: null,  codec: 'png',  fileExtension: 'png' },
  'instagram-reel':    { width: 1080, height: 1920, maxDurationSec: 90,    codec: 'h264', fileExtension: 'mp4' },
};
