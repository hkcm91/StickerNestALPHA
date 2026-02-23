/**
 * AI Integration Handler
 *
 * Proxies AI generation requests from widgets to the Supabase
 * Edge Function, which holds the Replicate API key.
 *
 * @module runtime/integrations
 * @layer L3
 */

import { z } from 'zod';

import { supabase } from '../../kernel/supabase/client';

import type { IntegrationHandler } from './integration-proxy';

/**
 * Request shape from widgets.
 */
const AiQueryParamsSchema = z.object({
  action: z.literal('generate-image'),
  model: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
});

/**
 * Response shape from the edge function.
 */
const AiResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      output: z.union([z.string(), z.array(z.string())]),
      id: z.string(),
      status: z.string(),
    })
    .optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});

/**
 * Creates an AI integration handler that proxies requests
 * to the `ai-generate` Supabase Edge Function.
 */
export function createAiHandler(): IntegrationHandler {
  return {
    async query(params: unknown): Promise<unknown> {
      const parsed = AiQueryParamsSchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(
          `Invalid AI query params: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        );
      }

      const { action, model, input } = parsed.data;

      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: { action, model, input },
      });

      if (error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }

      const response = AiResponseSchema.safeParse(data);
      if (!response.success) {
        throw new Error('AI generation returned an unexpected response format');
      }

      if (!response.data.success) {
        throw new Error(response.data.error ?? 'AI generation failed');
      }

      return response.data.data;
    },

    async mutate(): Promise<unknown> {
      throw new Error(
        'AI integration does not support mutate. Use query() for generation.',
      );
    },
  };
}
