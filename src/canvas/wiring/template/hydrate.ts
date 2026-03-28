/**
 * Pipeline Template Hydration — instantiate a template onto a canvas
 *
 * Takes a MarketplacePipelineTemplate and produces a live Pipeline
 * with fresh UUIDs, resolved widget instance IDs, applied user config,
 * and canvas-specific positioning.
 *
 * @module canvas/wiring/template
 * @layer L4A-3
 */

import type {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  MarketplacePipelineTemplate,
} from '@sn/types';
import { PipelineSchema } from '@sn/types';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────

export interface HydrateOptions {
  /** Target canvas ID */
  canvasId: string;

  /**
   * Map of marketplace slug -> widget instance ID on the target canvas.
   * Every required widget must have an entry here.
   */
  widgetInstanceMapping: Map<string, string>;

  /**
   * User-provided config values. Keys match the template's configSchema.
   * Values are applied to node configs via configMapping.
   */
  configValues?: Record<string, unknown>;

  /**
   * Offset to apply to all node positions when placing on the canvas.
   * Useful for avoiding overlap with existing content.
   */
  positionOffset?: { x: number; y: number };
}

// ─── Hydrate Function ────────────────────────────────────────────────

/**
 * Hydrate a marketplace pipeline template into a live pipeline.
 *
 * - Generates fresh UUIDs for all nodes and edges
 * - Resolves widget nodes to actual widget instance IDs via `widgetInstanceMapping`
 * - Applies user config values via the template's `configMapping`
 * - Offsets node positions for canvas placement
 * - Validates the result against `PipelineSchema`
 *
 * @throws Error if a required widget has no entry in `widgetInstanceMapping`
 * @throws Error if a required config field has no value provided
 * @throws Error if the produced pipeline fails schema validation
 */
export function hydratePipelineTemplate(
  template: MarketplacePipelineTemplate,
  options: HydrateOptions,
): Pipeline {
  const { canvasId, widgetInstanceMapping, configValues, positionOffset } = options;

  // Build slug -> nodeIds lookup from requiredWidgets
  const slugToNodeIds = new Map<string, Set<string>>();
  for (const req of template.requiredWidgets) {
    slugToNodeIds.set(req.marketplaceSlug, new Set(req.nodeIds));
  }

  // Build slug -> widgetInstanceId lookup and validate all required widgets are mapped
  for (const req of template.requiredWidgets) {
    if (!widgetInstanceMapping.has(req.marketplaceSlug)) {
      throw new Error(
        `Required widget "${req.name}" (slug: ${req.marketplaceSlug}) is not mapped. ` +
        `Provide an entry in widgetInstanceMapping.`,
      );
    }
  }

  // Validate required config fields
  const configSchemaEntries = Object.entries(template.configSchema);
  for (const [key, field] of configSchemaEntries) {
    const isRequired = field.required !== false;
    const hasValue = configValues && key in configValues && configValues[key] !== undefined;
    const hasDefault = field.default !== undefined;
    if (isRequired && !hasValue && !hasDefault) {
      throw new Error(
        `Required config field "${key}" (${field.label}) has no value provided and no default.`,
      );
    }
  }

  // Build ID remap: template node ID -> fresh UUID
  const nodeIdRemap = new Map<string, string>();
  for (const node of template.nodes) {
    nodeIdRemap.set(node.id, uuidv4());
  }

  // Build reverse lookup: template node ID -> marketplace slug (for widget resolution)
  const nodeIdToSlug = new Map<string, string>();
  for (const [slug, nodeIds] of slugToNodeIds) {
    for (const nodeId of nodeIds) {
      nodeIdToSlug.set(nodeId, slug);
    }
  }

  const offset = positionOffset ?? { x: 0, y: 0 };

  // Hydrate nodes
  const hydratedNodes: PipelineNode[] = template.nodes.map((node) => {
    const newId = nodeIdRemap.get(node.id)!;

    const hydrated: PipelineNode = {
      ...node,
      id: newId,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      },
      config: node.config ? { ...node.config } : undefined,
    };

    // Resolve widget instance ID
    if (node.type === 'widget') {
      const slug = nodeIdToSlug.get(node.id);
      if (slug) {
        hydrated.widgetInstanceId = widgetInstanceMapping.get(slug);
      }
    }

    return hydrated;
  });

  // Apply config values via configMapping
  if (configValues && template.configMapping) {
    for (const [fieldKey, path] of Object.entries(template.configMapping)) {
      const value = configValues[fieldKey] ?? template.configSchema[fieldKey]?.default;
      if (value === undefined) continue;

      const dotIndex = path.indexOf('.');
      if (dotIndex === -1) continue;

      const templateNodeId = path.slice(0, dotIndex);
      const configKey = path.slice(dotIndex + 1);
      const newNodeId = nodeIdRemap.get(templateNodeId);
      if (!newNodeId) continue;

      const targetNode = hydratedNodes.find((n) => n.id === newNodeId);
      if (targetNode) {
        if (!targetNode.config) targetNode.config = {};
        targetNode.config[configKey] = value;
      }
    }
  }

  // Hydrate edges
  const hydratedEdges: PipelineEdge[] = template.edges.map((edge) => ({
    id: uuidv4(),
    sourceNodeId: nodeIdRemap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
    sourcePortId: edge.sourcePortId,
    targetNodeId: nodeIdRemap.get(edge.targetNodeId) ?? edge.targetNodeId,
    targetPortId: edge.targetPortId,
  }));

  // Build and validate pipeline
  const now = new Date().toISOString();
  const pipeline = PipelineSchema.parse({
    id: uuidv4(),
    canvasId,
    nodes: hydratedNodes,
    edges: hydratedEdges,
    createdAt: now,
    updatedAt: now,
  });

  return pipeline;
}
