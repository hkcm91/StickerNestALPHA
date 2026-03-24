/**
 * Canvas AI Context Builder (Rich)
 *
 * Builds a compact, AI-friendly snapshot of the current canvas state.
 * Used by on-canvas AI tools and the AI Agent widget to "see" the canvas.
 *
 * Target: < 4000 tokens for a canvas with 50 entities.
 *
 * @module canvas/core/ai
 * @layer L4A-1
 */

import type {
  CanvasEntity,
  Point2D,
  Size2D,
  BoundingBox2D,
} from '@sn/types';

/**
 * Compact entity summary for AI consumption.
 */
export interface AIEntitySummary {
  id: string;
  type: string;
  name?: string;
  position: Point2D;
  size: Size2D;
  /** Type-specific key properties (e.g., text content, widget ID) */
  properties?: Record<string, unknown>;
}

/**
 * Viewport snapshot for AI context.
 */
export interface AIViewportSnapshot {
  pan: Point2D;
  zoom: number;
  visibleBounds: BoundingBox2D;
}

/**
 * Entity count stats by type.
 */
export type AIEntityStats = Record<string, number>;

/**
 * Full canvas AI snapshot.
 */
export interface CanvasAISnapshot {
  /** Compact entity summaries (visible viewport entities first) */
  entities: AIEntitySummary[];
  /** Viewport state */
  viewport: AIViewportSnapshot;
  /** Currently selected entity IDs */
  selection: string[];
  /** Entity count stats by type */
  stats: AIEntityStats;
  /** Total entity count */
  totalEntities: number;
}

/**
 * Options for building AI context.
 */
export interface BuildAIContextOptions {
  /** Only include entities within/near the visible viewport (default: true) */
  viewportScoped?: boolean;
  /** Padding around viewport for scoping (in canvas units, default: 200) */
  viewportPadding?: number;
  /** Maximum number of entities to include (default: 50) */
  maxEntities?: number;
  /** Currently selected entity IDs */
  selectedEntityIds?: string[];
  /** Viewport state */
  viewport?: {
    pan: Point2D;
    zoom: number;
    screenWidth: number;
    screenHeight: number;
  };
}

/**
 * Extract compact summary from a canvas entity.
 */
function summarizeEntity(entity: CanvasEntity): AIEntitySummary {
  const summary: AIEntitySummary = {
    id: entity.id,
    type: entity.type,
    position: entity.transform?.position ?? { x: 0, y: 0 },
    size: entity.transform?.size ?? { width: 0, height: 0 },
  };

  if (entity.name) {
    summary.name = entity.name;
  }

  // Extract type-specific key properties (compact — only what AI needs)
  const props: Record<string, unknown> = {};
  const raw = entity as Record<string, unknown>;

  if (entity.type === 'text' && raw.content) {
    // Truncate long text to 100 chars
    const content = String(raw.content);
    props.content = content.length > 100 ? content.slice(0, 100) + '…' : content;
  }
  if (entity.type === 'widget' && raw.widgetId) {
    props.widgetId = raw.widgetId;
  }
  if (entity.type === 'sticker' && raw.src) {
    props.src = raw.src;
  }
  if (entity.type === 'shape' && raw.shapeType) {
    props.shapeType = raw.shapeType;
  }

  if (Object.keys(props).length > 0) {
    summary.properties = props;
  }

  return summary;
}

/**
 * Compute visible bounds from viewport state.
 */
function computeVisibleBounds(
  viewport: NonNullable<BuildAIContextOptions['viewport']>,
  padding: number,
): BoundingBox2D {
  const halfW = (viewport.screenWidth / viewport.zoom) / 2;
  const halfH = (viewport.screenHeight / viewport.zoom) / 2;
  return {
    min: {
      x: viewport.pan.x - halfW - padding,
      y: viewport.pan.y - halfH - padding,
    },
    max: {
      x: viewport.pan.x + halfW + padding,
      y: viewport.pan.y + halfH + padding,
    },
  };
}

/**
 * Check if an entity is within bounds.
 */
function isEntityInBounds(entity: CanvasEntity, bounds: BoundingBox2D): boolean {
  const pos = entity.transform?.position;
  if (!pos) return false;
  return (
    pos.x >= bounds.min.x &&
    pos.x <= bounds.max.x &&
    pos.y >= bounds.min.y &&
    pos.y <= bounds.max.y
  );
}

/**
 * Count entities by type.
 */
function countByType(entities: CanvasEntity[]): AIEntityStats {
  const counts: AIEntityStats = {};
  for (const e of entities) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}

/**
 * Build a compact, AI-friendly snapshot of the canvas state.
 *
 * @param allEntities - All entities on the canvas
 * @param options - Context building options
 * @returns CanvasAISnapshot suitable for inclusion in AI prompts
 */
export function buildCanvasAISnapshot(
  allEntities: CanvasEntity[],
  options: BuildAIContextOptions = {},
): CanvasAISnapshot {
  const {
    viewportScoped = true,
    viewportPadding = 200,
    maxEntities = 50,
    selectedEntityIds = [],
    viewport,
  } = options;

  // Compute viewport bounds
  const vp = viewport ?? { pan: { x: 0, y: 0 }, zoom: 1, screenWidth: 1920, screenHeight: 1080 };
  const visibleBounds = computeVisibleBounds(vp, viewportPadding);

  // Filter entities to visible viewport if scoped
  let filtered = allEntities.filter((e) => e.visible !== false);
  if (viewportScoped) {
    filtered = filtered.filter((e) => isEntityInBounds(e, visibleBounds));
  }

  // Sort: selected entities first, then by z-index
  filtered.sort((a, b) => {
    const aSelected = selectedEntityIds.includes(a.id) ? 0 : 1;
    const bSelected = selectedEntityIds.includes(b.id) ? 0 : 1;
    if (aSelected !== bSelected) return aSelected - bSelected;
    return (b.zIndex ?? 0) - (a.zIndex ?? 0);
  });

  // Limit to maxEntities
  const limited = filtered.slice(0, maxEntities);

  return {
    entities: limited.map(summarizeEntity),
    viewport: {
      pan: vp.pan,
      zoom: vp.zoom,
      visibleBounds,
    },
    selection: selectedEntityIds,
    stats: countByType(allEntities),
    totalEntities: allEntities.length,
  };
}

/**
 * Serialize a CanvasAISnapshot into a prompt-friendly string.
 */
export function serializeSnapshotForPrompt(snapshot: CanvasAISnapshot): string {
  const lines: string[] = [];

  lines.push(`Canvas: ${snapshot.totalEntities} entities total`);
  lines.push(`Viewport: center=(${Math.round(snapshot.viewport.pan.x)}, ${Math.round(snapshot.viewport.pan.y)}), zoom=${snapshot.viewport.zoom.toFixed(2)}`);

  if (snapshot.selection.length > 0) {
    lines.push(`Selected: ${snapshot.selection.join(', ')}`);
  }

  // Stats
  const statParts = Object.entries(snapshot.stats).map(([type, count]) => `${count} ${type}`);
  if (statParts.length > 0) {
    lines.push(`Types: ${statParts.join(', ')}`);
  }

  // Entities
  if (snapshot.entities.length > 0) {
    lines.push('');
    lines.push('Visible entities:');
    for (const e of snapshot.entities) {
      const label = e.name ? `${e.type} "${e.name}"` : e.type;
      const pos = `(${Math.round(e.position.x)}, ${Math.round(e.position.y)})`;
      const size = `${Math.round(e.size.width)}×${Math.round(e.size.height)}`;
      let line = `  [${e.id}] ${label} at ${pos} size ${size}`;
      if (e.properties) {
        const propStr = Object.entries(e.properties)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(', ');
        line += ` {${propStr}}`;
      }
      lines.push(line);
    }
  }

  return lines.join('\n');
}
