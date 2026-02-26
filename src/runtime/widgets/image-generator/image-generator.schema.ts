import { z } from 'zod';

/**
 * Image Generator Widget configuration schema.
 */
export const imageGeneratorConfigSchema = z.object({
  /** Initial prompt if any */
  initialPrompt: z.string().optional(),
  /** Default AI model to use */
  defaultModel: z.string().default('black-forest-labs/flux-schnell'),
  /** Whether to show advanced options */
  showAdvanced: z.boolean().default(false),
  /** Enable debug logging */
  showDebugInfo: z.boolean().default(false),
});

/**
 * Inferred configuration type.
 */
export type ImageGeneratorConfig = z.infer<typeof imageGeneratorConfigSchema>;
