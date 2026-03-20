/**
 * Design Spec Generator — AI-powered design system generation.
 *
 * Uses the AI generator proxy to produce a WidgetDesignSpec
 * from a text description.
 *
 * @module lab/design-spec
 * @layer L2
 */

import {
  WidgetDesignSpecSchema,
  WidgetDesignSpecJSONSchema,
  type WidgetDesignSpec,
  type CoreThemeTokens,
} from '@sn/types';

import type { AIGenerator } from '../ai/ai-generator';

/**
 * Generate a WidgetDesignSpec from a text description using AI.
 *
 * @param generator - AI generator instance (routes through proxy)
 * @param description - Text description of the desired design system
 * @param baseTheme - Optional platform theme tokens to build on
 * @returns The generated design spec, or null if generation failed
 */
export async function generateDesignSpec(
  generator: AIGenerator,
  description: string,
  baseTheme?: CoreThemeTokens,
): Promise<WidgetDesignSpec | null> {
  const themeContext = baseTheme
    ? `\nPlatform base theme tokens:\n${JSON.stringify(baseTheme, null, 2)}\n`
    : '';

  const prompt = [
    'Generate a widget design system specification as JSON.',
    `Description: ${description}`,
    themeContext,
    'Output ONLY valid JSON matching this schema (no markdown, no explanation):',
    JSON.stringify(WidgetDesignSpecJSONSchema, null, 2),
  ].join('\n');

  const result = await generator.generate(prompt);

  // The proxy returns { html } but we sent a JSON prompt, so the response
  // might come as raw text. Try to extract JSON from the response.
  const jsonStr = extractJson(result.html);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr);
    const validated = WidgetDesignSpecSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to extract a JSON object from a string that might contain
 * surrounding text or markdown code fences.
 */
function extractJson(text: string): string | null {
  if (!text) return null;

  // Try code fence extraction first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try finding a top-level { ... }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);

  return null;
}
