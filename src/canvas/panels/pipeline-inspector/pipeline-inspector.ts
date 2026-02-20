/**
 * Pipeline Inspector Controller — selected pipeline node details
 *
 * @module canvas/panels/pipeline-inspector
 * @layer L4A-4
 */

import type { PipelineNode, PipelineEdge } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface PipelineInspectorState {
  selectedNodeId: string | null;
  selectedNode: PipelineNode | null;
  connectedEdges: PipelineEdge[];
}

export interface PipelineInspectorController {
  inspect(nodeId: string | null, nodes: PipelineNode[], edges: PipelineEdge[]): PipelineInspectorState;
  updateNodeConfig(nodeId: string, key: string, value: unknown): void;
  removeNode(nodeId: string): void;
  removeEdge(edgeId: string): void;
  isActiveInMode(): boolean;
}

export function createPipelineInspectorController(): PipelineInspectorController {
  return {
    inspect(nodeId: string | null, nodes: PipelineNode[], edges: PipelineEdge[]): PipelineInspectorState {
      if (!nodeId) {
        return { selectedNodeId: null, selectedNode: null, connectedEdges: [] };
      }
      const node = nodes.find((n) => n.id === nodeId) ?? null;
      const connected = edges.filter(
        (e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId,
      );
      return { selectedNodeId: nodeId, selectedNode: node, connectedEdges: connected };
    },

    updateNodeConfig(nodeId: string, key: string, value: unknown) {
      bus.emit(CanvasEvents.ENTITY_CONFIG_UPDATED, { id: nodeId, key, value });
    },

    removeNode(nodeId: string) {
      bus.emit(CanvasEvents.PIPELINE_NODE_REMOVED, { nodeId });
    },

    removeEdge(edgeId: string) {
      bus.emit(CanvasEvents.PIPELINE_EDGE_DELETED, { edgeId });
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
