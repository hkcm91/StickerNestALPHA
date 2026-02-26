/**
 * Pathfinder Widget - Configuration Schema
 *
 * Defines the Zod schema for widget configuration options.
 * These are user-configurable values shown in the Properties Panel.
 *
 * @module runtime/widgets/pathfinder
 */

import { z } from 'zod';

/**
 * Configuration schema for the Pathfinder widget.
 *
 * This schema is used for:
 * - Validation of user-provided config values
 * - Generating the config UI in the Properties Panel
 * - JSON schema export for the widget manifest
 */
export const pathfinderConfigSchema = z.object({
  /**
   * Widget title displayed in the header.
   * Leave empty to use the default widget name.
   */
  title: z
    .string()
    .max(100)
    .optional()
    .describe('Custom title for the widget'),

  /**
   * Primary accent color for the widget.
   * Overrides the theme accent if provided.
   */
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .describe('Custom accent color (hex format)'),

  /**
   * Whether to show debug information.
   * Only visible to widget owners/editors.
   */
  showDebugInfo: z
    .boolean()
    .default(false)
    .describe('Show debug information overlay'),

  /**
   * Auto-refresh interval in seconds.
   * Set to 0 to disable auto-refresh.
   */
  refreshInterval: z
    .number()
    .int()
    .min(0)
    .max(3600)
    .default(0)
    .describe('Auto-refresh interval in seconds (0 to disable)'),

  // Add more configuration options here as needed
  // Example:
  // maxItems: z.number().int().min(1).max(100).default(10),
  // displayMode: z.enum(['compact', 'expanded']).default('expanded'),
});

/**
 * TypeScript type inferred from the config schema.
 */
export type PathfinderConfig = z.infer<typeof pathfinderConfigSchema>;

/**
 * Default configuration values.
 */
export const pathfinderDefaultConfig: PathfinderConfig = {
  title: undefined,
  accentColor: undefined,
  showDebugInfo: false,
  refreshInterval: 0,
};

/**
 * Validate and parse configuration values.
 *
 * @param config - Raw config object from user input
 * @returns Validated config with defaults applied
 * @throws ZodError if validation fails
 */
export function parsePathfinderConfig(config: unknown): PathfinderConfig {
  return pathfinderConfigSchema.parse(config);
}

/**
 * Safely parse configuration, returning defaults on failure.
 *
 * @param config - Raw config object from user input
 * @returns Validated config or defaults if invalid
 */
export function safeParsePathfinderConfig(config: unknown): PathfinderConfig {
  const result = pathfinderConfigSchema.safeParse(config);
  return result.success ? result.data : pathfinderDefaultConfig;
}
