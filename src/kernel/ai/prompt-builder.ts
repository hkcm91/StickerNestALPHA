/**
 * AI Prompt Builder
 *
 * Constructs structured prompts for AI canvas reasoning by combining
 * canvas context snapshots with user instructions and system guidance.
 *
 * @module kernel/ai
 */

import type { AICanvasContext } from '@sn/types';

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const CANVAS_AGENT_SYSTEM_PROMPT = `You are a StickerNest canvas agent. You analyze the canvas state and execute actions.

You will receive a JSON snapshot of the current canvas, including:
- Entity positions, types, and properties
- Spatial relationships between entities
- Viewport state
- Available widgets

Respond with a JSON object matching this exact schema:
{
  "reasoning": "brief explanation of your plan",
  "actions": [
    // Array of action objects. Each must have an "action" field.
    // Available actions:
    // { "action": "create_sticker", "assetUrl": "url", "position": {"x": 0, "y": 0}, "size?": {"width": 200, "height": 200}, "name?": "string" }
    // { "action": "create_widget", "widgetId": "id", "position": {"x": 0, "y": 0}, "size?": {"width": 300, "height": 200}, "config?": {}, "name?": "string" }
    // { "action": "create_text", "content": "text", "position": {"x": 0, "y": 0}, "fontSize?": 16, "color?": "#000", "name?": "string" }
    // { "action": "create_shape", "shapeType": "rectangle|ellipse|line|polygon", "position": {"x": 0, "y": 0}, "size": {"width": 100, "height": 100}, "fill?": "#color", "stroke?": "#color" }
    // { "action": "move_entity", "entityId": "uuid", "position": {"x": 0, "y": 0} }
    // { "action": "update_entity", "entityId": "uuid", "updates": { "key": "value" } }
    // { "action": "delete_entity", "entityId": "uuid" }
    // { "action": "trigger_generation", "prompt": "image description", "position?": {"x": 0, "y": 0} }
    // { "action": "emit_event", "eventType": "event.name", "payload": {} }
  ]
}

Rules:
- Output ONLY valid JSON. No markdown fences, no explanation outside the JSON.
- Position entities in canvas space (not screen space).
- Use the viewport center as the default placement area for new entities.
- Avoid placing entities on top of existing ones unless requested.
- Keep entity names concise and descriptive.
- For move/update/delete, reference entities by their exact ID from the snapshot.
- If the user's request is unclear, prefer minimal changes over guessing.
- If no actions are needed, return an empty actions array with reasoning.`;

// ---------------------------------------------------------------------------
// Context serialization
// ---------------------------------------------------------------------------

function serializeContext(ctx: AICanvasContext): string {
  const lines: string[] = [];

  lines.push(`Canvas: "${ctx.canvasName ?? ctx.canvasId}" (${ctx.totalEntities} entities)`);
  lines.push(`Viewport: center=(${ctx.viewport.centerX}, ${ctx.viewport.centerY}), zoom=${ctx.viewport.zoom}, visible=${Math.round(ctx.viewport.visibleWidth)}x${Math.round(ctx.viewport.visibleHeight)}`);
  lines.push('');

  if (ctx.entities.length > 0) {
    lines.push('Entities:');
    for (const e of ctx.entities) {
      const propStr = e.props ? ` ${JSON.stringify(e.props)}` : '';
      const nameStr = e.name ? ` "${e.name}"` : '';
      lines.push(`  [${e.id.slice(0, 8)}] ${e.type}${nameStr} at (${e.x},${e.y}) ${e.w}x${e.h} z=${e.z}${propStr}`);
    }
    lines.push('');
  }

  if (ctx.relations.length > 0) {
    lines.push('Spatial Relations:');
    for (const r of ctx.relations) {
      const distStr = r.distance != null ? ` (${r.distance}px)` : '';
      lines.push(`  ${r.from.slice(0, 8)} ${r.relation} ${r.to.slice(0, 8)}${distStr}`);
    }
    lines.push('');
  }

  if (ctx.availableWidgets && ctx.availableWidgets.length > 0) {
    lines.push('Available Widgets:');
    for (const w of ctx.availableWidgets) {
      lines.push(`  ${w.widgetId} — "${w.name}" (${w.category ?? 'other'})`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuildAIPromptOptions {
  /** Include full entity JSON instead of compact text format */
  jsonContext?: boolean;
  /** Additional system instructions to append */
  extraInstructions?: string;
  /** Conversation history for multi-turn interactions */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIPrompt {
  /** System prompt for the AI model */
  system: string;
  /** Messages array for the API call */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Build a structured prompt for AI canvas reasoning.
 *
 * @param context - Canvas snapshot from buildCanvasAIContext()
 * @param userPrompt - The user's natural language instruction
 * @param options - Optional configuration
 * @returns Structured prompt ready for Anthropic API
 */
export function buildAIPrompt(
  context: AICanvasContext,
  userPrompt: string,
  options: BuildAIPromptOptions = {},
): AIPrompt {
  const { jsonContext = false, extraInstructions, history = [] } = options;

  // Build system prompt
  let system = CANVAS_AGENT_SYSTEM_PROMPT;
  if (extraInstructions) {
    system += `\n\nAdditional instructions:\n${extraInstructions}`;
  }

  // Build context block
  const contextBlock = jsonContext
    ? JSON.stringify(context, null, 2)
    : serializeContext(context);

  // Build user message with context + instruction
  const userMessage = `=== CANVAS STATE ===\n${contextBlock}\n=== END CANVAS STATE ===\n\nUser request: ${userPrompt}`;

  // Combine history with current message
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  return { system, messages };
}

/**
 * Parse a structured AI response into an AIActionBatch.
 * Handles markdown fences, trailing text, and common formatting issues.
 */
export function parseAIResponse(response: string): {
  success: boolean;
  actions: Array<Record<string, unknown>>;
  reasoning?: string;
  error?: string;
} {
  const trimmed = response.trim();

  // Strip markdown JSON fences if present
  let json = trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    json = fenceMatch[1].trim();
  }

  // Try to find JSON object in the response
  if (!json.startsWith('{')) {
    const jsonMatch = json.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      json = jsonMatch[1];
    }
  }

  try {
    const parsed = JSON.parse(json);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, actions: [], error: 'Response is not a JSON object' };
    }

    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined;

    return { success: true, actions, reasoning };
  } catch (err) {
    return {
      success: false,
      actions: [],
      error: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
