/**
 * Connection Suggester — computes pipeline connection suggestions
 * when a widget is placed on the canvas.
 *
 * Uses the semantic port matcher from L0 for local-only, sub-10ms computation.
 * No AI calls — suitable for real-time drag/drop interactions.
 *
 * @module canvas/wiring/suggestions
 * @layer L4A-3
 */

import type { PipelineNode, PipelineEdge } from '@sn/types';

import {
  matchPorts,
  type PortLike,
  type MatchType,
} from '../../../kernel/pipeline/port-matcher';

// ─── Types ───────────────────────────────────────────────────────────

export interface ConnectionSuggestion {
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  score: number;
  matchType: MatchType;
  /** True if ports need a transform bridge (score < 0.9) */
  needsBridge: boolean;
}

// ─── Core ────────────────────────────────────────────────────────────

/**
 * Computes connection suggestions for a newly placed node against
 * all existing nodes in the pipeline graph.
 *
 * Performance target: < 10ms for 100 nodes.
 *
 * @param newNode - The newly placed pipeline node
 * @param existingNodes - All other nodes currently in the graph
 * @param existingEdges - Current edges (used to filter already-connected ports)
 * @param minScore - Minimum match score to include (default 0.3)
 * @returns Suggestions sorted by score descending
 */
export function computeSuggestions(
  newNode: PipelineNode,
  existingNodes: PipelineNode[],
  existingEdges: PipelineEdge[],
  minScore = 0.3,
): ConnectionSuggestion[] {
  const suggestions: ConnectionSuggestion[] = [];

  // Build a set of already-connected input ports for quick lookup
  const connectedInputs = new Set<string>();
  for (const edge of existingEdges) {
    connectedInputs.add(`${edge.targetNodeId}:${edge.targetPortId}`);
  }

  for (const existing of existingNodes) {
    if (existing.id === newNode.id) continue;

    // New node outputs → existing node inputs
    for (const outPort of newNode.outputPorts) {
      for (const inPort of existing.inputPorts) {
        // Skip already-connected input ports
        if (connectedInputs.has(`${existing.id}:${inPort.id}`)) continue;

        const portLikeOut: PortLike = {
          id: outPort.id,
          name: outPort.name,
          direction: 'output',
          eventType: outPort.name,
          schema: outPort.schema,
        };
        const portLikeIn: PortLike = {
          id: inPort.id,
          name: inPort.name,
          direction: 'input',
          eventType: inPort.name,
          schema: inPort.schema,
        };

        const result = matchPorts(portLikeOut, portLikeIn);
        if (result.score >= minScore) {
          suggestions.push({
            sourceNodeId: newNode.id,
            sourcePortId: outPort.id,
            targetNodeId: existing.id,
            targetPortId: inPort.id,
            score: result.score,
            matchType: result.matchType,
            needsBridge: result.score < 0.9,
          });
        }
      }
    }

    // Existing node outputs → new node inputs
    for (const outPort of existing.outputPorts) {
      for (const inPort of newNode.inputPorts) {
        // Skip already-connected input ports
        if (connectedInputs.has(`${newNode.id}:${inPort.id}`)) continue;

        const portLikeOut: PortLike = {
          id: outPort.id,
          name: outPort.name,
          direction: 'output',
          eventType: outPort.name,
          schema: outPort.schema,
        };
        const portLikeIn: PortLike = {
          id: inPort.id,
          name: inPort.name,
          direction: 'input',
          eventType: inPort.name,
          schema: inPort.schema,
        };

        const result = matchPorts(portLikeOut, portLikeIn);
        if (result.score >= minScore) {
          suggestions.push({
            sourceNodeId: existing.id,
            sourcePortId: outPort.id,
            targetNodeId: newNode.id,
            targetPortId: inPort.id,
            score: result.score,
            matchType: result.matchType,
            needsBridge: result.score < 0.9,
          });
        }
      }
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}
