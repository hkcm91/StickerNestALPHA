/**
 * Pipeline Execution Engine — routes events through the pipeline graph
 *
 * @module canvas/wiring/engine
 * @layer L4A-3
 */

import type { BusEvent } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { executeAIActions } from '../../../kernel/ai/action-executor';
import { bus } from '../../../kernel/bus';
import type { PipelineGraph } from '../graph';

import { isAsyncNode, executeAsyncNode, cancelAllAsyncNodes } from './async-nodes';

export interface ExecutionEngine {
  start(): void;
  stop(): void;
  readonly isRunning: boolean;
}

/**
 * Callback for AI generation — injected by the host to keep HTTP concerns
 * outside the engine. Returns the raw AI response text.
 */
export type AIGenerateHandler = (prompt: string, config: Record<string, unknown>) => Promise<string>;

export interface ExecutionEngineOptions {
  /** Handler for ai-generate nodes. If not provided, ai-generate nodes emit an error. */
  onAIGenerate?: AIGenerateHandler;
}

export function createExecutionEngine(graph: PipelineGraph, options: ExecutionEngineOptions = {}): ExecutionEngine {
  let unsubscribe: (() => void) | null = null;
  let running = false;

  function routeEvent(event: BusEvent) {
    // Ignore events emitted by the engine itself to prevent infinite loops
    if (event.type === 'canvas.pipeline.routed') return;
    if (event.type.startsWith('canvas.pipeline.ai.')) return;

    const nodes = graph.getAllNodes();
    const edges = graph.getAllEdges();

    // Find widget nodes that match the emitting widget
    for (const node of nodes) {
      if (node.type !== 'widget') continue;

      // Check output ports for edges
      for (const port of node.outputPorts) {
        const outEdges = edges.filter(
          (e) => e.sourceNodeId === node.id && e.sourcePortId === port.id,
        );

        for (const edge of outEdges) {
          const targetNode = graph.getNode(edge.targetNodeId);
          if (!targetNode) continue;

          processNode(targetNode, edge.targetPortId, event.payload);
        }
      }
    }
  }

  function processNode(node: ReturnType<PipelineGraph['getNode']>, portId: string, payload: unknown): void {
    if (!node) return;

    const edges = graph.getAllEdges();

    switch (node.type) {
      case 'widget':
        bus.emit('canvas.pipeline.routed', {
          targetNodeId: node.id,
          targetPortId: portId,
          payload,
        });
        break;

      case 'tap':
        // Passthrough — forward unchanged
        forwardFromNode(node.id, payload, edges);
        break;

      case 'filter': {
        const condition = node.config?.condition as string | undefined;
        if (condition && payload && typeof payload === 'object') {
          const val = (payload as Record<string, unknown>)[condition];
          if (val) forwardFromNode(node.id, payload, edges);
        } else {
          forwardFromNode(node.id, payload, edges);
        }
        break;
      }

      case 'map': {
        const mapping = node.config?.mapping as Record<string, string> | undefined;
        if (mapping && payload && typeof payload === 'object') {
          const mapped: Record<string, unknown> = {};
          for (const [from, to] of Object.entries(mapping)) {
            mapped[to] = (payload as Record<string, unknown>)[from];
          }
          forwardFromNode(node.id, mapped, edges);
        } else {
          forwardFromNode(node.id, payload, edges);
        }
        break;
      }

      case 'delay': {
        const delayMs = (node.config?.delayMs as number) ?? 100;
        setTimeout(() => forwardFromNode(node.id, payload, edges), delayMs);
        break;
      }

      case 'merge':
        forwardFromNode(node.id, payload, edges);
        break;

      case 'throttle': {
        const intervalMs = (node.config?.intervalMs as number) ?? 100;
        const now = Date.now();
        const nodeId = node.id;
        if (!throttleTimestamps.has(nodeId) || now - throttleTimestamps.get(nodeId)! >= intervalMs) {
          throttleTimestamps.set(nodeId, now);
          forwardFromNode(nodeId, payload, edges);
        }
        break;
      }

      case 'debounce': {
        const debounceMs = (node.config?.delayMs as number) ?? 100;
        const nodeId = node.id;
        if (debounceTimers.has(nodeId)) {
          clearTimeout(debounceTimers.get(nodeId)!);
        }
        debounceTimers.set(
          nodeId,
          setTimeout(() => {
            debounceTimers.delete(nodeId);
            forwardFromNode(nodeId, payload, edges);
          }, debounceMs) as unknown as number,
        );
        break;
      }

      // ─── AI Pipeline Nodes ──────────────────────────────────────────
      // These are async — they do NOT block the event bus.

      case 'ai-prompt': {
        // Builds a prompt string from a template + incoming payload.
        // config.promptTemplate: string with {{field}} placeholders
        // Forwards: { prompt: string, ...originalPayload }
        const template = (node.config?.promptTemplate as string) ?? '{{input}}';
        const data = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : { input: payload };
        const prompt = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
          const val = data[key];
          return val != null ? String(val) : '';
        });
        forwardFromNode(node.id, { ...data, prompt }, edges);
        break;
      }

      case 'ai-generate': {
        // Calls the AI generation handler asynchronously.
        // Input expects { prompt: string, ... }
        // Forwards: { response: string, ...input }
        const nodeId = node.id;
        const prompt = (payload && typeof payload === 'object')
          ? (payload as Record<string, unknown>).prompt as string ?? ''
          : String(payload ?? '');
        const config = node.config ?? {};

        bus.emit(CanvasEvents.PIPELINE_AI_PROCESSING, { nodeId });

        if (!options.onAIGenerate) {
          bus.emit(CanvasEvents.PIPELINE_AI_ERROR, {
            nodeId,
            error: 'No AI generation handler configured',
          });
          break;
        }

        // Fire-and-forget async — does NOT block the bus
        options.onAIGenerate(prompt, config).then(
          (response) => {
            if (!running) return; // Engine stopped while waiting
            bus.emit(CanvasEvents.PIPELINE_AI_COMPLETED, { nodeId, response });
            const currentEdges = graph.getAllEdges();
            forwardFromNode(nodeId, { ...((payload && typeof payload === 'object') ? payload : {}), response }, currentEdges);
          },
          (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            bus.emit(CanvasEvents.PIPELINE_AI_ERROR, { nodeId, error: message });
          },
        );
        break;
      }

      case 'ai-create-entity': {
        // Parses AI response as action JSON and executes entity creation.
        // Input expects { response: string, ... } or { actions: [...] }
        const nodeId = node.id;
        const data = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};

        let actions: Record<string, unknown>[];

        if (Array.isArray(data.actions)) {
          // Pre-parsed actions array
          actions = data.actions as Record<string, unknown>[];
        } else if (typeof data.response === 'string') {
          // Parse JSON from AI response text
          try {
            const trimmed = (data.response as string).trim();
            let json = trimmed;
            const fenceMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
            if (fenceMatch) json = fenceMatch[1].trim();
            if (!json.startsWith('{') && !json.startsWith('[')) {
              const objMatch = json.match(/(\{[\s\S]*\})/);
              if (objMatch) json = objMatch[1];
            }
            const parsed = JSON.parse(json);
            actions = Array.isArray(parsed.actions) ? parsed.actions : Array.isArray(parsed) ? parsed : [];
          } catch {
            bus.emit(CanvasEvents.PIPELINE_AI_ERROR, {
              nodeId,
              error: 'Failed to parse AI response as action JSON',
            });
            break;
          }
        } else {
          bus.emit(CanvasEvents.PIPELINE_AI_ERROR, {
            nodeId,
            error: 'ai-create-entity requires { response: string } or { actions: [...] }',
          });
          break;
        }

        const result = executeAIActions(actions);
        forwardFromNode(nodeId, { executionResult: result }, edges);
        break;
      }

      default: {
        // Handle additional async node types (ai-action, http-request)
        if (isAsyncNode(node.type)) {
          void executeAsyncNode(node, payload, (nodeId, result) => {
            const currentEdges = graph.getAllEdges();
            forwardFromNode(nodeId, result, currentEdges);
          });
          break;
        }
        // Unknown node type — ignore
        break;
      }
    }
  }

  const throttleTimestamps = new Map<string, number>();
  const debounceTimers = new Map<string, number>();

  function forwardFromNode(nodeId: string, payload: unknown, edges: ReturnType<PipelineGraph['getAllEdges']>): void {
    const node = graph.getNode(nodeId);
    if (!node) return;

    for (const port of node.outputPorts) {
      const outEdges = edges.filter(
        (e) => e.sourceNodeId === nodeId && e.sourcePortId === port.id,
      );
      for (const edge of outEdges) {
        const targetNode = graph.getNode(edge.targetNodeId);
        if (targetNode) {
          processNode(targetNode, edge.targetPortId, payload);
        }
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      unsubscribe = bus.subscribe('widget.*', routeEvent);
    },

    stop() {
      if (!running) return;
      running = false;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      throttleTimestamps.clear();
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();
      cancelAllAsyncNodes();
    },

    get isRunning() {
      return running;
    },
  };
}
