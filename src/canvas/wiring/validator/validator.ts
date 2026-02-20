/**
 * Pipeline Validator — cycle detection, type checking, graph validation
 *
 * @module canvas/wiring/validator
 * @layer L4A-3
 */

import type { PipelineNode, PipelineEdge, PipelinePort } from '@sn/types';

export interface ValidationError {
  type: 'cycle' | 'type_mismatch' | 'missing_port' | 'duplicate_input';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function detectCycle(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): { hasCycle: boolean; path?: string[] } {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = adjacency.get(edge.sourceNodeId);
    if (targets) targets.push(edge.targetNodeId);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  for (const node of nodes) {
    color.set(node.id, WHITE);
    parent.set(node.id, null);
  }

  // Iterative DFS
  for (const startNode of nodes) {
    if (color.get(startNode.id) !== WHITE) continue;

    const stack: { nodeId: string; neighborIdx: number }[] = [
      { nodeId: startNode.id, neighborIdx: 0 },
    ];
    color.set(startNode.id, GRAY);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbors = adjacency.get(frame.nodeId) ?? [];

      if (frame.neighborIdx >= neighbors.length) {
        color.set(frame.nodeId, BLACK);
        stack.pop();
        continue;
      }

      const neighbor = neighbors[frame.neighborIdx];
      frame.neighborIdx++;

      if (color.get(neighbor) === GRAY) {
        // Cycle found — reconstruct path
        const path = [neighbor];
        for (let i = stack.length - 1; i >= 0; i--) {
          path.unshift(stack[i].nodeId);
          if (stack[i].nodeId === neighbor) break;
        }
        return { hasCycle: true, path };
      }

      if (color.get(neighbor) === WHITE) {
        color.set(neighbor, GRAY);
        parent.set(neighbor, frame.nodeId);
        stack.push({ nodeId: neighbor, neighborIdx: 0 });
      }
    }
  }

  return { hasCycle: false };
}

export function arePortsCompatible(source: PipelinePort, target: PipelinePort): boolean {
  if (source.direction !== 'output' || target.direction !== 'input') return false;
  if (!source.schema || !target.schema) return true;
  const sourceKeys = Object.keys(source.schema);
  const targetKeys = Object.keys(target.schema);
  return sourceKeys.every((key) => targetKeys.includes(key));
}

export function validatePipeline(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Check port references
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.sourceNodeId);
    const targetNode = nodeMap.get(edge.targetNodeId);

    if (!sourceNode) {
      errors.push({ type: 'missing_port', message: `Source node ${edge.sourceNodeId} not found`, edgeId: edge.id });
      continue;
    }
    if (!targetNode) {
      errors.push({ type: 'missing_port', message: `Target node ${edge.targetNodeId} not found`, edgeId: edge.id });
      continue;
    }

    const sourcePort = sourceNode.outputPorts.find((p) => p.id === edge.sourcePortId);
    if (!sourcePort) {
      errors.push({ type: 'missing_port', message: `Source port ${edge.sourcePortId} not found on node ${edge.sourceNodeId}`, edgeId: edge.id });
    }

    const targetPort = targetNode.inputPorts.find((p) => p.id === edge.targetPortId);
    if (!targetPort) {
      errors.push({ type: 'missing_port', message: `Target port ${edge.targetPortId} not found on node ${edge.targetNodeId}`, edgeId: edge.id });
    }

    if (sourcePort && targetPort && !arePortsCompatible(sourcePort, targetPort)) {
      errors.push({ type: 'type_mismatch', message: `Ports ${sourcePort.id} and ${targetPort.id} are not compatible`, edgeId: edge.id });
    }
  }

  // Check duplicate input connections
  const inputConnections = new Map<string, string>();
  for (const edge of edges) {
    const key = `${edge.targetNodeId}:${edge.targetPortId}`;
    if (inputConnections.has(key)) {
      errors.push({ type: 'duplicate_input', message: `Input port ${edge.targetPortId} on node ${edge.targetNodeId} has multiple connections`, edgeId: edge.id });
    }
    inputConnections.set(key, edge.id);
  }

  // Check for cycles
  const cycleResult = detectCycle(nodes, edges);
  if (cycleResult.hasCycle) {
    errors.push({ type: 'cycle', message: `Cycle detected: ${cycleResult.path?.join(' → ')}` });
  }

  return { valid: errors.length === 0, errors };
}
