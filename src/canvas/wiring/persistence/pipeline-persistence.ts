/**
 * Pipeline Persistence — save/load pipeline graphs via Supabase
 *
 * @module canvas/wiring/persistence
 * @layer L4A-3
 */

import type { Pipeline } from '@sn/types';

import { supabase } from '../../../kernel/supabase/client';

export interface PipelinePersistence {
  save(pipeline: Pipeline): Promise<void>;
  load(id: string): Promise<Pipeline | null>;
  loadForCanvas(canvasId: string): Promise<Pipeline[]>;
  remove(id: string): Promise<void>;
}

function mapRowToPipeline(row: Record<string, unknown>): Pipeline {
  return {
    id: row.id as string,
    canvasId: row.canvas_id as string,
    nodes: row.nodes as Pipeline['nodes'],
    edges: row.edges as Pipeline['edges'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createPipelinePersistence(): PipelinePersistence {
  return {
    async save(pipeline: Pipeline) {
      const { error } = await supabase.from('pipelines').upsert({
        id: pipeline.id,
        canvas_id: pipeline.canvasId,
        nodes: pipeline.nodes as unknown as Record<string, unknown>[],
        edges: pipeline.edges as unknown as Record<string, unknown>[],
        created_at: pipeline.createdAt,
        updated_at: pipeline.updatedAt,
      });
      if (error) throw new Error(`Failed to save pipeline: ${error.message}`);
    },

    async load(id: string) {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return mapRowToPipeline(data as Record<string, unknown>);
    },

    async loadForCanvas(canvasId: string) {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('canvas_id', canvasId);
      if (error) throw new Error(`Failed to load pipelines: ${error.message}`);
      return (data ?? []).map((row) => mapRowToPipeline(row as Record<string, unknown>));
    },

    async remove(id: string) {
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', id);
      if (error) throw new Error(`Failed to remove pipeline: ${error.message}`);
    },
  };
}
