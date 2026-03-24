/**
 * AI Widget Generator — Shared Core
 *
 * Provides widget HTML validation and generation routing through the
 * Supabase edge function. Shared between Lab (L2) and Canvas (L4A-2).
 *
 * @module runtime/ai
 * @layer L3
 */

import { supabase } from '../../kernel/supabase/client';

import type { AIModel } from './models';
import { getModelById, loadSavedModelId } from './models';

export interface AIGenerationResult {
  html: string;
  isValid: boolean;
  errors: string[];
}

export interface AIGenerator {
  generate(prompt: string, context?: string): Promise<AIGenerationResult>;
  generateStream(
    prompt: string,
    onChunk: (partialHtml: string) => void,
    context?: string,
  ): Promise<AIGenerationResult>;
  isGenerating(): boolean;
  cancel(): void;
  getLastResult(): AIGenerationResult | null;
  setModel(modelId: string): void;
  getModel(): AIModel;
}

/**
 * Validates that HTML string is a valid single-file widget structure.
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

  const hasHtmlTag = /<html[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed) || /<div[\s>]/i.test(trimmed);
  const hasScript = /<script[\s>]/i.test(trimmed);

  if (!hasHtmlTag && !hasScript) {
    errors.push('Generated output does not appear to be valid HTML');
  }

  const remoteScriptPattern = /<script[^>]+src\s*=\s*["']https?:\/\//i;
  if (remoteScriptPattern.test(trimmed)) {
    errors.push('Generated widget must not include remote script sources');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extract HTML from a raw model response that may contain markdown fences.
 */
export function extractHtml(text: string): string {
  const trimmed = text.trim();

  const fenceMatch = trimmed.match(/```(?:html)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) return fenceMatch[1].trim();

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    return trimmed;
  }

  const htmlBlockMatch = trimmed.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (htmlBlockMatch) return htmlBlockMatch[1].trim();

  const htmlTagMatch = trimmed.match(/(<html[\s\S]*<\/html>)/i);
  if (htmlTagMatch) return htmlTagMatch[1].trim();

  return trimmed;
}

/**
 * Creates an AI generator for widget generation.
 */
export function createAIGenerator(): AIGenerator {
  let generating = false;
  let lastResult: AIGenerationResult | null = null;
  let abortController: AbortController | null = null;
  let currentModel: AIModel = getModelById(loadSavedModelId());

  async function invokeEdgeFunction(
    prompt: string,
    type: 'widget-generation' | 'ai-completion',
  ): Promise<{ success: boolean; html?: string; text?: string; error?: string; code?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated. Please sign in.', code: 'AUTH_ERROR' };
    }

    const model = currentModel.provider === 'replicate'
      ? currentModel.replicateModel ?? currentModel.id
      : currentModel.id;

    const response = await supabase.functions.invoke('ai-widget-generate', {
      body: { provider: currentModel.provider, model, prompt, type },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      let realError = response.error.message ?? 'Edge function error';
      const rawResponse = (response.error as { context?: Response }).context;
      if (rawResponse && typeof rawResponse.json === 'function') {
        try {
          const errorBody = await rawResponse.json();
          if (errorBody?.error) realError = errorBody.error;
        } catch { /* consumed */ }
      }
      return { success: false, error: realError, code: 'FUNCTION_ERROR' };
    }

    return (response.data as { success: boolean; html?: string; text?: string; error?: string; code?: string } | null)
      ?? { success: false, error: 'Empty response', code: 'EMPTY_RESPONSE' };
  }

  async function invokeStreamingEdgeFunction(
    prompt: string,
    type: 'widget-generation' | 'ai-completion',
    onChunk: (accumulated: string) => void,
    signal: AbortSignal,
  ): Promise<{ success: boolean; fullText: string; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, fullText: '', error: 'Not authenticated.' };
    }

    const model = currentModel.provider === 'replicate'
      ? currentModel.replicateModel ?? currentModel.id
      : currentModel.id;

    const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?? (import.meta as any).env?.VITE_SUPABASE_URL ?? '';
    const functionsUrl = `${supabaseUrl}/functions/v1/ai-widget-generate`;

    const res = await fetch(functionsUrl, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apikey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '',
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
      } catch { /* not JSON */ }
      return { success: false, fullText: '', error: errorMsg };
    }

    if (!res.body) {
      return { success: false, fullText: '', error: 'No response body' };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.token ?? parsed.text ?? parsed.chunk ?? '';
            if (token) {
              accumulated += token;
              onChunk(accumulated);
            }
          } catch {
            if (data.trim()) {
              accumulated += data;
              onChunk(accumulated);
            }
          }
        }
      }
    }

    return { success: true, fullText: accumulated };
  }

  return {
    async generate(prompt, context) {
      if (generating) {
        return { html: '', isValid: false, errors: ['Generation already in progress'] };
      }
      generating = true;
      try {
        const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
        const result = await invokeEdgeFunction(fullPrompt, 'widget-generation');

        if (!result.success || !result.html) {
          const genResult: AIGenerationResult = {
            html: '',
            isValid: false,
            errors: [result.error ?? 'No HTML in response'],
          };
          lastResult = genResult;
          return genResult;
        }

        const html = extractHtml(result.html);
        const validation = validateWidgetHtml(html);
        const genResult: AIGenerationResult = {
          html: validation.valid ? html : '',
          isValid: validation.valid,
          errors: validation.errors,
        };
        lastResult = genResult;
        return genResult;
      } catch (err) {
        const errResult: AIGenerationResult = {
          html: '',
          isValid: false,
          errors: [err instanceof Error ? err.message : String(err)],
        };
        lastResult = errResult;
        return errResult;
      } finally {
        generating = false;
      }
    },

    async generateStream(prompt, onChunk, context) {
      if (generating) {
        return { html: '', isValid: false, errors: ['Generation already in progress'] };
      }
      generating = true;
      abortController = new AbortController();
      try {
        const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
        const result = await invokeStreamingEdgeFunction(
          fullPrompt,
          'widget-generation',
          (accumulated) => {
            const html = extractHtml(accumulated);
            onChunk(html);
          },
          abortController.signal,
        );

        if (!result.success) {
          const genResult: AIGenerationResult = {
            html: '',
            isValid: false,
            errors: [result.error ?? 'Stream failed'],
          };
          lastResult = genResult;
          return genResult;
        }

        const html = extractHtml(result.fullText);
        const validation = validateWidgetHtml(html);
        const genResult: AIGenerationResult = {
          html: validation.valid ? html : result.fullText,
          isValid: validation.valid,
          errors: validation.errors,
        };
        lastResult = genResult;
        return genResult;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return { html: '', isValid: false, errors: ['Generation cancelled'] };
        }
        const errResult: AIGenerationResult = {
          html: '',
          isValid: false,
          errors: [err instanceof Error ? err.message : String(err)],
        };
        lastResult = errResult;
        return errResult;
      } finally {
        generating = false;
        abortController = null;
      }
    },

    isGenerating: () => generating,
    cancel() {
      abortController?.abort();
      generating = false;
    },
    getLastResult: () => lastResult,
    setModel(modelId) {
      currentModel = getModelById(modelId);
    },
    getModel: () => currentModel,
  };
}
