/**
 * Scene Compiler — Converts scene graph → Pipeline (kernel schema).
 *
 * Maps scene nodes (widget, sticker, docker, etc.) and scene edges
 * into PipelineNode/PipelineEdge structures that the Canvas Wiring
 * execution engine (L4A-3) can run.
 *
 * @module lab/graph
 * @layer L2
 */

import type {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  PipelinePort,
  PipelineNodeType,
} from '@sn/types';

import type { SceneNode, SceneEdge } from './scene-types';

// ═══════════════════════════════════════════════════════════════════
// Result
// ═══════════════════════════════════════════════════════════════════

export interface SceneCompileResult {
  pipeline: Pipeline | null;
  errors: string[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════
// Cycle Detection (scene-level)
// ═══════════════════════════════════════════════════════════════════

export function detectSceneCycles(
  nodes: SceneNode[],
  edges: SceneEdge[],
): string[] {
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cyclePath: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adj.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cyclePath.unshift(nodeId);
          return true;
        }
      } else if (inStack.has(neighbor)) {
        cyclePath.unshift(neighbor);
        cyclePath.unshift(nodeId);
        return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return cyclePath;
    }
  }

  return [];
}

// ═══════════════════════════════════════════════════════════════════
// Compiler
// ═══════════════════════════════════════════════════════════════════

/**
 * Compile a scene graph into a Pipeline for the Canvas Wiring engine.
 *
 * Scene nodes map to pipeline nodes:
 * - widget/docker → PipelineNode type 'widget' (with widgetInstanceId)
 * - sticker → PipelineNode type 'tap' (side-effect emitter, no transform)
 * - group → skipped (groups don't participate in event routing)
 * - scene-input/scene-output → PipelineNode type 'tap' (external I/O boundary)
 *
 * Scene edges map directly to PipelineEdge.
 */
export function compileScene(
  nodes: SceneNode[],
  edges: SceneEdge[],
  canvasId: string = 'draft',
): SceneCompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate: at least one node
  if (nodes.length === 0) {
    errors.push('Scene graph is empty — add at least one entity.');
    return { pipeline: null, errors, warnings };
  }

  // Cycle detection
  const cycle = detectSceneCycles(nodes, edges);
  if (cycle.length > 0) {
    const labels = cycle.map((id) => {
      const n = nodes.find((n) => n.id === id);
      return n?.label ?? id;
    });
    errors.push(`Cycle detected: ${labels.join(' → ')}`);
    return { pipeline: null, errors, warnings };
  }

  // Build node lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Validate edges reference valid nodes and ports
  for (const edge of edges) {
    const srcNode = nodeMap.get(edge.sourceNodeId);
    const tgtNode = nodeMap.get(edge.targetNodeId);

    if (!srcNode) {
      errors.push(`Edge ${edge.id}: source node '${edge.sourceNodeId}' not found`);
      continue;
    }
    if (!tgtNode) {
      errors.push(`Edge ${edge.id}: target node '${edge.targetNodeId}' not found`);
      continue;
    }

    const srcPort = srcNode.outputPorts.find((p) => p.id === edge.sourcePortId);
    const tgtPort = tgtNode.inputPorts.find((p) => p.id === edge.targetPortId);

    if (!srcPort) {
      errors.push(`Edge ${edge.id}: source port '${edge.sourcePortId}' not found on node '${srcNode.label}'`);
    }
    if (!tgtPort) {
      errors.push(`Edge ${edge.id}: target port '${edge.targetPortId}' not found on node '${tgtNode.label}'`);
    }
  }

  if (errors.length > 0) {
    return { pipeline: null, errors, warnings };
  }

  // Convert scene nodes → pipeline nodes
  const pipelineNodes: PipelineNode[] = [];

  for (const sn of nodes) {
    // Groups don't participate in event routing
    if (sn.type === 'group') {
      warnings.push(`Group '${sn.label}' skipped — groups don't participate in pipelines`);
      continue;
    }

    const pipelineType = sceneTypeToPipelineType(sn.type);

    const inputPorts: PipelinePort[] = sn.inputPorts.map((p) => ({
      id: p.id,
      name: p.name,
      direction: 'input' as const,
      schema: p.schema,
    }));

    const outputPorts: PipelinePort[] = sn.outputPorts.map((p) => ({
      id: p.id,
      name: p.name,
      direction: 'output' as const,
      schema: p.schema,
    }));

    pipelineNodes.push({
      id: sn.id,
      type: pipelineType,
      widgetInstanceId: sn.type === 'widget' || sn.type === 'docker'
        ? sn.widgetId ?? sn.id
        : undefined,
      position: { x: 0, y: 0 }, // Layout handled by graph editor
      config: sn.config,
      inputPorts,
      outputPorts,
    });
  }

  // Convert scene edges → pipeline edges (skip edges touching groups)
  const groupIds = new Set(nodes.filter((n) => n.type === 'group').map((n) => n.id));
  const pipelineEdges: PipelineEdge[] = edges
    .filter((e) => !groupIds.has(e.sourceNodeId) && !groupIds.has(e.targetNodeId))
    .map((se) => ({
      id: se.id,
      sourceNodeId: se.sourceNodeId,
      sourcePortId: se.sourcePortId,
      targetNodeId: se.targetNodeId,
      targetPortId: se.targetPortId,
    }));

  // Warn about orphaned nodes (no connections)
  const connectedIds = new Set<string>();
  for (const e of pipelineEdges) {
    connectedIds.add(e.sourceNodeId);
    connectedIds.add(e.targetNodeId);
  }
  for (const n of pipelineNodes) {
    if (!connectedIds.has(n.id)) {
      const label = nodes.find((sn) => sn.id === n.id)?.label ?? n.id;
      warnings.push(`'${label}' has no connections — it won't receive or send events`);
    }
  }

  const now = new Date().toISOString();
  const pipeline: Pipeline = {
    id: `pipeline-${canvasId}-${Date.now()}`,
    canvasId,
    name: 'Scene Pipeline',
    nodes: pipelineNodes,
    edges: pipelineEdges,
    createdAt: now,
    updatedAt: now,
  };

  return { pipeline, errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function sceneTypeToPipelineType(
  sceneType: SceneNode['type'],
): PipelineNodeType {
  switch (sceneType) {
    case 'widget':
    case 'docker':
      return 'widget';
    case 'sticker':
    case 'scene-input':
    case 'scene-output':
      return 'tap';
    default:
      return 'tap';
  }
}
