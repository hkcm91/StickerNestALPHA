/**
 * AI Widget Generator
 *
 * Sends prompts through the platform's Anthropic API proxy.
 * Lab NEVER holds, reads, or logs API keys.
 * Validates generated output is valid single-file HTML.
 *
 * @module lab/ai
 * @layer L2
 */

export interface AIGenerationResult {
  html: string;
  isValid: boolean;
  errors: string[];
}

export interface AIGenerator {
  generate(prompt: string): Promise<AIGenerationResult>;
  isGenerating(): boolean;
  cancel(): void;
  getLastResult(): AIGenerationResult | null;
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
 * Creates an AI generator using the environment-configured proxy URL.
 * Returns a generator that immediately errors if the proxy is not configured.
 */
export function createDefaultAIGenerator(): AIGenerator {
  const proxyUrl = typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_PROXY_URL
    : undefined;

  if (!proxyUrl) {
    return {
      async generate(): Promise<AIGenerationResult> {
        return { html: '', isValid: false, errors: ['AI generation is not configured'] };
      },
      isGenerating() { return false; },
      cancel() { /* no-op */ },
      getLastResult() { return null; },
    };
  }

  return createAIGenerator(proxyUrl);
}

/**
 * Creates an AI generator that routes through the platform proxy.
 *
 * @param proxyUrl - URL of the platform's Anthropic API proxy endpoint
 */
export function createAIGenerator(proxyUrl: string): AIGenerator {
  let generating = false;
  let lastResult: AIGenerationResult | null = null;
  let abortController: AbortController | null = null;

  return {
    async generate(prompt: string): Promise<AIGenerationResult> {
      if (generating) {
        return { html: '', isValid: false, errors: ['Generation already in progress'] };
      }

      generating = true;
      abortController = new AbortController();

      try {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            type: 'widget-generation',
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const result: AIGenerationResult = {
            html: '',
            isValid: false,
            errors: [`Proxy returned status ${response.status}`],
          };
          lastResult = result;
          return result;
        }

        const data = (await response.json()) as { html?: string };
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
  };
}
