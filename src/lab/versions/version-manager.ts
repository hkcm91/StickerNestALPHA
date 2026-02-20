/**
 * Version Manager
 *
 * Snapshot save/restore for widget development.
 * Snapshots are scoped to a widget, not a Lab session.
 * Persistence goes through the kernel API (stubbed for now).
 *
 * @module lab/versions
 * @layer L2
 */

import type { WidgetManifest } from '@sn/types';

export interface VersionSnapshot {
  id: string;
  widgetId: string;
  label: string;
  html: string;
  manifest: WidgetManifest;
  createdAt: string;
}

export interface VersionManager {
  save(label: string, html: string, manifest: WidgetManifest): VersionSnapshot;
  list(): VersionSnapshot[];
  restore(snapshotId: string): VersionSnapshot | null;
  delete(snapshotId: string): boolean;
  destroy(): void;
}

let snapshotCounter = 0;

/**
 * Creates a version manager for a specific widget.
 *
 * @param widgetId - The widget ID to scope snapshots to
 */
export function createVersionManager(widgetId: string): VersionManager {
  let snapshots: VersionSnapshot[] = [];

  return {
    save(label: string, html: string, manifest: WidgetManifest): VersionSnapshot {
      const snapshot: VersionSnapshot = {
        id: `snap-${++snapshotCounter}`,
        widgetId,
        label,
        html,
        manifest,
        createdAt: new Date().toISOString(),
      };
      snapshots.push(snapshot);
      return snapshot;
    },

    list(): VersionSnapshot[] {
      return [...snapshots];
    },

    restore(snapshotId: string): VersionSnapshot | null {
      return snapshots.find((s) => s.id === snapshotId) ?? null;
    },

    delete(snapshotId: string): boolean {
      const before = snapshots.length;
      snapshots = snapshots.filter((s) => s.id !== snapshotId);
      return snapshots.length < before;
    },

    destroy() {
      snapshots = [];
    },
  };
}
