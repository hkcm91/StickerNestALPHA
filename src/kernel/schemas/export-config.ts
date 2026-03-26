/**
 * Export configuration schemas for client-side video rendering
 *
 * @module @sn/types/export-config
 *
 * @remarks
 * Defines the configuration for in-browser video export using WebCodecs.
 * Format specs match the capture/ pipeline's FORMAT_SPECS for consistency.
 */

import { z } from 'zod';

// =============================================================================
// Export Format
// =============================================================================

export const ExportFormatSchema = z.enum([
  'mp4-1080p',
  'mp4-720p',
  'mp4-4k',
  'webm-1080p',
  'youtube-standard',
  'youtube-short',
  'tiktok',
  'twitter-video',
  'twitter-square',
  'instagram-reel',
  'gif',
]);

export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// =============================================================================
// Format Specifications
// =============================================================================

export interface FormatSpec {
  width: number;
  height: number;
  maxDurationSec: number | null;
  codec: 'h264' | 'vp9' | 'gif';
  fileExtension: string;
  bitrate: number;
  label: string;
}

export const FORMAT_SPECS: Record<ExportFormat, FormatSpec> = {
  'mp4-1080p':        { width: 1920, height: 1080, maxDurationSec: null, codec: 'h264', fileExtension: 'mp4', bitrate: 8_000_000, label: 'MP4 1080p' },
  'mp4-720p':         { width: 1280, height: 720,  maxDurationSec: null, codec: 'h264', fileExtension: 'mp4', bitrate: 5_000_000, label: 'MP4 720p' },
  'mp4-4k':           { width: 3840, height: 2160, maxDurationSec: null, codec: 'h264', fileExtension: 'mp4', bitrate: 20_000_000, label: 'MP4 4K' },
  'webm-1080p':       { width: 1920, height: 1080, maxDurationSec: null, codec: 'vp9',  fileExtension: 'webm', bitrate: 6_000_000, label: 'WebM 1080p' },
  'youtube-standard': { width: 1920, height: 1080, maxDurationSec: null, codec: 'h264', fileExtension: 'mp4', bitrate: 8_000_000, label: 'YouTube 1080p' },
  'youtube-short':    { width: 1080, height: 1920, maxDurationSec: 60,   codec: 'h264', fileExtension: 'mp4', bitrate: 8_000_000, label: 'YouTube Short' },
  'tiktok':           { width: 1080, height: 1920, maxDurationSec: 60,   codec: 'h264', fileExtension: 'mp4', bitrate: 8_000_000, label: 'TikTok' },
  'twitter-video':    { width: 1280, height: 720,  maxDurationSec: 140,  codec: 'h264', fileExtension: 'mp4', bitrate: 5_000_000, label: 'Twitter Video' },
  'twitter-square':   { width: 1080, height: 1080, maxDurationSec: 140,  codec: 'h264', fileExtension: 'mp4', bitrate: 6_000_000, label: 'Twitter Square' },
  'instagram-reel':   { width: 1080, height: 1920, maxDurationSec: 90,   codec: 'h264', fileExtension: 'mp4', bitrate: 8_000_000, label: 'Instagram Reel' },
  'gif':              { width: 480,  height: 270,  maxDurationSec: 15,   codec: 'gif',  fileExtension: 'gif', bitrate: 0, label: 'GIF' },
};

// =============================================================================
// Client Export Config
// =============================================================================

export const ClientExportConfigSchema = z.object({
  /** Export format */
  format: ExportFormatSchema,
  /** Custom width override (uses format spec if not set) */
  width: z.number().int().positive().optional(),
  /** Custom height override (uses format spec if not set) */
  height: z.number().int().positive().optional(),
  /** Custom bitrate override */
  bitrate: z.number().int().positive().optional(),
  /** Frame range start (default: 0) */
  startFrame: z.number().int().nonnegative().default(0),
  /** Frame range end (default: total frames) */
  endFrame: z.number().int().nonnegative().optional(),
  /** Include audio in export */
  includeAudio: z.boolean().default(true),
});

export type ClientExportConfig = z.infer<typeof ClientExportConfigSchema>;

// =============================================================================
// Export Progress
// =============================================================================

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'muxing' | 'complete' | 'failed' | 'cancelled';
  currentFrame: number;
  totalFrames: number;
  percent: number;
  estimatedTimeRemaining: number | null;
  error?: string;
}

// =============================================================================
// JSON Schema exports
// =============================================================================

export const ExportFormatJSONSchema = ExportFormatSchema.toJSONSchema();
export const ClientExportConfigJSONSchema = ClientExportConfigSchema.toJSONSchema();
