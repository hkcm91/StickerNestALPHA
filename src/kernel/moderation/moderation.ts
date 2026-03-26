/**
 * Content Moderation API — submit, view, and review content reports.
 *
 * @module kernel/moderation
 * @layer L0
 */

import { supabase } from '../supabase';

export type ContentType = 'widget' | 'sticker' | 'canvas' | 'profile' | 'comment' | 'post';
export type ReportReason = 'spam' | 'harassment' | 'nsfw' | 'copyright' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

export interface ContentReport {
  id: string;
  reporterId: string;
  contentType: ContentType;
  contentId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const table = () => supabase.from('content_reports' as any) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Submit a content report.
 */
export async function submitReport(params: {
  reporterId: string;
  contentType: ContentType;
  contentId: string;
  reason: ReportReason;
  details?: string;
}): Promise<ContentReport> {
  const { data, error } = await table()
    .insert({
      reporter_id: params.reporterId,
      content_type: params.contentType,
      content_id: params.contentId,
      reason: params.reason,
      details: params.details ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to submit report');
  }

  return mapRow(data);
}

/**
 * Get reports submitted by the current user.
 */
export async function getMyReports(userId: string): Promise<ContentReport[]> {
  const { data, error } = await table()
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

/**
 * Get the pending report queue (admin only).
 */
export async function getReportQueue(options: {
  status?: ReportStatus;
  limit?: number;
} = {}): Promise<ContentReport[]> {
  let query = table()
    .select('*')
    .order('created_at', { ascending: true });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

/**
 * Review a report (admin action).
 */
export async function reviewReport(
  reportId: string,
  action: 'reviewed' | 'action_taken' | 'dismissed',
  reviewerId: string,
): Promise<ContentReport> {
  const { data, error } = await table()
    .update({
      status: action,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to review report');
  }

  return mapRow(data);
}

function mapRow(row: Record<string, unknown>): ContentReport {
  return {
    id: row.id as string,
    reporterId: row.reporter_id as string,
    contentType: row.content_type as ContentType,
    contentId: row.content_id as string,
    reason: row.reason as ReportReason,
    details: (row.details as string) ?? null,
    status: row.status as ReportStatus,
    reviewedBy: (row.reviewed_by as string) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
