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
// Edge function helpers
// ---------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apikey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '',
  };
}

function getEdgeFunctionUrl(): string {
  const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (import.meta as any).env?.VITE_SUPABASE_URL
    ?? '';
  return `${supabaseUrl}/functions/v1/ai-widget-generate`;
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
    const headers = await getAuthHeaders();
    if (!headers) {
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: 'Not authenticated' });
      return;
    }

    const response = await supabase.functions.invoke('ai-widget-generate', {
      body: {
        provider: 'anthropic',
        model: message.model ?? 'claude-sonnet-4-20250514',
        prompt: buildPrompt(message.prompt, message.systemPrompt),
        type: 'ai-completion',
        maxTokens: message.maxTokens,
      },
      headers: { Authorization: headers.Authorization },
    });

    if (response.error) {
      const errorMsg = response.error.message ?? 'Edge function error';
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: errorMsg });
      bus.emit('ai.error', { instanceId, reason: 'completion_failed', error: errorMsg });
      return;
    }

    const body = response.data as { success: boolean; text?: string; html?: string; error?: string } | null;
    if (!body || !body.success) {
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: body?.error ?? 'Empty response' });
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
    const headers = await getAuthHeaders();
    if (!headers) {
      bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: 'Not authenticated' });
      return;
    }

    const functionsUrl = getEdgeFunctionUrl();

    const res = await fetch(functionsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        provider: 'anthropic',
        model: message.model ?? 'claude-sonnet-4-20250514',
        prompt: buildPrompt(message.prompt, message.systemPrompt),
        type: 'ai-completion',
        stream: true,
        maxTokens: message.maxTokens,
      }),
    });

    if (!res.ok) {
      let errorMsg = `Edge function error (${res.status})`;
      try {
        const errorBody = await res.json();
        if (errorBody?.error) errorMsg = errorBody.error;
      } catch {
        // Not JSON
      }
      bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: errorMsg });
      return;
    }

    if (!res.body) {
      bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: '', done: true });
      bridge.send({ type: 'AI_RESPONSE', requestId: message.requestId, text: '', error: 'No response body' });
      return;
    }

    // Read SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.token ?? parsed.text ?? parsed.chunk ?? '';
            if (chunk) {
              bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk, done: false });
            }
          } catch {
            // Non-JSON SSE data — treat as raw text chunk
            if (data.trim()) {
              bridge.send({ type: 'AI_CHUNK', requestId: message.requestId, chunk: data, done: false });
            }
          }
        }
      }
    }

    // Signal stream end
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
