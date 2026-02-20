/**
 * Version Manager
 *
 * Snapshot save/restore for widget development.
 * Snapshots are scoped to a widget, not a Lab session.
 * Persistence goes through Supabase (widget_snapshots table).
 *
 * @module lab/versions
 * @layer L2
 */

import type { WidgetManifest } from '@sn/types';

import { supabase } from '../../kernel/supabase/client';

export interface VersionSnapshot {
  id: string;
  widgetId: string;
  label: string;
  html: string;
  manifest: WidgetManifest;
  createdAt: string;
}

export interface VersionManager {
  save(label: string, html: string, manifest: WidgetManifest): Promise<VersionSnapshot>;
  list(): Promise<VersionSnapshot[]>;
  restore(snapshotId: string): Promise<VersionSnapshot | null>;
  delete(snapshotId: string): Promise<boolean>;
  destroy(): void;
}

function mapRow(row: Record<string, unknown>): VersionSnapshot {
  return {
    id: row.id as string,
    widgetId: row.widget_id as string,
    label: row.label as string,
    html: row.html_content as string,
    manifest: row.manifest as WidgetManifest,
    createdAt: row.created_at as string,
  };
}

/**
 * Creates a version manager for a specific widget.
 *
 * @param widgetId - The widget ID to scope snapshots to
 * @param userId - Optional user ID for the created_by field
 */
export function createVersionManager(widgetId: string, userId?: string): VersionManager {
  return {
    async save(label: string, html: string, manifest: WidgetManifest): Promise<VersionSnapshot> {
      const id = crypto.randomUUID();
      const { data, error } = await supabase.from('widget_snapshots').insert({
        id,
        widget_id: widgetId,
        label,
        html_content: html,
        manifest: manifest as unknown as Record<string, unknown>,
        created_by: userId ?? '',
      }).select().single();

      if (error) throw new Error(`Failed to save snapshot: ${error.message}`);
      return mapRow(data as Record<string, unknown>);
    },

    async list(): Promise<VersionSnapshot[]> {
      const { data, error } = await supabase.from('widget_snapshots')
        .select('*')
        .eq('widget_id', widgetId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(`Failed to list snapshots: ${error.message}`);
      return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    },

    async restore(snapshotId: string): Promise<VersionSnapshot | null> {
      const { data, error } = await supabase.from('widget_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();
      if (error || !data) return null;
      return mapRow(data as Record<string, unknown>);
    },

    async delete(snapshotId: string): Promise<boolean> {
      const { error } = await supabase.from('widget_snapshots')
        .delete()
        .eq('id', snapshotId);
      return !error;
    },

    destroy() {
      // No-op — snapshots persist in DB
    },
  };
}
