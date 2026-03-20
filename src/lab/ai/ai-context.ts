/**
 * AI Context Engine — Serializes graph state for AI-aware prompting.
 *
 * Builds a structured context object from the current graph state
 * (scene or widget level) that is injected into AI generation prompts.
 * This gives the AI full awareness of existing nodes, connections,
 * orphaned ports, and the current hierarchy position.
 *
 * @module lab/ai
 * @layer L2
 */

import type { GraphNode, GraphEdge, NodeType } from '../graph/graph-compiler';
import type {
  SceneNode,
  SceneEdge,
  GraphLevel,
  BreadcrumbSegment,
} from '../graph/scene-types';

// ═══════════════════════════════════════════════════════════════════
// Context Interface
// ═══════════════════════════════════════════════════════════════════

export interface AIGraphContext {
  /** Current graph depth */
  level: GraphLevel;
  /** Navigation breadcrumb trail */
  breadcrumbs: string[];
  /** Scene-level summary (always present) */
  scene: SceneSummary;
  /** Widget-level summary (only when inside a widget) */
  widget: WidgetSummary | null;
  /** Orphaned ports that have no connections */
  orphanedPorts: OrphanedPort[];
  /** Suggested connections the AI might propose */
  connectionHints: string[];
}

export interface SceneSummary {
  nodeCount: number;
  edgeCount: number;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    inputPorts: string[];
    outputPorts: string[];
    connected: boolean;
  }>;
  edges: Array<{
    from: string;
    to: string;
    fromPort: string;
    toPort: string;
  }>;
}

export interface WidgetSummary {
  parentNodeLabel: string;
  nodeCount: number;
  edgeCount: number;
  nodes: Array<{
    id: string;
    type: NodeType;
    config: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
  }>;
}

export interface OrphanedPort {
  nodeId: string;
  nodeLabel: string;
  portId: string;
  portName: string;
  direction: 'input' | 'output';
}

// ═══════════════════════════════════════════════════════════════════
// Builder
// ═══════════════════════════════════════════════════════════════════

export interface AIContextBuilderInput {
  level: GraphLevel;
  breadcrumbs: BreadcrumbSegment[];
  sceneNodes: SceneNode[];
  sceneEdges: SceneEdge[];
  widgetNodes?: GraphNode[];
  widgetEdges?: GraphEdge[];
  currentWidgetNodeId?: string | null;
}

/**
 * Builds the AIGraphContext from the current graph state.
 */
export function buildAIGraphContext(input: AIContextBuilderInput): AIGraphContext {
  const {
    level,
    breadcrumbs,
    sceneNodes,
    sceneEdges,
    widgetNodes = [],
    widgetEdges = [],
    currentWidgetNodeId,
  } = input;

  // Build connected-port lookup for scene
  const sceneConnectedPorts = new Set<string>();
  for (const edge of sceneEdges) {
    sceneConnectedPorts.add(`${edge.sourceNodeId}:${edge.sourcePortId}`);
    sceneConnectedPorts.add(`${edge.targetNodeId}:${edge.targetPortId}`);
  }

  // Scene summary
  const connectedNodeIds = new Set<string>();
  for (const edge of sceneEdges) {
    connectedNodeIds.add(edge.sourceNodeId);
    connectedNodeIds.add(edge.targetNodeId);
  }

  const scene: SceneSummary = {
    nodeCount: sceneNodes.length,
    edgeCount: sceneEdges.length,
    nodes: sceneNodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      inputPorts: n.inputPorts.map((p) => p.name),
      outputPorts: n.outputPorts.map((p) => p.name),
      connected: connectedNodeIds.has(n.id),
    })),
    edges: sceneEdges.map((e) => {
      const srcNode = sceneNodes.find((n) => n.id === e.sourceNodeId);
      const tgtNode = sceneNodes.find((n) => n.id === e.targetNodeId);
      return {
        from: srcNode?.label ?? e.sourceNodeId,
        to: tgtNode?.label ?? e.targetNodeId,
        fromPort: e.sourcePortId,
        toPort: e.targetPortId,
      };
    }),
  };

  // Widget summary (only when inside a widget)
  let widget: WidgetSummary | null = null;
  if (level === 'widget' && currentWidgetNodeId) {
    const parentNode = sceneNodes.find((n) => n.id === currentWidgetNodeId);

    widget = {
      parentNodeLabel: parentNode?.label ?? 'Widget',
      nodeCount: widgetNodes.length,
      edgeCount: widgetEdges.length,
      nodes: widgetNodes.map((n) => ({
        id: n.id,
        type: n.type,
        config: n.config,
      })),
      edges: widgetEdges.map((e) => ({
        from: e.sourceNodeId,
        to: e.targetNodeId,
      })),
    };
  }

  // Find orphaned ports (scene level)
  const orphanedPorts: OrphanedPort[] = [];
  for (const node of sceneNodes) {
    for (const port of [...node.inputPorts, ...node.outputPorts]) {
      const key = `${node.id}:${port.id}`;
      if (!sceneConnectedPorts.has(key)) {
        orphanedPorts.push({
          nodeId: node.id,
          nodeLabel: node.label,
          portId: port.id,
          portName: port.name,
          direction: port.direction,
        });
      }
    }
  }

  // Generate connection hints from orphaned ports
  const connectionHints = generateConnectionHints(sceneNodes, orphanedPorts);

  return {
    level,
    breadcrumbs: breadcrumbs.map((b) => b.label),
    scene,
    widget,
    orphanedPorts,
    connectionHints,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Connection Hint Generator
// ═══════════════════════════════════════════════════════════════════

function generateConnectionHints(
  nodes: SceneNode[],
  orphanedPorts: OrphanedPort[],
): string[] {
  const hints: string[] = [];
  const outputOrphans = orphanedPorts.filter((p) => p.direction === 'output');
  const inputOrphans = orphanedPorts.filter((p) => p.direction === 'input');

  // Suggest connecting orphaned outputs to orphaned inputs with matching event types
  for (const out of outputOrphans) {
    const outNode = nodes.find((n) => n.id === out.nodeId);
    const outPort = outNode?.outputPorts.find((p) => p.id === out.portId);

    for (const inp of inputOrphans) {
      if (inp.nodeId === out.nodeId) continue; // Skip self-connections

      const inpNode = nodes.find((n) => n.id === inp.nodeId);
      const inpPort = inpNode?.inputPorts.find((p) => p.id === inp.portId);

      // Check type compatibility
      if (outPort && inpPort) {
        const eventMatch =
          !outPort.eventType || !inpPort.eventType ||
          inpPort.eventType === '*' ||
          outPort.eventType === inpPort.eventType;

        if (eventMatch) {
          hints.push(
            `Connect ${out.nodeLabel}.${out.portName} → ${inp.nodeLabel}.${inp.portName}`,
          );
        }
      }
    }
  }

  // Cap hints to avoid overwhelming the AI
  return hints.slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════
// Prompt Serializer
// ═══════════════════════════════════════════════════════════════════

/**
 * Serializes AIGraphContext into a text block suitable for injection
 * into an AI prompt as system/context content.
 */
export function serializeContextForPrompt(ctx: AIGraphContext): string {
  const lines: string[] = [];

  lines.push('=== GRAPH CONTEXT ===');
  lines.push(`Level: ${ctx.level}`);
  lines.push(`Path: ${ctx.breadcrumbs.join(' > ')}`);
  lines.push('');

  // Scene summary
  lines.push(`Scene: ${ctx.scene.nodeCount} nodes, ${ctx.scene.edgeCount} connections`);
  for (const node of ctx.scene.nodes) {
    const status = node.connected ? '' : ' (disconnected)';
    const ports = [
      ...node.inputPorts.map((p) => `in:${p}`),
      ...node.outputPorts.map((p) => `out:${p}`),
    ].join(', ');
    lines.push(`  [${node.type}] ${node.label}${status} — ports: ${ports || 'none'}`);
  }

  if (ctx.scene.edges.length > 0) {
    lines.push('');
    lines.push('Connections:');
    for (const edge of ctx.scene.edges) {
      lines.push(`  ${edge.from}.${edge.fromPort} → ${edge.to}.${edge.toPort}`);
    }
  }

  // Widget internals
  if (ctx.widget) {
    lines.push('');
    lines.push(`Widget Internals (${ctx.widget.parentNodeLabel}): ${ctx.widget.nodeCount} nodes, ${ctx.widget.edgeCount} edges`);
    for (const node of ctx.widget.nodes) {
      const configStr = Object.entries(node.config)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(', ');
      lines.push(`  [${node.type}] ${node.id}${configStr ? ` (${configStr})` : ''}`);
    }
  }

  // Orphaned ports
  if (ctx.orphanedPorts.length > 0) {
    lines.push('');
    lines.push('Disconnected ports:');
    for (const port of ctx.orphanedPorts) {
      lines.push(`  ${port.nodeLabel}.${port.portName} (${port.direction})`);
    }
  }

  // Connection hints
  if (ctx.connectionHints.length > 0) {
    lines.push('');
    lines.push('Suggested connections:');
    for (const hint of ctx.connectionHints) {
      lines.push(`  ${hint}`);
    }
  }

  lines.push('=== END CONTEXT ===');
  return lines.join('\n');
}
