/**
 * Manifest Editor
 *
 * CRUD + validation for widget manifests.
 * Uses WidgetManifestSchema from @sn/types — no local schema definitions.
 * Detects breaking changes in event contracts.
 *
 * @module lab/manifest
 * @layer L2
 */

import { WidgetManifestSchema } from '@sn/types';
import type { WidgetManifest, EventPort } from '@sn/types';

export interface BreakingChange {
  type: 'removed_emit' | 'removed_subscribe';
  portName: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  manifest?: WidgetManifest;
}

export interface ManifestEditor {
  getManifest(): WidgetManifest | null;
  setManifest(manifest: WidgetManifest): void;
  updateField(path: string, value: unknown): void;
  validate(): ManifestValidationResult;
  getBreakingChanges(prev: WidgetManifest, next: WidgetManifest): BreakingChange[];
  toJsonSchema(): Record<string, unknown>;
}

/**
 * Creates a manifest editor.
 *
 * @param initial - Optional initial manifest to start with
 */
export function createManifestEditor(initial?: Partial<WidgetManifest>): ManifestEditor {
  let current: Record<string, unknown> = initial ? { ...initial } : {};

  return {
    getManifest() {
      const result = WidgetManifestSchema.safeParse(current);
      if (result.success) {
        return result.data;
      }
      return null;
    },

    setManifest(manifest: WidgetManifest) {
      current = { ...manifest };
    },

    updateField(path: string, value: unknown) {
      const keys = path.split('.');
      let target: Record<string, unknown> = current;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (typeof target[key] !== 'object' || target[key] === null) {
          target[key] = {};
        }
        target = target[key] as Record<string, unknown>;
      }
      target[keys[keys.length - 1]] = value;
    },

    validate(): ManifestValidationResult {
      const result = WidgetManifestSchema.safeParse(current);
      if (result.success) {
        return { valid: true, errors: [], manifest: result.data };
      }
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      return { valid: false, errors };
    },

    getBreakingChanges(prev: WidgetManifest, next: WidgetManifest): BreakingChange[] {
      const changes: BreakingChange[] = [];

      const prevEmitNames = new Set(
        (prev.events?.emits ?? []).map((p: EventPort) => p.name),
      );
      const nextEmitNames = new Set(
        (next.events?.emits ?? []).map((p: EventPort) => p.name),
      );

      for (const name of prevEmitNames) {
        if (!nextEmitNames.has(name)) {
          changes.push({ type: 'removed_emit', portName: name });
        }
      }

      const prevSubNames = new Set(
        (prev.events?.subscribes ?? []).map((p: EventPort) => p.name),
      );
      const nextSubNames = new Set(
        (next.events?.subscribes ?? []).map((p: EventPort) => p.name),
      );

      for (const name of prevSubNames) {
        if (!nextSubNames.has(name)) {
          changes.push({ type: 'removed_subscribe', portName: name });
        }
      }

      return changes;
    },

    toJsonSchema(): Record<string, unknown> {
      return WidgetManifestSchema.toJSONSchema() as Record<string, unknown>;
    },
  };
}
