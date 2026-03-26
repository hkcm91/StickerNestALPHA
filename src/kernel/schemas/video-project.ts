/**
 * Video Project schemas — project metadata and render job tracking
 *
 * @module @sn/types/video-project
 *
 * @remarks
 * Video projects are stored in the `video_projects` Supabase table.
 * Timeline data lives on CanvasDocument for atomic save/load,
 * but is also serialized to video_projects for project management.
 *
 * Render jobs track the status of video export operations
 * (client-side WebCodecs or server-side FFmpeg).
 */

import { z } from 'zod';

import { TimelineDataSchema } from './timeline';

// =============================================================================
// Video Project
// =============================================================================

export const VideoProjectStatusSchema = z.enum([
  'draft', 'rendering', 'completed', 'failed', 'archived',
]);

export type VideoProjectStatus = z.infer<typeof VideoProjectStatusSchema>;

export const VideoProjectSchema = z.object({
  /** Unique project ID */
  id: z.string().uuid(),
  /** Canvas this project belongs to */
  canvasId: z.string().uuid(),
  /** User who owns this project */
  userId: z.string().uuid(),
  /** Project name */
  name: z.string().min(1),
  /** Project status */
  status: VideoProjectStatusSchema.default('draft'),
  /** Full timeline data snapshot */
  timelineData: TimelineDataSchema,
  /** Thumbnail URL for project listing */
  thumbnailUrl: z.string().url().optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
});

export type VideoProject = z.infer<typeof VideoProjectSchema>;

// =============================================================================
// Render Job
// =============================================================================

export const RenderJobStatusSchema = z.enum([
  'queued', 'processing', 'encoding', 'uploading',
  'completed', 'failed', 'cancelled',
]);

export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;

export const RenderJobSchema = z.object({
  /** Unique render job ID */
  id: z.string().uuid(),
  /** Video project this render belongs to */
  projectId: z.string().uuid(),
  /** User who initiated the render */
  userId: z.string().uuid(),
  /** Render status */
  status: RenderJobStatusSchema.default('queued'),
  /** Export format (e.g., 'youtube-standard', 'tiktok') */
  format: z.string(),
  /** Render progress (0-1) */
  progress: z.number().min(0).max(1).default(0),
  /** Output file URL once completed */
  outputUrl: z.string().url().optional(),
  /** Output file storage path */
  outputStoragePath: z.string().optional(),
  /** File size in bytes */
  fileSizeBytes: z.number().int().nonnegative().optional(),
  /** Error message if failed */
  error: z.string().optional(),
  /** When render started processing */
  startedAt: z.string().datetime().optional(),
  /** When render completed */
  completedAt: z.string().datetime().optional(),
  /** When render was created/queued */
  createdAt: z.string().datetime(),
});

export type RenderJob = z.infer<typeof RenderJobSchema>;

// =============================================================================
// JSON Schema exports
// =============================================================================

export const VideoProjectJSONSchema = VideoProjectSchema.toJSONSchema();
export const RenderJobJSONSchema = RenderJobSchema.toJSONSchema();
