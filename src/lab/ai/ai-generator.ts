/**
 * AI Widget Generator
 *
 * Routes prompts through the Supabase `ai-widget-generate` edge function.
 * Supports multiple providers (Anthropic, Replicate) via user BYOK keys.
 * Lab NEVER holds, reads, or logs API keys.
 *
 * @module lab/ai
 * @layer L2
 */

import { supabase } from '../../kernel/supabase/client';

import type { AIModel } from './models';
import { getModelById, loadSavedModelId } from './models';

export interface AIGenerationResult {
  html: string;
  isValid: boolean;
  errors: string[];
}

export interface AIExplainResult {
  text: string;
  error: string | null;
}

export interface AIGenerator {
  generate(prompt: string, context?: string): Promise<AIGenerationResult>;
  generateStream(
    prompt: string,
    onChunk: (partialHtml: string) => void,
    context?: string,
  ): Promise<AIGenerationResult>;
  explain(context: string, question: string): Promise<AIExplainResult>;
  isGenerating(): boolean;
  cancel(): void;
  getLastResult(): AIGenerationResult | null;
  setModel(modelId: string): void;
  getModel(): AIModel;
}

/**
 * Validates that HTML string is a valid single-file widget structure.
 * Checks for basic HTML structure — does NOT check for SDK calls
 * (that's the publish pipeline's job).
 */
export function validateWidgetHtml(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!html || typeof html !== 'string') {
    errors.push('Generated output is empty or not a string');
    return { valid: false, errors };
  }

  const trimmed = html.trim();

  if (trimmed.length === 0) {
    errors.push('Generated output is empty');
    return { valid: false, errors };
  }

  // Check for basic HTML structure markers
  const hasHtmlTag = /<html[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed) || /<div[\s>]/i.test(trimmed);
  const hasScript = /<script[\s>]/i.test(trimmed);

  if (!hasHtmlTag && !hasScript) {
    errors.push('Generated output does not appear to be valid HTML');
  }

  // Check for remote script src (security concern)
  const remoteScriptPattern = /<script[^>]+src\s*=\s*["']https?:\/\//i;
  if (remoteScriptPattern.test(trimmed)) {
    errors.push('Generated widget must not include remote script sources');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extract HTML from a raw model response that may contain markdown fences
 * or conversational text wrapping the HTML.
 */
function extractHtml(text: string): string {
  const trimmed = text.trim();

  const fenceMatch = trimmed.match(/```(?:html)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) return fenceMatch[1].trim();

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    return trimmed;
  }

  // Try to find HTML embedded in conversational text
  const htmlBlockMatch = trimmed.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (htmlBlockMatch) return htmlBlockMatch[1].trim();

  const htmlTagMatch = trimmed.match(/(<html[\s\S]*<\/html>)/i);
  if (htmlTagMatch) return htmlTagMatch[1].trim();

  return trimmed;
}

/**
 * Creates an AI generator that routes through the Supabase edge function.
 * Supports multiple providers/models via BYOK keys.
 */
export function createAIGenerator(): AIGenerator {
  let generating = false;
  let explaining = false;
  let lastResult: AIGenerationResult | null = null;
  let abortController: AbortController | null = null;
  let currentModel: AIModel = getModelById(loadSavedModelId());

  async function invokeEdgeFunction(
    prompt: string,
    type: 'widget-generation' | 'explain',
  ): Promise<{ success: boolean; html?: string; text?: string; error?: string; code?: string }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated. Please sign in.', code: 'AUTH_ERROR' };
    }

    const model = currentModel.provider === 'replicate'
      ? currentModel.replicateModel ?? currentModel.id
      : currentModel.id;

    const response = await supabase.functions.invoke('ai-widget-generate', {
      body: {
        provider: currentModel.provider,
        model,
        prompt,
        type,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      let realError = response.error.message ?? 'Edge function error';
      let realCode = 'FUNCTION_ERROR';

      const rawResponse = (response.error as { context?: Response }).context;
      if (rawResponse && typeof rawResponse.json === 'function') {
        try {
          const errorBody = await rawResponse.json();
          if (errorBody?.error) realError = errorBody.error;
          if (errorBody?.code) realCode = errorBody.code;
        } catch {
          // Response body already consumed or not JSON
        }
      }

      return { success: false, error: realError, code: realCode };
    }

    const body = response.data as { success: boolean; html?: string; text?: string; error?: string; code?: string } | null;
    return body ?? { success: false, error: 'Empty response from edge function', code: 'EMPTY_RESPONSE' };
  }

  /**
   * Invoke the edge function in streaming mode. Reads SSE tokens and calls
   * onChunk with the accumulated text so far.
   */
  async function invokeStreamingEdgeFunction(
    prompt: string,
    type: 'widget-generation' | 'explain',
    onChunk: (accumulated: string) => void,
    signal: AbortSignal,
  ): Promise<{ success: boolean; fullText: string; error?: string; code?: string }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, fullText: '', error: 'Not authenticated. Please sign in.', code: 'AUTH_ERROR' };
    }

    const model = currentModel.provider === 'replicate'
      ? currentModel.replicateModel ?? currentModel.id
      : currentModel.id;

    // We can't use supabase.functions.invoke for streaming — it doesn't support
    // reading the response as a stream. Use fetch directly.
    const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
      ?? import.meta.env.VITE_SUPABASE_URL
      ?? '';
    const functionsUrl = `${supabaseUrl}/functions/v1/ai-widget-generate`;

    const res = await fetch(functionsUrl, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({
        provider: currentModel.provider,
        model,
        prompt,
        type,
        stream: true,
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
      return { success: false, fullText: '', error: errorMsg, code: 'FUNCTION_ERROR' };
    }

    if (!res.body) {
      return { success: false, fullText: '', error: 'No response body', code: 'EMPTY_RESPONSE' };
    }

    // Read SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let streamError: string | undefined;
    let streamErrorCode: string | undefined;

    let reading = true;
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        continue;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.error) {
            streamError = event.error;
            streamErrorCode = event.code;
            continue;
          }

          if (event.done) {
            continue;
          }

          if (event.token) {
            accumulated += event.token;
            onChunk(accumulated);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    if (streamError) {
      return { success: false, fullText: accumulated, error: streamError, code: streamErrorCode };
    }

    return { success: true, fullText: accumulated };
  }

  return {
    async generate(prompt: string, context?: string): Promise<AIGenerationResult> {
      if (generating) {
        return { html: '', isValid: false, errors: ['Generation already in progress'] };
      }

      generating = true;
      abortController = new AbortController();

      const fullPrompt = context
        ? `${context}\n\n---\n\nUser request: ${prompt}`
        : prompt;

      try {
        const data = await invokeEdgeFunction(fullPrompt, 'widget-generation');

        if (!data.success) {
          const result: AIGenerationResult = {
            html: '',
            isValid: false,
            errors: [data.error ?? 'Generation failed'],
          };
          lastResult = result;
          return result;
        }

        const html = data.html ?? '';
        const validation = validateWidgetHtml(html);

        const result: AIGenerationResult = {
          html,
          isValid: validation.valid,
          errors: validation.errors,
        };
        lastResult = result;
        return result;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          const result: AIGenerationResult = {
            html: '',
            isValid: false,
            errors: ['Generation was cancelled'],
          };
          lastResult = result;
          return result;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        const result: AIGenerationResult = {
          html: '',
          isValid: false,
          errors: [`Generation failed: ${message}`],
        };
        lastResult = result;
        return result;
      } finally {
        generating = false;
        abortController = null;
      }
    },

    async generateStream(
      prompt: string,
      onChunk: (partialHtml: string) => void,
      context?: string,
    ): Promise<AIGenerationResult> {
      if (generating) {
        return { html: '', isValid: false, errors: ['Generation already in progress'] };
      }

      generating = true;
      abortController = new AbortController();

      const fullPrompt = context
        ? `${context}\n\n---\n\nUser request: ${prompt}`
        : prompt;

      try {
        const data = await invokeStreamingEdgeFunction(
          fullPrompt,
          'widget-generation',
          onChunk,
          abortController.signal,
        );

        if (!data.success) {
          const result: AIGenerationResult = {
            html: data.fullText || '',
            isValid: false,
            errors: [data.error ?? 'Generation failed'],
          };
          lastResult = result;
          return result;
        }

        const html = extractHtml(data.fullText);
        const validation = validateWidgetHtml(html);

        const result: AIGenerationResult = {
          html,
          isValid: validation.valid,
          errors: validation.errors,
        };
        lastResult = result;
        return result;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          const result: AIGenerationResult = {
            html: '',
            isValid: false,
            errors: ['Generation was cancelled'],
          };
          lastResult = result;
          return result;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        const result: AIGenerationResult = {
          html: '',
          isValid: false,
          errors: [`Generation failed: ${message}`],
        };
        lastResult = result;
        return result;
      } finally {
        generating = false;
        abortController = null;
      }
    },

    async explain(context: string, question: string): Promise<AIExplainResult> {
      if (explaining) {
        return { text: '', error: 'Explain already in progress' };
      }

      explaining = true;

      const fullPrompt = `${context}\n\n---\n\nQuestion: ${question}\n\nProvide a clear, concise answer. Do not generate code unless specifically asked.`;

      try {
        const data = await invokeEdgeFunction(fullPrompt, 'explain');

        if (!data.success) {
          return { text: '', error: data.error ?? 'Request failed' };
        }

        return { text: data.text ?? data.html ?? '', error: null };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { text: '', error: 'Request was cancelled' };
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { text: '', error: `Request failed: ${message}` };
      } finally {
        explaining = false;
      }
    },

    isGenerating() {
      return generating;
    },

    cancel() {
      if (abortController) {
        abortController.abort();
      }
    },

    getLastResult() {
      return lastResult;
    },

    setModel(modelId: string) {
      currentModel = getModelById(modelId);
    },

    getModel() {
      return currentModel;
    },
  };
}

/**
 * Creates an AI generator using the environment-configured proxy URL.
 * @deprecated Use createAIGenerator() instead — routes through Supabase edge function.
 */
export function createDefaultAIGenerator(): AIGenerator {
  return createAIGenerator();
}
