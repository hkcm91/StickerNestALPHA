/**
 * Design Spec Editor
 *
 * CRUD operations and validation for WidgetDesignSpec.
 *
 * @module lab/design-spec
 * @layer L2
 */

import {
  WidgetDesignSpecSchema,
  type WidgetDesignSpec,
} from '@sn/types';

export interface DesignSpecEditor {
  get(): WidgetDesignSpec | null;
  set(spec: WidgetDesignSpec): void;
  update(patch: Partial<WidgetDesignSpec>): void;
  validate(): { valid: boolean; errors: string[] };
  clear(): void;
  isDirty(): boolean;
  markSaved(): void;
  onChange(cb: (spec: WidgetDesignSpec | null) => void): () => void;
}

/**
 * Creates a design spec editor with change tracking.
 */
export function createDesignSpecEditor(initial?: WidgetDesignSpec): DesignSpecEditor {
  let spec: WidgetDesignSpec | null = initial ?? null;
  let savedSnapshot: string | null = initial ? JSON.stringify(initial) : null;
  const subscribers = new Set<(spec: WidgetDesignSpec | null) => void>();

  function notify(): void {
    for (const cb of subscribers) {
      cb(spec);
    }
  }

  return {
    get() {
      return spec;
    },

    set(newSpec: WidgetDesignSpec) {
      spec = newSpec;
      notify();
    },

    update(patch: Partial<WidgetDesignSpec>) {
      spec = spec ? { ...spec, ...patch } : { version: 1 as const, ...patch };
      notify();
    },

    validate(): { valid: boolean; errors: string[] } {
      if (!spec) return { valid: true, errors: [] };
      const result = WidgetDesignSpecSchema.safeParse(spec);
      if (result.success) return { valid: true, errors: [] };
      return {
        valid: false,
        errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      };
    },

    clear() {
      spec = null;
      notify();
    },

    isDirty() {
      const current = spec ? JSON.stringify(spec) : null;
      return current !== savedSnapshot;
    },

    markSaved() {
      savedSnapshot = spec ? JSON.stringify(spec) : null;
    },

    onChange(cb: (spec: WidgetDesignSpec | null) => void): () => void {
      subscribers.add(cb);
      return () => { subscribers.delete(cb); };
    },
  };
}
