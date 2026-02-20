/**
 * Pipeline Persistence — save/load pipeline graphs
 *
 * @module canvas/wiring/persistence
 * @layer L4A-3
 */

import type { Pipeline } from '@sn/types';

export interface PipelinePersistence {
  save(pipeline: Pipeline): Promise<void>;
  load(id: string): Promise<Pipeline | null>;
  loadForCanvas(canvasId: string): Promise<Pipeline[]>;
  remove(id: string): Promise<void>;
}

export function createPipelinePersistence(): PipelinePersistence {
  const store = new Map<string, Pipeline>();

  return {
    async save(pipeline: Pipeline) {
      store.set(pipeline.id, { ...pipeline });
    },

    async load(id: string) {
      const p = store.get(id);
      return p ? { ...p } : null;
    },

    async loadForCanvas(canvasId: string) {
      return Array.from(store.values()).filter((p) => p.canvasId === canvasId);
    },

    async remove(id: string) {
      store.delete(id);
    },
  };
}
