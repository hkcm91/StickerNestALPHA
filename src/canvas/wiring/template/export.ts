/**
 * Pipeline Template Export — convert a live pipeline into a portable template
 *
 * Takes a canvas-bound Pipeline and produces a MarketplacePipelineTemplate
 * with template-scoped IDs, stripped instance references, and a declared
 * set of widget dependencies.
 *
 * @module canvas/wiring/template
 * @layer L4A-3
 */

import type {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  MarketplacePipelineTemplate,
  TemplateConfigField,
  TemplateRequiredWidget,
} from '@sn/types';
import { MarketplacePipelineTemplateSchema } from '@sn/types';

// ─── Types ───────────────────────────────────────────────────────────

/** Resolution info for a widget node's marketplace listing */
export interface WidgetResolutionEntry {
  marketplaceSlug: string;
  marketplaceId?: string;
  name: string;
}

export interface ExportOptions {
  /**
   * Map of widgetInstanceId -> marketplace resolution info.
   * Every widget-type node in the pipeline must have an entry here.
   */
  widgetResolution: Map<string, WidgetResolutionEntry>;

  /**
   * User-facing config fields to expose at install time.
   * Keys are field names (e.g., "etsy_api_key").
   */
  configSchema?: Record<string, TemplateConfigField>;

  /**
   * Maps config field keys to "nodeId.configKey" paths.
   * Uses the ORIGINAL pipeline node IDs (before remapping).
   * Example: { "etsy_api_key": "abc-123.url" }
   */
  configMapping?: Record<string, string>;

  /** Human-readable cost estimate (e.g., "~$0.01 per run") */
  estimatedCostPerRun?: string;
}

// ─── AI Node Detection ───────────────────────────────────────────────

const AI_NODE_TYPES = new Set([
  'ai-prompt',
  'ai-generate',
  'ai-transform',
  'ai-action',
  'ai-create-entity',
]);

// ─── Export Function ─────────────────────────────────────────────────

/**
 * Export a live pipeline as a portable marketplace template.
 *
 * - Replaces all node/edge IDs with template-scoped IDs (`tpl-0`, `tpl-1`, ...)
 * - Strips `widgetInstanceId` from widget nodes and records dependencies
 * - Groups widget nodes by marketplace slug into `requiredWidgets`
 * - Remaps `configMapping` paths from original node IDs to template IDs
 * - Validates the result against `MarketplacePipelineTemplateSchema`
 *
 * @throws Error if a widget node has no entry in `widgetResolution`
 * @throws Error if the produced template fails schema validation
 */
export function exportPipelineAsTemplate(
  pipeline: Pipeline,
  options: ExportOptions,
): MarketplacePipelineTemplate {
  const { widgetResolution, configSchema, configMapping, estimatedCostPerRun } = options;

  // Build ID remap: original node ID -> template-scoped ID
  const nodeIdRemap = new Map<string, string>();
  pipeline.nodes.forEach((node, index) => {
    nodeIdRemap.set(node.id, `tpl-${index}`);
  });

  // Build edge ID remap
  const edgeIdRemap = new Map<string, string>();
  pipeline.edges.forEach((edge, index) => {
    edgeIdRemap.set(edge.id, `tpl-e${index}`);
  });

  // Track widget dependencies: marketplace slug -> { entry, nodeIds }
  const widgetDeps = new Map<string, { entry: WidgetResolutionEntry; nodeIds: string[] }>();

  // Remap nodes
  const templateNodes: PipelineNode[] = pipeline.nodes.map((node) => {
    const templateId = nodeIdRemap.get(node.id)!;

    const remapped: PipelineNode = {
      ...node,
      id: templateId,
      // Config is preserved (will be partially cleared below if in configMapping)
      config: node.config ? { ...node.config } : undefined,
    };

    // Handle widget nodes: strip instance ID, record dependency
    if (node.type === 'widget' && node.widgetInstanceId) {
      const resolution = widgetResolution.get(node.widgetInstanceId);
      if (!resolution) {
        throw new Error(
          `Widget node "${node.id}" has widgetInstanceId "${node.widgetInstanceId}" ` +
          `but no entry in widgetResolution. All widget nodes must be mapped.`,
        );
      }

      // Record dependency
      const existing = widgetDeps.get(resolution.marketplaceSlug);
      if (existing) {
        existing.nodeIds.push(templateId);
      } else {
        widgetDeps.set(resolution.marketplaceSlug, {
          entry: resolution,
          nodeIds: [templateId],
        });
      }

      // Strip widgetInstanceId — will be resolved at install time
      remapped.widgetInstanceId = undefined;
    }

    return remapped;
  });

  // Remap edges
  const templateEdges: PipelineEdge[] = pipeline.edges.map((edge, index) => ({
    id: `tpl-e${index}`,
    sourceNodeId: nodeIdRemap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
    sourcePortId: edge.sourcePortId,
    targetNodeId: nodeIdRemap.get(edge.targetNodeId) ?? edge.targetNodeId,
    targetPortId: edge.targetPortId,
  }));

  // Build requiredWidgets array
  const requiredWidgets: TemplateRequiredWidget[] = Array.from(widgetDeps.values()).map(
    ({ entry, nodeIds }) => ({
      marketplaceSlug: entry.marketplaceSlug,
      marketplaceId: entry.marketplaceId,
      nodeIds,
      name: entry.name,
    }),
  );

  // Remap configMapping from original node IDs to template IDs
  const remappedConfigMapping: Record<string, string> = {};
  if (configMapping) {
    for (const [fieldKey, path] of Object.entries(configMapping)) {
      const dotIndex = path.indexOf('.');
      if (dotIndex === -1) {
        throw new Error(
          `Invalid configMapping path "${path}" for field "${fieldKey}". ` +
          `Expected format "nodeId.configKey".`,
        );
      }
      const originalNodeId = path.slice(0, dotIndex);
      const configKey = path.slice(dotIndex + 1);
      const templateNodeId = nodeIdRemap.get(originalNodeId);
      if (!templateNodeId) {
        throw new Error(
          `configMapping field "${fieldKey}" references node "${originalNodeId}" ` +
          `which does not exist in the pipeline.`,
        );
      }
      remappedConfigMapping[fieldKey] = `${templateNodeId}.${configKey}`;
    }

    // Clear config values for mapped fields so buyers fill them in
    for (const path of Object.values(remappedConfigMapping)) {
      const dotIndex = path.indexOf('.');
      const templateNodeId = path.slice(0, dotIndex);
      const configKey = path.slice(dotIndex + 1);
      const node = templateNodes.find((n) => n.id === templateNodeId);
      if (node?.config && configKey in node.config) {
        node.config[configKey] = undefined;
      }
    }
  }

  // Count AI nodes
  const aiNodesCount = templateNodes.filter((n) => AI_NODE_TYPES.has(n.type)).length;

  // Build and validate
  const template = MarketplacePipelineTemplateSchema.parse({
    formatVersion: 1 as const,
    nodes: templateNodes,
    edges: templateEdges,
    requiredWidgets,
    configSchema: configSchema ?? {},
    configMapping: remappedConfigMapping,
    aiNodesCount,
    estimatedCostPerRun,
  });

  return template;
}
