/**
 * Unified Widget Generator
 *
 * THE single source of truth for AI widget generation across StickerNest.
 * Both the Widget Lab IDE and the Canvas "AI Widget Generator" widget
 * consume this module — no duplicated logic.
 *
 * Capabilities:
 * - Generate widget HTML from natural language prompts
 * - Stream generation with SSE chunking
 * - Explain / Q&A about widget code
 * - Build enriched prompts from context (canvas entities, graph state, toggles)
 * - Auto-generate manifests from output HTML
 * - Validate generated HTML for security and structure
 * - Multi-model support (Anthropic, Replicate) via Supabase edge function
 *
 * @module runtime/ai/widget-generator
 * @layer L3
 */

import { supabase } from '../../kernel/supabase/client';

import type { AIModel } from './models';
import { getModelById, loadSavedModelId } from './models';
import { generateManifestFromHtml } from './manifest-generator';
import type { ManifestGenerationResult } from './manifest-generator';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface GenerationResult {
  html: string;
  isValid: boolean;
  errors: string[];
  /** Auto-generated manifest (only populated on valid generation) */
  manifest: ManifestGenerationResult | null;
}

export interface ExplainResult {
  text: string;
  error: string | null;
}

export interface PromptToggles {
  interactive: boolean;
  darkMode: boolean;
  emitEvents: boolean;
  transparentBackground: boolean;
}

export interface PortContract {
  name: string;
  description?: string;
  schema?: Record&lt;string, unknown&gt;;
}

export interface CompatibleWidget {
  name: string;
  widgetId?: string;
  ports: string[];
  portContracts: {
    emits: PortContract[];
    subscribes: PortContract[];
  };
  compatibility: 'high' | 'partial' | 'none';
}

export interface CanvasContext {
  /** Total widgets currently on the canvas / in the ecosystem */
  widgetCount: number;
  /** Summaries of nearby/selected widgets for connection awareness */
  nearbyWidgets: CompatibleWidget[];
}

export interface LabContext {
  /** Serialized graph context from the scene editor */
  graphContext: string | null;
  /** Full project context (design spec, source, manifest, theme) */
  fullContext: string | null;
}

export interface EnrichmentOptions {
  toggles?: Partial&lt;PromptToggles&gt;;
  /** Q&amp;A answers from prompt refinement */
  answers?: Record&lt;string, string&gt;;
  /** Selected widgets to wire to */
  selectedWidgets?: CompatibleWidget[];
  /** Canvas-side context */
  canvas?: CanvasContext;
  /** Lab-side context */
  lab?: LabContext;
}

/** The unified generator interface */
export interface WidgetGenerator {
  generate(prompt: string, options?: EnrichmentOptions): Promise&lt;GenerationResult&gt;;
  generateStream(
    prompt: string,
    onChunk: (partialHtml: string) =&gt; void,
    options?: EnrichmentOptions,
  ): Promise&lt;GenerationResult&gt;;
  explain(context: string, question: string): Promise&lt;ExplainResult&gt;;
  isGenerating(): boolean;
  cancel(): void;
  getLastResult(): GenerationResult | null;
  setModel(modelId: string): void;
  getModel(): AIModel;
}

// ═══════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════

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

  const hasHtmlTag =
    /&lt;html[\s&gt;]/i.test(trimmed) ||
    /&lt;body[\s&gt;]/i.test(trimmed) ||
    /&lt;div[\s&gt;]/i.test(trimmed);
  const hasScript = /&lt;script[\s&gt;]/i.test(trimmed);

  if (!hasHtmlTag &amp;&amp; !hasScript) {
    errors.push('Generated output does not appear to be valid HTML');
  }

  const remoteScriptPattern = /&lt;script[^&gt;]+src\s*=\s*["']https?:\/\//i;
  if (remoteScriptPattern.test(trimmed)) {
    errors.push('Generated widget must not include remote script sources');
  }

  return { valid: errors.length === 0, errors };
}

export function extractHtml(text: string): string {
  const trimmed = text.trim();

  const fenceMatch = trimmed.match(/```(?:html)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) return fenceMatch[1].trim();

  if (
    trimmed.startsWith('&lt;!DOCTYPE') ||
    trimmed.startsWith('&lt;html') ||
    trimmed.startsWith('&lt;HTML')
  ) {
    return trimmed;
  }

  const htmlBlockMatch = trimmed.match(/(&lt;!DOCTYPE[\s\S]*&lt;\/html&gt;)/i);
  if (htmlBlockMatch) return htmlBlockMatch[1].trim();

  const htmlTagMatch = trimmed.match(/(&lt;html[\s\S]*&lt;\/html&gt;)/i);
  if (htmlTagMatch) return htmlTagMatch[1].trim();

  return trimmed;
}

// ═══════════════════════════════════════════════════════════════════
// Prompt Enrichment
// ═══════════════════════════════════════════════════════════════════

export function buildEnrichedPrompt(
  rawPrompt: string,
  options?: EnrichmentOptions,
): string {
  if (!options) return rawPrompt;

  const contextLines: string[] = [];

  const t = options.toggles;
  if (t?.interactive) contextLines.push('- Make it interactive with user input controls');
  if (t?.darkMode) contextLines.push('- Dark mode: support theme tokens (--sn-bg, --sn-text, etc.)');
  if (t?.emitEvents) contextLines.push('- Emit events via the StickerNest event bus for pipeline integration');
  if (t?.transparentBackground) contextLines.push('- Use a transparent background (no background color on body/root)');

  if (options.selectedWidgets) {
    for (const widget of options.selectedWidgets) {
      const { portContracts } = widget;
      const hasContracts = portContracts.emits.length &gt; 0 || portContracts.subscribes.length &gt; 0;

      if (hasContracts) {
        contextLines.push(`--- CONNECT TO: "${widget.name}" ---`);
        for (const port of portContracts.emits) {
          const schemaStr = port.schema ? ` (payload: ${JSON.stringify(port.schema)})` : '';
          contextLines.push(`  Emits: ${port.name}${schemaStr}`);
          contextLines.push(`  YOUR WIDGET MUST subscribe to "${port.name}" with a matching event port.`);
        }
        for (const port of portContracts.subscribes) {
          const schemaStr = port.schema ? ` (payload: ${JSON.stringify(port.schema)})` : '';
          contextLines.push(`  Subscribes to: ${port.name}${schemaStr}`);
          contextLines.push(`  YOUR WIDGET MUST emit "${port.name}" with a matching event port.`);
        }
        contextLines.push('---');
      } else {
        contextLines.push(`- Connect with widget "${widget.name}"`);
      }
    }
  }

  if (options.answers) {
    for (const [question, answer] of Object.entries(options.answers)) {
      if (answer.trim()) contextLines.push(`- Q: ${question} A: ${answer}`);
    }
  }

  if (options.canvas) {
    contextLines.push(`- Canvas has ${options.canvas.widgetCount} widgets in ecosystem`);
  }

  if (options.lab?.graphContext) {
    contextLines.push('');
    contextLines.push(options.lab.graphContext);
  }
  if (options.lab?.fullContext) {
    contextLines.push('');
    contextLines.push(options.lab.fullContext);
  }

  if (contextLines.length === 0) return rawPrompt;
  return `${rawPrompt}\n\nAdditional context:\n${contextLines.join('\n')}`;
}

// ═══════════════════════════════════════════════════════════════════
// Compatibility Heuristic
// ═══════════════════════════════════════════════════════════════════

export function computeCompatibility(
  prompt: string,
  widget: Pick&lt;CompatibleWidget, 'name' | 'portContracts'&gt;,
): 'high' | 'partial' | 'none' {
  const allPorts = [...widget.portContracts.emits, ...widget.portContracts.subscribes];
  if (allPorts.length === 0) return 'none';

  const lower = prompt.toLowerCase();
  if (lower.includes(widget.name.toLowerCase())) return 'high';
  for (const port of allPorts) {
    if (port.name &amp;&amp; lower.includes(port.name.toLowerCase())) return 'high';
  }
  return 'partial';
}

// ═══════════════════════════════════════════════════════════════════
// Clarifying Questions
// ═══════════════════════════════════════════════════════════════════

const CLARIFYING_SYSTEM_PROMPT =
  'You are a widget design assistant. Given the user\'s widget idea, ask exactly 3 clarifying questions ' +
  'that would help you build a better widget. Format your response as a numbered list (1. 2. 3.). ' +
  'Keep questions concise and focused on design, functionality, and user interaction.';

export async function generateClarifyingQuestions(
  generator: WidgetGenerator,
  prompt: string,
): Promise&lt;string[]&gt; {
  if (generator.isGenerating()) return [];
  try {
    const result = await generator.explain(CLARIFYING_SYSTEM_PROMPT, prompt);
    if (result.error || !result.text) return [];
    const questions: string[] = [];
    for (const line of result.text.split('\n')) {
      const match = line.trim().match(/^\d+[.)]\s*(.+)/);
      if (match &amp;&amp; match[1].trim()) questions.push(match[1].trim());
    }
    return questions;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// Edge Function Communication
// ═══════════════════════════════════════════════════════════════════

async function invokeEdgeFunction(
  prompt: string,
  type: 'widget-generation' | 'explain' | 'ai-completion',
  model: AIModel,
): Promise&lt;{ success: boolean; html?: string; text?: string; error?: string; code?: string }&gt; {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, error: 'Not authenticated. Please sign in.', code: 'AUTH_ERROR' };
  }

  const modelId = model.provider === 'replicate' ? model.replicateModel ?? model.id : model.id;

  const response = await supabase.functions.invoke('ai-widget-generate', {
    body: { provider: model.provider, model: modelId, prompt, type },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (response.error) {
    let realError = response.error.message ?? 'Edge function error';
    let realCode = 'FUNCTION_ERROR';
    const rawResponse = (response.error as { context?: Response }).context;
    if (rawResponse &amp;&amp; typeof rawResponse.json === 'function') {
      try {
        const errorBody = await rawResponse.json();
        if (errorBody?.error) realError = errorBody.error;
        if (errorBody?.code) realCode = errorBody.code;
      } catch { /* consumed */ }
    }
    return { success: false, error: realError, code: realCode };
  }

  return (response.data as { success: boolean; html?: string; text?: string; error?: string; code?: string } | null)
    ?? { success: false, error: 'Empty response', code: 'EMPTY_RESPONSE' };
}

async function invokeStreamingEdgeFunction(
  prompt: string,
  type: 'widget-generation' | 'explain' | 'ai-completion',
  model: AIModel,
  onChunk: (accumulated: string) =&gt; void,
  signal: AbortSignal,
): Promise&lt;{ success: boolean; fullText: string; error?: string; code?: string }&gt; {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, fullText: '', error: 'Not authenticated.', code: 'AUTH_ERROR' };
  }

  const modelId = model.provider === 'replicate' ? model.replicateModel ?? model.id : model.id;

  const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
    ?? (import.meta as any).env?.VITE_SUPABASE_URL ?? '';
  const functionsUrl = `${supabaseUrl}/functions/v1/ai-widget-generate`;

  const res = await fetch(functionsUrl, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({
      provider: model.provider, model: modelId, prompt, type, stream: true,
    }),
  });

  if (!res.ok) {
    let errorMsg = `Edge function error (${res.status})`;
    try { const b = await res.json(); if (b?.error) errorMsg = b.error; } catch {}
    return { success: false, fullText: '', error: errorMsg, code: 'FUNCTION_ERROR' };
  }

  if (!res.body) return { success: false, fullText: '', error: 'No response body', code: 'EMPTY_RESPONSE' };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let streamError: string | undefined;
  let streamErrorCode: string | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.error) { streamError = parsed.error; streamErrorCode = parsed.code; continue; }
        if (parsed.done) continue;
        const token = parsed.token ?? parsed.text ?? parsed.chunk ?? '';
        if (token) { accumulated += token; onChunk(accumulated); }
      } catch {
        if (data.trim()) { accumulated += data; onChunk(accumulated); }
      }
    }
  }

  if (streamError) return { success: false, fullText: accumulated, error: streamError, code: streamErrorCode };
  return { success: true, fullText: accumulated };
}

// ═══════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════

export function createWidgetGenerator(): WidgetGenerator {
  let generating = false;
  let explaining = false;
  let lastResult: GenerationResult | null = null;
  let abortController: AbortController | null = null;
  let currentModel: AIModel = getModelById(loadSavedModelId());

  function processResult(html: string): GenerationResult {
    const extracted = extractHtml(html);
    const validation = validateWidgetHtml(extracted);
    const manifest = validation.valid ? generateManifestFromHtml(extracted) : null;
    return { html: validation.valid ? extracted : '', isValid: validation.valid, errors: validation.errors, manifest };
  }

  return {
    async generate(prompt, options) {
      if (generating) return { html: '', isValid: false, errors: ['Generation already in progress'], manifest: null };
      generating = true;
      abortController = new AbortController();
      try {
        const enrichedPrompt = buildEnrichedPrompt(prompt, options);
        const data = await invokeEdgeFunction(enrichedPrompt, 'widget-generation', currentModel);
        if (!data.success || !data.html) {
          const r: GenerationResult = { html: '', isValid: false, errors: [data.error ?? 'No HTML in response'], manifest: null };
          lastResult = r; return r;
        }
        const r = processResult(data.html);
        lastResult = r; return r;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return { html: '', isValid: false, errors: ['Generation was cancelled'], manifest: null };
        const r: GenerationResult = { html: '', isValid: false, errors: [err instanceof Error ? err.message : String(err)], manifest: null };
        lastResult = r; return r;
      } finally { generating = false; abortController = null; }
    },

    async generateStream(prompt, onChunk, options) {
      if (generating) return { html: '', isValid: false, errors: ['Generation already in progress'], manifest: null };
      generating = true;
      abortController = new AbortController();
      try {
        const enrichedPrompt = buildEnrichedPrompt(prompt, options);
        const data = await invokeStreamingEdgeFunction(
          enrichedPrompt, 'widget-generation', currentModel,
          (accumulated) =&gt; onChunk(extractHtml(accumulated)),
          abortController.signal,
        );
        if (!data.success) {
          const r: GenerationResult = { html: data.fullText || '', isValid: false, errors: [data.error ?? 'Stream failed'], manifest: null };
          lastResult = r; return r;
        }
        const r = processResult(data.fullText);
        lastResult = r; return r;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return { html: '', isValid: false, errors: ['Generation was cancelled'], manifest: null };
        const r: GenerationResult = { html: '', isValid: false, errors: [err instanceof Error ? err.message : String(err)], manifest: null };
        lastResult = r; return r;
      } finally { generating = false; abortController = null; }
    },

    async explain(context, question) {
      if (explaining) return { text: '', error: 'Explain already in progress' };
      explaining = true;
      const fullPrompt = `${context}\n\n---\n\nQuestion: ${question}\n\nProvide a clear, concise answer. Do not generate code unless specifically asked.`;
      try {
        const data = await invokeEdgeFunction(fullPrompt, 'explain', currentModel);
        if (!data.success) return { text: '', error: data.error ?? 'Request failed' };
        return { text: data.text ?? data.html ?? '', error: null };
      } catch (err) {
        if ((err as Error).name === 'AbortError') return { text: '', error: 'Request was cancelled' };
        return { text: '', error: `Request failed: ${err instanceof Error ? err.message : String(err)}` };
      } finally { explaining = false; }
    },

    isGenerating: () =&gt; generating,
    cancel() { abortController?.abort(); generating = false; },
    getLastResult: () =&gt; lastResult,
    setModel(modelId) { currentModel = getModelById(modelId); },
    getModel: () =&gt; currentModel,
  };
}
