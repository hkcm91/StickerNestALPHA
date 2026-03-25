/**
 * Natural Language Pipeline Builder — generates pipeline graphs from descriptions.
 *
 * Users describe pipelines in natural language (e.g., "When the counter changes,
 * filter values > 10, then update the chart") and the AI generates the full
 * pipeline graph (nodes + edges + transform configs).
 *
 * @module lab/ai
 * @layer L2
 */

import type { Pipeline, PipelineNode, PipelineEdge } from '@sn/types';

import type { AIGenerator } from './ai-generator';

// ─── Types ───────────────────────────────────────────────────────────

export interface WidgetSummary {
  id: string;
  name: string;
  emits: Array<{ name: string; schema?: Record<string, unknown> }>;
  subscribes: Array<{ name: string; schema?: Record<string, unknown> }>;
}

export interface PipelineBuildRequest {
  /** Natural language description of the desired pipeline */
  description: string;
  /** Widgets available on the canvas or installed */
  availableWidgets: WidgetSummary[];
  /** Current pipeline to extend (not replace) */
  existingPipeline?: Pipeline;
}

export interface PipelineBuildResult {
  pipeline: Pipeline;
  explanation: string;
  newNodesAdded: string[];
  newEdgesAdded: string[];
}

// ─── Prompt Construction ─────────────────────────────────────────────

function buildPipelinePrompt(request: PipelineBuildRequest): string {
  const widgetList = request.availableWidgets.map((w) => {
    const emits = w.emits.map((e) => `    emit: "${e.name}"${e.schema ? ` ${JSON.stringify(e.schema)}` : ''}`).join('\n');
    const subs = w.subscribes.map((s) => `    sub: "${s.name}"${s.schema ? ` ${JSON.stringify(s.schema)}` : ''}`).join('\n');
    return `  Widget "${w.name}" (id: ${w.id}):\n${emits}\n${subs}`;
  }).join('\n\n');

  const existingInfo = request.existingPipeline
    ? `\nExisting pipeline has ${request.existingPipeline.nodes.length} nodes and ${request.existingPipeline.edges.length} edges. Add to it, don't replace it.`
    : '';

  return `You are a pipeline architect for StickerNest, a visual widget platform.

Generate a pipeline graph (DAG) that implements the user's description.

Available widgets:
${widgetList}

Available transform node types:
- "filter": Drop events missing a field. Config: { "condition": "fieldName" }
- "map": Rename payload fields. Config: { "mapping": { "srcKey": "dstKey" } }
- "merge": Combine multiple inputs into one output. No config needed.
- "delay": Buffer event. Config: { "delayMs": number }
- "throttle": Rate-limit. Config: { "intervalMs": number }
- "debounce": Coalesce. Config: { "delayMs": number }
- "switch": Multi-output routing. Config: { "conditions": [{ "portId": "name", "expression": "field" }] }
- "accumulate": Batch events. Config: { "count": number, "mode": "count" }
- "ai-transform": LLM transform. Config: { "prompt": "instruction" }
${existingInfo}

User's description: "${request.description}"

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "nodes": [
    { "id": "unique-id", "type": "widget", "widgetInstanceId": "widget-id", "position": {"x": 0, "y": 0}, "inputPorts": [{"id":"in-0","name":"eventName","direction":"input"}], "outputPorts": [{"id":"out-0","name":"eventName","direction":"output"}] },
    { "id": "unique-id", "type": "map", "position": {"x": 200, "y": 0}, "config": {"mapping":{"a":"b"}}, "inputPorts": [{"id":"in","name":"in","direction":"input"}], "outputPorts": [{"id":"out","name":"out","direction":"output"}] }
  ],
  "edges": [
    { "id": "edge-id", "sourceNodeId": "node-id", "sourcePortId": "port-id", "targetNodeId": "node-id", "targetPortId": "port-id" }
  ],
  "explanation": "Brief explanation of what this pipeline does"
}`;
}

// ─── Pipeline Builder ────────────────────────────────────────────────

/**
 * Generates a pipeline graph from a natural language description.
 *
 * Returns null if the AI is busy, the response is invalid, or an error occurs.
 */
export async function buildPipelineFromDescription(
  request: PipelineBuildRequest,
  generator: AIGenerator,
): Promise<PipelineBuildResult | null> {
  if (generator.isGenerating()) return null;

  try {
    const prompt = buildPipelinePrompt(request);
    const result = await generator.explain(prompt, 'Generate the pipeline graph.');

    if (result.error || !result.text) return null;

    return parsePipelineResponse(result.text, request.existingPipeline);
  } catch {
    return null;
  }
}

// ─── Response Parsing ────────────────────────────────────────────────

/**
 * Parses the AI response into a PipelineBuildResult.
 * Validates structure and merges with existing pipeline if provided.
 */
export function parsePipelineResponse(
  text: string,
  existingPipeline?: Pipeline,
): PipelineBuildResult | null {
  // Extract JSON from markdown fences if present
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

  try {
    const obj = JSON.parse(jsonStr);

    if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null;

    // Validate nodes
    const newNodes: PipelineNode[] = [];
    for (const n of obj.nodes) {
      if (!n.id || !n.type) return null;
      newNodes.push({
        id: n.id,
        type: n.type,
        widgetInstanceId: n.widgetInstanceId,
        position: n.position ?? { x: 0, y: 0 },
        config: n.config,
        inputPorts: Array.isArray(n.inputPorts) ? n.inputPorts : [],
        outputPorts: Array.isArray(n.outputPorts) ? n.outputPorts : [],
      });
    }

    // Validate edges
    const newEdges: PipelineEdge[] = [];
    for (const e of obj.edges) {
      if (!e.id || !e.sourceNodeId || !e.sourcePortId || !e.targetNodeId || !e.targetPortId) return null;
      newEdges.push({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        sourcePortId: e.sourcePortId,
        targetNodeId: e.targetNodeId,
        targetPortId: e.targetPortId,
      });
    }

    // Merge with existing pipeline if provided
    const mergedNodes = existingPipeline
      ? [...existingPipeline.nodes, ...newNodes]
      : newNodes;
    const mergedEdges = existingPipeline
      ? [...existingPipeline.edges, ...newEdges]
      : newEdges;

    const now = new Date().toISOString();
    const pipeline: Pipeline = existingPipeline
      ? { ...existingPipeline, nodes: mergedNodes, edges: mergedEdges, updatedAt: now }
      : {
          id: `pipeline-${Date.now().toString(36)}`,
          canvasId: '00000000-0000-0000-0000-000000000000',
          nodes: mergedNodes,
          edges: mergedEdges,
          createdAt: now,
          updatedAt: now,
        };

    return {
      pipeline,
      explanation: typeof obj.explanation === 'string' ? obj.explanation : 'AI-generated pipeline',
      newNodesAdded: newNodes.map((n) => n.id),
      newEdgesAdded: newEdges.map((e) => e.id),
    };
  } catch {
    return null;
  }
}
