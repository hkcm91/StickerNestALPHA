/**
 * Bridge Synthesizer — AI-powered transform chain generation.
 *
 * When two ports are semantically related but structurally incompatible,
 * the AI generates a mini-pipeline (one or more transform nodes) to bridge them.
 *
 * @module lab/ai
 * @layer L2
 */

import type { PipelineNode, PipelineEdge, PipelineNodeType } from '@sn/types';

import type { AIGenerator } from './ai-generator';

// ─── Types ───────────────────────────────────────────────────────────

export interface BridgeSynthesisRequest {
  sourcePort: {
    name: string;
    eventType?: string;
    schema?: Record<string, unknown>;
  };
  targetPort: {
    name: string;
    eventType?: string;
    schema?: Record<string, unknown>;
  };
  /** Optional context about what the user is trying to achieve */
  context?: string;
}

/** A single transform node descriptor returned by the AI */
export interface TransformDescriptor {
  type: PipelineNodeType;
  config: Record<string, unknown>;
}

export interface SynthesizedBridge {
  /** Transform nodes forming the bridge chain */
  nodes: PipelineNode[];
  /** Internal edges connecting the chain */
  edges: PipelineEdge[];
  /** Input port ID on the first node (connect source → here) */
  entryPortId: string;
  /** Output port ID on the last node (connect here → target) */
  exitPortId: string;
  /** Human-readable explanation */
  description: string;
  /** Confidence score 0.0 – 1.0 */
  confidence: number;
}

// ─── Valid transform types for bridges ───────────────────────────────

const BRIDGE_NODE_TYPES = new Set<string>([
  'filter', 'map', 'merge', 'delay', 'throttle', 'debounce', 'tap',
  'switch', 'accumulate',
]);

// ─── Prompt ──────────────────────────────────────────────────────────

function buildBridgePrompt(request: BridgeSynthesisRequest): string {
  const sourceDesc = formatPortForPrompt('Source (output)', request.sourcePort);
  const targetDesc = formatPortForPrompt('Target (input)', request.targetPort);
  const contextLine = request.context ? `\nUser intent: ${request.context}` : '';

  return `You are a pipeline transform designer for StickerNest, a visual widget platform.

Two widget ports need to be connected but their schemas don't directly match.
Generate a transform chain (1-3 nodes) to bridge them.

${sourceDesc}

${targetDesc}
${contextLine}

Available transform node types:
- "map": Rename/restructure payload fields. Config: { "mapping": { "sourceKey": "targetKey" } }
- "filter": Drop events missing a field. Config: { "condition": "fieldName" }
- "throttle": Rate-limit events. Config: { "intervalMs": number }
- "debounce": Coalesce rapid events. Config: { "delayMs": number }
- "delay": Buffer event. Config: { "delayMs": number }
- "accumulate": Batch events. Config: { "count": number, "mode": "count" }

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "transforms": [{ "type": "map", "config": { "mapping": { "count": "value" } } }],
  "description": "Maps count field to value field",
  "confidence": 0.9
}`;
}

function formatPortForPrompt(
  label: string,
  port: { name: string; eventType?: string; schema?: Record<string, unknown> },
): string {
  const parts = [`${label}: "${port.name}"`];
  if (port.eventType) parts.push(`Event type: ${port.eventType}`);
  if (port.schema) parts.push(`Schema: ${JSON.stringify(port.schema)}`);
  return parts.join('\n  ');
}

// ─── Synthesis ───────────────────────────────────────────────────────

/**
 * Synthesizes a transform bridge between two incompatible ports using AI.
 *
 * Returns null if the AI is busy, the response is invalid, or an error occurs.
 */
export async function synthesizeBridge(
  request: BridgeSynthesisRequest,
  generator: AIGenerator,
): Promise<SynthesizedBridge | null> {
  if (generator.isGenerating()) return null;

  try {
    const prompt = buildBridgePrompt(request);
    const result = await generator.explain(prompt, 'Generate the bridge transform chain.');

    if (result.error || !result.text) return null;

    const parsed = parseAIResponse(result.text);
    if (!parsed) return null;

    return buildBridgeFromDescriptors(parsed.transforms, parsed.description, parsed.confidence);
  } catch {
    return null;
  }
}

// ─── Parsing ─────────────────────────────────────────────────────────

interface ParsedBridgeResponse {
  transforms: TransformDescriptor[];
  description: string;
  confidence: number;
}

/** Extracts JSON from AI response text, handling markdown fences */
export function parseAIResponse(text: string): ParsedBridgeResponse | null {
  // Try to extract JSON from markdown code fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

  try {
    const obj = JSON.parse(jsonStr);

    if (!Array.isArray(obj.transforms) || obj.transforms.length === 0) return null;

    // Validate each transform
    const validTransforms: TransformDescriptor[] = [];
    for (const t of obj.transforms) {
      if (!t.type || !BRIDGE_NODE_TYPES.has(t.type)) return null;
      validTransforms.push({
        type: t.type as PipelineNodeType,
        config: t.config && typeof t.config === 'object' ? t.config : {},
      });
    }

    // Cap at 3 transforms
    if (validTransforms.length > 3) return null;

    return {
      transforms: validTransforms,
      description: typeof obj.description === 'string' ? obj.description : 'AI-generated transform bridge',
      confidence: typeof obj.confidence === 'number' ? Math.min(1, Math.max(0, obj.confidence)) : 0.5,
    };
  } catch {
    return null;
  }
}

// ─── Bridge Construction ─────────────────────────────────────────────

let bridgeCounter = 0;

function nextBridgeId(prefix: string): string {
  return `${prefix}-${++bridgeCounter}-${Date.now().toString(36)}`;
}

/**
 * Converts validated transform descriptors into PipelineNode[] and PipelineEdge[]
 * forming a linear chain with entry/exit ports.
 */
export function buildBridgeFromDescriptors(
  transforms: TransformDescriptor[],
  description: string,
  confidence: number,
): SynthesizedBridge {
  const nodes: PipelineNode[] = [];
  const edges: PipelineEdge[] = [];

  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    const nodeId = nextBridgeId('bridge');

    nodes.push({
      id: nodeId,
      type: t.type,
      position: { x: 0, y: 0 }, // Caller should reposition
      config: t.config,
      inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
      outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
    });

    // Connect to previous node in the chain
    if (i > 0) {
      edges.push({
        id: nextBridgeId('bedge'),
        sourceNodeId: nodes[i - 1].id,
        sourcePortId: 'out',
        targetNodeId: nodeId,
        targetPortId: 'in',
      });
    }
  }

  return {
    nodes,
    edges,
    entryPortId: 'in',
    exitPortId: 'out',
    description,
    confidence,
  };
}
