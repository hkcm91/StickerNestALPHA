/**
 * Pipeline Graph — DAG data model for wiring widget events
 *
 * @module canvas/wiring/graph
 * @layer L4A-3
 */

import type { PipelineNode, PipelineEdge, Pipeline } from '@sn/types';

import { detectCycle, arePortsCompatible } from '../validator';

export interface PipelineGraphResult {
  success: boolean;
  error?: string;
}

export interface PipelineGraph {
  addNode(node: PipelineNode): void;
  removeNode(id: string): void;
  getNode(id: string): PipelineNode | undefined;
  getAllNodes(): PipelineNode[];
  addEdge(edge: PipelineEdge): PipelineGraphResult;
  removeEdge(id: string): void;
  getEdge(id: string): PipelineEdge | undefined;
  getAllEdges(): PipelineEdge[];
  getEdgesForNode(nodeId: string): PipelineEdge[];
  toSchema(id: string, canvasId: string): Pipeline;
}

export function createPipelineGraph(initial?: {
  nodes?: PipelineNode[];
  edges?: PipelineEdge[];
}): PipelineGraph {
  const nodes = new Map<string, PipelineNode>();
  const edges = new Map<string, PipelineEdge>();

  if (initial?.nodes) {
    for (const node of initial.nodes) {
      nodes.set(node.id, node);
    }
  }
  if (initial?.edges) {
    for (const edge of initial.edges) {
      edges.set(edge.id, edge);
    }
  }

  return {
    addNode(node: PipelineNode) {
      nodes.set(node.id, node);
    },

    removeNode(id: string) {
      nodes.delete(id);
      // Remove connected edges
      for (const [edgeId, edge] of edges) {
        if (edge.sourceNodeId === id || edge.targetNodeId === id) {
          edges.delete(edgeId);
        }
      }
    },

    getNode(id: string) {
      return nodes.get(id);
    },

    getAllNodes() {
      return Array.from(nodes.values());
    },

    addEdge(edge: PipelineEdge): PipelineGraphResult {
      // Validate source exists and has output port
      const sourceNode = nodes.get(edge.sourceNodeId);
      if (!sourceNode) return { success: false, error: `Source node ${edge.sourceNodeId} not found` };

      const sourcePort = sourceNode.outputPorts.find((p) => p.id === edge.sourcePortId);
      if (!sourcePort) return { success: false, error: `Source port ${edge.sourcePortId} not found` };

      // Validate target exists and has input port
      const targetNode = nodes.get(edge.targetNodeId);
      if (!targetNode) return { success: false, error: `Target node ${edge.targetNodeId} not found` };

      const targetPort = targetNode.inputPorts.find((p) => p.id === edge.targetPortId);
      if (!targetPort) return { success: false, error: `Target port ${edge.targetPortId} not found` };

      // Check type compatibility
      if (!arePortsCompatible(sourcePort, targetPort)) {
        return { success: false, error: 'Ports are not type-compatible' };
      }

      // Check duplicate input connection
      for (const existing of edges.values()) {
        if (existing.targetNodeId === edge.targetNodeId && existing.targetPortId === edge.targetPortId) {
          return { success: false, error: `Input port ${edge.targetPortId} already has a connection` };
        }
      }

      // Check for cycles (temporarily add edge)
      const tempEdges = [...edges.values(), edge];
      const cycleResult = detectCycle(Array.from(nodes.values()), tempEdges);
      if (cycleResult.hasCycle) {
        return { success: false, error: `Adding edge would create a cycle: ${cycleResult.path?.join(' → ')}` };
      }

      edges.set(edge.id, edge);
      return { success: true };
    },

    removeEdge(id: string) {
      edges.delete(id);
    },

    getEdge(id: string) {
      return edges.get(id);
    },

    getAllEdges() {
      return Array.from(edges.values());
    },

    getEdgesForNode(nodeId: string) {
      return Array.from(edges.values()).filter(
        (e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId,
      );
    },

    toSchema(id: string, canvasId: string): Pipeline {
      const now = new Date().toISOString();
      return {
        id,
        canvasId,
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
        createdAt: now,
        updatedAt: now,
      };
    },
  };
}
