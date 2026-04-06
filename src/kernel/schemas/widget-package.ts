/**
 * Widget Package schemas (.zip format) and sample widget registry entries
 * @module @sn/types/widget-package
 */

import { z } from 'zod';

import { WidgetManifestSchema } from './widget-manifest';

/**
 * Widget package contents schema
 *
 * @remarks
 * Represents the unpacked contents of a widget .zip package.
 * Used by the Lab publish pipeline and Marketplace install flow.
 */
export const WidgetPackageContentsSchema = z.object({
  /** Validated widget manifest */
  manifest: WidgetManifestSchema,
  /** Raw HTML source of the widget (single-file format) */
  htmlContent: z.string(),
  /** Optional README text included in the package */
  readme: z.string().optional(),
  /** True if the manifest was auto-generated (e.g., by AI inference) rather than provided by the author */
  manifestGenerated: z.boolean().default(false),
  /** AI confidence score for the auto-generated manifest (0–1); undefined when manifestGenerated is false */
  manifestConfidence: z.number().min(0).max(1).optional(),
});

export type WidgetPackageContents = z.infer<typeof WidgetPackageContentsSchema>;

/**
 * Sample widget registry entry schema
 *
 * @remarks
 * Represents a curated sample widget available for creators to load into
 * Widget Lab. Sample widgets are read-only references — they are not
 * installed as marketplace widgets.
 */
export const SampleWidgetEntrySchema = z.object({
  /** Unique identifier for this sample entry */
  id: z.string(),
  /** Display name of the sample widget */
  name: z.string(),
  /** Short description of what the sample widget demonstrates */
  description: z.string(),
  /** Skill level this sample targets */
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  /** List of SDK features or concepts demonstrated by this sample */
  features: z.array(z.string()),
  /** URL to the .zip package for this sample widget */
  zipUrl: z.string().optional(),
  /** URL to a single .html file for this sample widget */
  htmlUrl: z.string().optional(),
});

export type SampleWidgetEntry = z.infer<typeof SampleWidgetEntrySchema>;

/**
 * JSON Schema exports for external validation
 */
export const WidgetPackageContentsJSONSchema = WidgetPackageContentsSchema.toJSONSchema();
export const SampleWidgetEntryJSONSchema = SampleWidgetEntrySchema.toJSONSchema();
