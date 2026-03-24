/**
 * Async Pipeline Node Processors
 *
 * Handles execution of asynchronous pipeline nodes (AI generation,
 * AI actions, HTTP requests). These nodes fork execution without
 * blocking the event bus.
 *
 * @module canvas/wiring/engine
 * @layer L4A-3
 */

import type { PipelineNode } from '@sn/types';

import { bus } from '../../../kernel/bus';

/** Default timeout for async nodes: 30 seconds */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Set of async node types */
export const ASYNC_NODE_TYPES = new Set(['ai-generate', 'ai-action', 'http-request']);

/** Track active async operations for cancellation */
const activeOperations = new Map<string, AbortController>();

/**
 * Check if a node type is asynchronous.
 */
export function isAsyncNode(nodeType: string): boolean {
  return ASYNC_NODE_TYPES.has(nodeType);
}

/**
 * Cancel an active async operation by node ID.
 */
export function cancelAsyncNode(nodeId: string): void {
  const controller = activeOperations.get(nodeId);
  if (controller) {
    controller.abort();
    activeOperations.delete(nodeId);
  }
}

/**
 * Cancel all active async operations (used on engine stop).
 */
export function cancelAllAsyncNodes(): void {
  for (const controller of activeOperations.values()) {
    controller.abort();
  }
  activeOperations.clear();
}

/**
 * Process an AI generate node.
 *
 * Takes a payload (expected to contain a prompt), calls AI completion,
 * and forwards the generated text to downstream nodes.
 */
async function processAIGenerateNode(
  node: PipelineNode,
  payload: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  const prompt = typeof payload === 'string'
    ? payload
    : (payload as Record<string, unknown>)?.prompt ?? (payload as Record<string, unknown>)?.text ?? String(payload);

  const systemPrompt = (node.config?.systemPrompt as string) ?? undefined;
  const model = (node.config?.model as string) ?? undefined;

  // Emit to bus to request AI completion through the platform proxy
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Cancelled')); return; }

    const requestId = `pipeline-ai-${node.id}-${Date.now()}`;

    const unsub = bus.subscribe(`pipeline.ai.response.${requestId}`, (event: unknown) => {
      unsub();
      const ev = event as { payload: { text?: string; error?: string } };
      if (ev.payload.error) {
        reject(new Error(ev.payload.error));
      } else {
        resolve(ev.payload.text ?? '');
      }
    });

    signal.addEventListener('abort', () => {
      unsub();
      reject(new Error('Cancelled'));
    });

    // Request AI completion via the bus
    bus.emit('pipeline.ai.request', {
      requestId,
      prompt: String(prompt),
      systemPrompt,
      model,
    });
  });
}

/**
 * Process an AI action node.
 *
 * Takes AI-generated text, parses it as JSON actions, and executes them
 * via the AI action executor.
 */
async function processAIActionNode(
  _node: PipelineNode,
  payload: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  if (signal.aborted) throw new Error('Cancelled');

  // Dynamic import to avoid circular dependency at module load time
  const { executeAIActions } = await import('../../../canvas/core/ai/action-executor');
  const { AICanvasActionSchema } = await import('@sn/types');

  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Try to parse as JSON array of actions
  let actions: unknown[];
  try {
    const parsed = JSON.parse(text);
    actions = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return { error: 'Failed to parse AI output as JSON actions', raw: text };
  }

  // Validate and execute
  const validActions = actions
    .map((a) => AICanvasActionSchema.safeParse(a))
    .filter((r) => r.success)
    .map((r) => r.data!);

  if (validActions.length === 0) {
    return { error: 'No valid actions parsed', raw: text };
  }

  const result = executeAIActions(validActions, `pipeline-${_node.id}`);
  return result;
}

/**
 * Process an HTTP request node.
 *
 * Makes a proxied HTTP request via the integration system.
 */
async function processHTTPRequestNode(
  node: PipelineNode,
  payload: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  if (signal.aborted) throw new Error('Cancelled');

  const url = (node.config?.url as string) ?? '';
  const method = (node.config?.method as string) ?? 'GET';

  if (!url) {
    return { error: 'HTTP request node requires a url in config' };
  }

  // Emit to bus to request proxied HTTP through the integration system
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Cancelled')); return; }

    const requestId = `pipeline-http-${node.id}-${Date.now()}`;

    const unsub = bus.subscribe(`pipeline.http.response.${requestId}`, (event: unknown) => {
      unsub();
      const ev = event as { payload: { result?: unknown; error?: string } };
      if (ev.payload.error) {
        reject(new Error(ev.payload.error));
      } else {
        resolve(ev.payload.result);
      }
    });

    signal.addEventListener('abort', () => {
      unsub();
      reject(new Error('Cancelled'));
    });

    bus.emit('pipeline.http.request', {
      requestId,
      url,
      method,
      body: payload,
    });
  });
}

/**
 * Execute an async pipeline node.
 *
 * Emits pending/completed/failed bus events for observability.
 * Returns the processed result for forwarding to downstream nodes.
 */
export async function executeAsyncNode(
  node: PipelineNode,
  payload: unknown,
  forwardResult: (nodeId: string, result: unknown) => void,
): Promise<void> {
  const controller = new AbortController();
  activeOperations.set(node.id, controller);

  const timeoutMs = (node.config?.timeoutMs as number) ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  bus.emit('canvas.pipeline.node.pending', { nodeId: node.id, type: node.type });

  try {
    let result: unknown;

    switch (node.type) {
      case 'ai-generate':
        result = await processAIGenerateNode(node, payload, controller.signal);
        break;
      case 'ai-action':
        result = await processAIActionNode(node, payload, controller.signal);
        break;
      case 'http-request':
        result = await processHTTPRequestNode(node, payload, controller.signal);
        break;
      default:
        throw new Error(`Unknown async node type: ${node.type}`);
    }

    bus.emit('canvas.pipeline.node.completed', { nodeId: node.id, type: node.type });
    forwardResult(node.id, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    bus.emit('canvas.pipeline.node.failed', { nodeId: node.id, type: node.type, error: message });
  } finally {
    clearTimeout(timer);
    activeOperations.delete(node.id);
  }
}
