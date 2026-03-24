/**
 * AI Completion Bridge Handler
 *
 * Host-side handler for AI completion requests from widgets.
 * Routes through the Supabase `ai-widget-generate` edge function.
 * Enforces 'ai' permission and per-instance rate limiting.
 *
 * @module runtime/ai-completion
 * @layer L3
 */

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import { supabase } from '../../kernel/supabase/client';
import type { WidgetBridge } from '../bridge/bridge';
import type { WidgetMessage } from '../bridge/message-types';

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

function hasAiPermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('ai') ?? false;
}

// ---------------------------------------------------------------------------
// Rate limiting: 10 completions/minute per widget instance
// ---------------------------------------------------------------------------

const AI_RATE_LIMIT = 10;
const AI_RATE_WINDOW_MS = 60_000;

interface RateBucket {
  count: number;
  windowStart: number;
}

const rateBuckets = new Map<string, RateBucket>();

function checkAiRateLimit(instanceId: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(instanceId);

  if (!bucket || now - bucket.windowStart >= AI_RATE_WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    rateBuckets.set(instanceId, bucket);
  }

  bucket.count++;
  return bucket.count <= AI_RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Dev proxy vs edge function routing
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDev = (import.meta as any).env?.DEV ?? false;

/**
 * In dev mode, route AI requests to the local vite proxy at /api/ai/generate.
 * In production, route to the Supabase edge function.
 */
function getAiEndpointUrl(): string {
  if (isDev) return '/api/ai/generate';

  const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (import.meta as any).env?.VITE_SUPABASE_URL
    ?? '';
  return `${supabaseUrl}/functions/v1/ai-widget-generate`;
}

async function getRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // In production, add auth headers for the edge function
  if (!isDev) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      headers.Authorization = `Bearer ${session.access_token}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headers.apikey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '';
    }
  }

  return headers;
}

/**
 * Resolve provider and model from the requested model ID.
 * Model IDs like 'replicate/kimi-k2.5' map to provider='replicate', model='moonshotai/kimi-k2.5'.
 */
function resolveProviderAndModel(modelId?: string): { provider: string; model: string } {
  if (!modelId) return { provider: 'anthropic', model: 'claude-sonnet-4-20250514' };

  if (modelId.startsWith('replicate/')) {
    // Map known model IDs to Replicate model paths
    const modelMap: Record<string, string> = {
      'replicate/kimi-k2.5': 'moonshotai/kimi-k2.5',
      'replicate/llama-4-maverick': 'meta/llama-4-maverick-instruct',
      'replicate/qwen3-235b': 'qwen/qwen3-235b-a22b-instruct-2507',
    };
    return { provider: 'replicate', model: modelMap[modelId] ?? modelId.replace('replicate/', '') };
  }

  return { provider: 'anthropic', model: modelId };
}

// ---------------------------------------------------------------------------
// Handler context
// ---------------------------------------------------------------------------

interface AiHandlerContext {
  widgetId: string;
  instanceId: string;
  bridge: WidgetBridge;
}

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

/**
 * Handles an AI completion message from a widget iframe.
 * Returns true if the message was handled, false otherwise.
 */
export function handleAiCompletionMessage(
  message: WidgetMessage,
  ctx: AiHandlerContext,
): boolean {
  const { widgetId, instanceId, bridge } = ctx;

  switch (message.type) {
    case 'AI_COMPLETE': {
      if (!hasAiPermission(widgetId)) {
        bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: 'Permission denied: widget lacks ai permission' });
        bus.emit('ai.error', { instanceId, reason: 'permission_denied' });
        return true;
      }

      if (!checkAiRateLimit(instanceId)) {
        bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: 'Rate limit exceeded: max 10 completions per minute' });
        bus.emit('ai.error', { instanceId, reason: 'rate_limited' });
        return true;
      }

      handleComplete(message, ctx);
      return true;
    }

    case 'AI_STREAM': {
      if (!hasAiPermission(widgetId)) {
        bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
        bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: 'Permission denied: widget lacks ai permission' });
        bus.emit('ai.error', { instanceId, reason: 'permission_denied' });
        return true;
      }

      if (!checkAiRateLimit(instanceId)) {
        bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
        bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: 'Rate limit exceeded: max 10 completions per minute' });
        bus.emit('ai.error', { instanceId, reason: 'rate_limited' });
        return true;
      }

      handleStream(message, ctx);
      return true;
    }

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Non-streaming completion
// ---------------------------------------------------------------------------

async function handleComplete(
  message: Extract<WidgetMessage, { type: 'AI_COMPLETE' }>,
  ctx: AiHandlerContext,
): Promise<void> {
  const { instanceId, bridge } = ctx;

  try {
    const headers = await getRequestHeaders();
    const { provider, model } = resolveProviderAndModel(message.model);
    const url = getAiEndpointUrl();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        provider,
        model,
        prompt: buildPrompt(message.prompt, message.systemPrompt),
        systemPrompt: message.systemPrompt,
        type: 'ai-completion',
        maxTokens: message.maxTokens,
      }),
    });

    if (!response.ok) {
      let errorMsg = `AI request failed (${response.status})`;
      try {
        const errorBody = await response.json();
        if ((errorBody as { error?: string })?.error) errorMsg = (errorBody as { error: string }).error;
      } catch { /* not JSON */ }
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: errorMsg });
      bus.emit('ai.error', { instanceId, reason: 'completion_failed', error: errorMsg });
      return;
    }

    const body = await response.json() as { success?: boolean; text?: string; html?: string; error?: string };
    if (body.error) {
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: body.error });
      return;
    }

    const text = body.text ?? body.html ?? '';
    bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text });
    bus.emit('ai.completion.completed', { instanceId, model: message.model });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: errorMsg });
    bus.emit('ai.error', { instanceId, reason: 'completion_failed', error: errorMsg });
  }
}

// ---------------------------------------------------------------------------
// Streaming completion
// ---------------------------------------------------------------------------

async function handleStream(
  message: Extract<WidgetMessage, { type: 'AI_STREAM' }>,
  ctx: AiHandlerContext,
): Promise<void> {
  const { instanceId, bridge } = ctx;

  try {
    const headers = await getRequestHeaders();
    const { provider, model } = resolveProviderAndModel(message.model);
    const url = getAiEndpointUrl();

    // For the local dev proxy, streaming is not supported — fall back to
    // a non-streaming request and send the full response as a single chunk.
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        provider,
        model,
        prompt: buildPrompt(message.prompt, message.systemPrompt),
        systemPrompt: message.systemPrompt,
        type: 'ai-completion',
        maxTokens: message.maxTokens,
      }),
    });

    if (!res.ok) {
      let errorMsg = `AI request failed (${res.status})`;
      try {
        const errorBody = await res.json();
        if ((errorBody as { error?: string })?.error) errorMsg = (errorBody as { error: string }).error;
      } catch { /* not JSON */ }
      bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: errorMsg });
      return;
    }

    const body = await res.json() as { success?: boolean; text?: string; html?: string; error?: string };
    if (body.error) {
      bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: body.error });
      return;
    }

    const text = body.text ?? body.html ?? '';

    // Simulate streaming by sending the response in chunks
    const chunkSize = 20;
    for (let i = 0; i < text.length; i += chunkSize) {
      bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: text.slice(i, i + chunkSize), done: false });
    }

    bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
    bus.emit('ai.completion.completed', { instanceId, model: message.model, streamed: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
    bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: errorMsg });
    bus.emit('ai.error', { instanceId, reason: 'stream_failed', error: errorMsg });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPrompt(userPrompt: string, systemPrompt?: string): string {
  if (!systemPrompt) return userPrompt;
  return `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
}
