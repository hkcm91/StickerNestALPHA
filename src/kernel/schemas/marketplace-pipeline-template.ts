/**
 * Marketplace Pipeline Template — portable, distributable pipeline definitions
 *
 * A MarketplacePipelineTemplate is a canvas-independent snapshot of a pipeline
 * DAG that can be published to the marketplace and installed on any canvas.
 * This is distinct from `PipelineTemplate` in `kernel/pipeline/templates.ts`,
 * which represents internal pattern slots for one-click pipeline scaffolding.
 *
 * @module @sn/types/marketplace-pipeline-template
 */

import { z } from 'zod';

import { PipelineEdgeSchema, PipelineNodeSchema } from './pipeline';

// ─── Config Field Schema ─────────────────────────────────────────────

/**
 * A single user-configurable field exposed when installing a template.
 * These appear in the install-time config form.
 */
export const TemplateConfigFieldSchema = z.object({
  /** Human-readable label shown in the config form */
  label: z.string().min(1),
  /** Field value type */
  type: z.enum(['string', 'number', 'boolean', 'select']),
  /** Default value (optional) */
  default: z.unknown().optional(),
  /** Options for 'select' type fields */
  options: z.array(z.string()).optional(),
  /** Help text shown below the field */
  description: z.string().optional(),
  /** Whether the field must be filled before installation */
  required: z.boolean().default(true),
});

export type TemplateConfigField = z.infer<typeof TemplateConfigFieldSchema>;

// ─── Required Widget Dependency ──────────────────────────────────────

/**
 * A marketplace widget that must be installed for this template to function.
 */
export const TemplateRequiredWidgetSchema = z.object({
  /** Marketplace slug for lookup */
  marketplaceSlug: z.string().min(1),
  /** Marketplace widget ID for direct fetch (optional) */
  marketplaceId: z.string().optional(),
  /** Which template node IDs reference this widget */
  nodeIds: z.array(z.string().min(1)),
  /** Display name for the dependency resolution UI */
  name: z.string().min(1),
});

export type TemplateRequiredWidget = z.infer<typeof TemplateRequiredWidgetSchema>;

// ─── Marketplace Pipeline Template ───────────────────────────────────

/**
 * A portable pipeline definition for marketplace distribution.
 *
 * Contains the full DAG (nodes + edges) with template-scoped IDs,
 * a list of required widget dependencies, and a user-facing config
 * schema that gets mapped into node configs at install time.
 */
export const MarketplacePipelineTemplateSchema = z.object({
  /** Schema version for forward compatibility */
  formatVersion: z.literal(1),

  /** Pipeline DAG — nodes with template-scoped IDs and relative positions */
  nodes: z.array(PipelineNodeSchema),
  /** Pipeline DAG — edges referencing template-scoped node/port IDs */
  edges: z.array(PipelineEdgeSchema),

  /** Marketplace widgets that must be installed for this template to work */
  requiredWidgets: z.array(TemplateRequiredWidgetSchema).default([]),

  /**
   * User-facing config fields shown at install time.
   * Keys are config field names (e.g., "etsy_api_key").
   */
  configSchema: z.record(z.string(), TemplateConfigFieldSchema).default({}),

  /**
   * Maps config field keys to node config paths.
   * Format: `{ "etsy_api_key": "tpl-3.url" }` means the value of
   * config field "etsy_api_key" is written to the node with template
   * ID "tpl-3" at config key "url".
   */
  configMapping: z.record(z.string(), z.string()).default({}),

  /** Count of AI nodes in this template (for display purposes) */
  aiNodesCount: z.number().int().min(0).default(0),
  /** Human-readable estimated cost per execution (e.g., "~$0.01 per run") */
  estimatedCostPerRun: z.string().optional(),
});

export type MarketplacePipelineTemplate = z.infer<typeof MarketplacePipelineTemplateSchema>;

// ─── JSON Schema Export ──────────────────────────────────────────────

export const MarketplacePipelineTemplateJSONSchema =
  MarketplacePipelineTemplateSchema.toJSONSchema();
