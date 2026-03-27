/**
 * Video Project API — CRUD for video_projects and video_renders tables
 *
 * @module kernel/supabase/video-project-api
 *
 * @remarks
 * Provides typed functions for managing video projects and render jobs
 * via the Supabase client. Follows the same pattern as datasource.ts.
 */

import type { TimelineData } from '@sn/types';

import { supabase } from './client';

// Video tables are not yet in the generated Supabase types.
// Use an untyped reference until the next `supabase gen types` run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// =============================================================================
// Types
// =============================================================================

export interface VideoProjectRow {
  id: string;
  canvas_id: string;
  user_id: string;
  name: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed' | 'archived';
  timeline_data: TimelineData;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenderJobRow {
  id: string;
  project_id: string;
  user_id: string;
  status: 'queued' | 'processing' | 'encoding' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  format: string;
  progress: number;
  output_url: string | null;
  output_storage_path: string | null;
  file_size_bytes: number | null;
  error_message: string | null;
  render_config: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// =============================================================================
// Video Project CRUD
// =============================================================================

export async function createVideoProject(
  canvasId: string,
  userId: string,
  name: string,
  timelineData: TimelineData,
): Promise<VideoProjectRow> {
  const { data, error } = await db
    .from('video_projects')
    .insert({
      canvas_id: canvasId,
      user_id: userId,
      name,
      timeline_data: timelineData,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create video project: ${error.message}`);
  return data as VideoProjectRow;
}

export async function getVideoProject(projectId: string): Promise<VideoProjectRow | null> {
  const { data, error } = await db
    .from('video_projects')
    .select()
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch video project: ${error.message}`);
  }
  return data as VideoProjectRow;
}

export async function listVideoProjects(canvasId: string): Promise<VideoProjectRow[]> {
  const { data, error } = await db
    .from('video_projects')
    .select()
    .eq('canvas_id', canvasId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to list video projects: ${error.message}`);
  return (data ?? []) as VideoProjectRow[];
}

export async function updateVideoProject(
  projectId: string,
  updates: Partial<Pick<VideoProjectRow, 'name' | 'status' | 'timeline_data' | 'thumbnail_url'>>,
): Promise<VideoProjectRow> {
  const { data, error } = await db
    .from('video_projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update video project: ${error.message}`);
  return data as VideoProjectRow;
}

export async function deleteVideoProject(projectId: string): Promise<void> {
  const { error } = await db
    .from('video_projects')
    .delete()
    .eq('id', projectId);

  if (error) throw new Error(`Failed to delete video project: ${error.message}`);
}

// =============================================================================
// Render Job CRUD
// =============================================================================

export async function createRenderJob(
  projectId: string,
  userId: string,
  format: string,
  renderConfig?: Record<string, unknown>,
): Promise<RenderJobRow> {
  const { data, error } = await db
    .from('video_renders')
    .insert({
      project_id: projectId,
      user_id: userId,
      format,
      render_config: renderConfig ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create render job: ${error.message}`);
  return data as RenderJobRow;
}

export async function getRenderJob(renderJobId: string): Promise<RenderJobRow | null> {
  const { data, error } = await db
    .from('video_renders')
    .select()
    .eq('id', renderJobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch render job: ${error.message}`);
  }
  return data as RenderJobRow;
}

export async function listRenderJobs(projectId: string): Promise<RenderJobRow[]> {
  const { data, error } = await db
    .from('video_renders')
    .select()
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list render jobs: ${error.message}`);
  return (data ?? []) as RenderJobRow[];
}

export async function cancelRenderJob(renderJobId: string): Promise<void> {
  const { error } = await db
    .from('video_renders')
    .update({ status: 'cancelled' })
    .eq('id', renderJobId);

  if (error) throw new Error(`Failed to cancel render job: ${error.message}`);
}

/**
 * Subscribe to render job status changes via Supabase Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToRenderJob(
  renderJobId: string,
  onUpdate: (job: RenderJobRow) => void,
): () => void {
  const channel = supabase
    .channel(`render-job-${renderJobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_renders',
        filter: `id=eq.${renderJobId}`,
      },
      (payload) => {
        onUpdate(payload.new as RenderJobRow);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
