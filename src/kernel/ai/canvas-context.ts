/**
 * AI Canvas Context Builder
 *
 * Builds a compact, token-efficient snapshot of the canvas state
 * for AI reasoning. Reads from L0 stores only.
 *
 * @module kernel/ai
 */

import type {
  AICanvasContext,
  AIEntitySnapshot,
  AISpatialRelation,
  AIViewportSnapshot,
  CanvasEntity,
} from '@sn/types';

import { useCanvasStore } from '../stores/canvas';
import { useWidgetStore } from '../stores/widget';

// ---------------------------------------------------------------------------
// Viewport helpers
// ---------------------------------------------------------------------------

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  screenWidth: number;
  screenHeight: number;
}

function buildViewportSnapshot(vp: ViewportState): AIViewportSnapshot {
  return {
    centerX: vp.x,
    centerY: vp.y,
    zoom: vp.zoom,
    visibleWidth: vp.screenWidth / vp.zoom,
    visibleHeight: vp.screenHeight / vp.zoom,
  };
}

// ---------------------------------------------------------------------------
// Entity snapshot
// ---------------------------------------------------------------------------

function entityToSnapshot(entity: CanvasEntity): AIEntitySnapshot {
  const snap: AIEntitySnapshot = {
    id: entity.id,
    type: entity.type,
    x: entity.transform.position.x,
    y: entity.transform.position.y,
    w: entity.transform.size.width,
    h: entity.transform.size.height,
    z: entity.zIndex,
  };

  if (entity.name) snap.name = entity.name;

  // Extract type-specific properties (keep it compact)
  const props: Record<string, unknown> = {};

  switch (entity.type) {
    case 'sticker':
      props.assetUrl = entity.assetUrl;
      props.assetType = entity.assetType;
      if (entity.altText) props.altText = entity.altText;
      break;
    case 'text':
      props.content = entity.content;
      props.fontSize = entity.fontSize;
      props.color = entity.color;
      break;
    case 'widget':
      props.widgetId = entity.widgetId;
      props.widgetInstanceId = entity.widgetInstanceId;
      if (Object.keys(entity.config).length > 0) props.config = entity.config;
      break;
    case 'shape':
      props.shapeType = entity.shapeType;
      props.fill = entity.fill;
      props.stroke = entity.stroke;
      break;
    case 'group':
    case 'docker':
      props.children = entity.children;
      break;
    case 'audio':
      props.assetUrl = entity.assetUrl;
      break;
    case 'svg':
      props.assetUrl = entity.assetUrl;
      break;
    default:
      break;
  }

  if (Object.keys(props).length > 0) snap.props = props;

  return snap;
}

// ---------------------------------------------------------------------------
// Spatial relationship detection
// ---------------------------------------------------------------------------

const ADJACENCY_THRESHOLD = 50; // px gap to consider "adjacent"
const NEARBY_THRESHOLD = 200;   // px gap to consider "nearby"

interface BBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
}

function entityBBox(s: AIEntitySnapshot): BBox {
  return {
    left: s.x,
    right: s.x + s.w,
    top: s.y,
    bottom: s.y + s.h,
    cx: s.x + s.w / 2,
    cy: s.y + s.h / 2,
  };
}

function overlaps(a: BBox, b: BBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function contains(outer: BBox, inner: BBox): boolean {
  return outer.left <= inner.left && outer.right >= inner.right &&
         outer.top <= inner.top && outer.bottom >= inner.bottom;
}

function bboxDistance(a: BBox, b: BBox): number {
  const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
  const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
  return Math.sqrt(dx * dx + dy * dy);
}

function computeRelations(
  snapshots: AIEntitySnapshot[],
  maxRelations: number = 50,
): AISpatialRelation[] {
  const relations: AISpatialRelation[] = [];

  for (let i = 0; i < snapshots.length && relations.length < maxRelations; i++) {
    const a = snapshots[i];
    const bboxA = entityBBox(a);

    for (let j = i + 1; j < snapshots.length && relations.length < maxRelations; j++) {
      const b = snapshots[j];
      const bboxB = entityBBox(b);

      if (contains(bboxA, bboxB)) {
        relations.push({ from: a.id, to: b.id, relation: 'contains' });
        relations.push({ from: b.id, to: a.id, relation: 'contained_by' });
      } else if (contains(bboxB, bboxA)) {
        relations.push({ from: b.id, to: a.id, relation: 'contains' });
        relations.push({ from: a.id, to: b.id, relation: 'contained_by' });
      } else if (overlaps(bboxA, bboxB)) {
        relations.push({ from: a.id, to: b.id, relation: 'overlaps' });
      } else {
        const dist = bboxDistance(bboxA, bboxB);
        if (dist <= ADJACENCY_THRESHOLD) {
          // Determine direction
          if (bboxA.right <= bboxB.left + ADJACENCY_THRESHOLD && Math.abs(bboxA.cy - bboxB.cy) < (bboxA.bottom - bboxA.top + bboxB.bottom - bboxB.top) / 2) {
            relations.push({ from: a.id, to: b.id, relation: 'adjacent_right', distance: Math.round(dist) });
          } else if (bboxB.right <= bboxA.left + ADJACENCY_THRESHOLD && Math.abs(bboxA.cy - bboxB.cy) < (bboxA.bottom - bboxA.top + bboxB.bottom - bboxB.top) / 2) {
            relations.push({ from: a.id, to: b.id, relation: 'adjacent_left', distance: Math.round(dist) });
          } else if (bboxA.bottom <= bboxB.top + ADJACENCY_THRESHOLD) {
            relations.push({ from: a.id, to: b.id, relation: 'adjacent_below', distance: Math.round(dist) });
          } else {
            relations.push({ from: a.id, to: b.id, relation: 'adjacent_above', distance: Math.round(dist) });
          }
        } else if (dist <= NEARBY_THRESHOLD) {
          relations.push({ from: a.id, to: b.id, relation: 'nearby', distance: Math.round(dist) });
        }
      }
    }
  }

  return relations;
}

// ---------------------------------------------------------------------------
// Viewport filtering
// ---------------------------------------------------------------------------

function isInViewport(snap: AIEntitySnapshot, vp: AIViewportSnapshot): boolean {
  const halfW = vp.visibleWidth / 2;
  const halfH = vp.visibleHeight / 2;
  const left = vp.centerX - halfW;
  const right = vp.centerX + halfW;
  const top = vp.centerY - halfH;
  const bottom = vp.centerY + halfH;

  return (
    snap.x + snap.w > left &&
    snap.x < right &&
    snap.y + snap.h > top &&
    snap.y < bottom
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuildCanvasAIContextOptions {
  /** Only include entities visible in the current viewport */
  viewportOnly?: boolean;
  /** Maximum number of entities to include (default: 100) */
  maxEntities?: number;
  /** Maximum spatial relations to compute (default: 50) */
  maxRelations?: number;
  /** Entity list — pass externally to avoid coupling to canvas core scene graph */
  entities?: CanvasEntity[];
  /** Viewport state — pass externally to avoid coupling to canvas core viewport */
  viewport?: ViewportState;
}

/**
 * Builds a compact AI-readable canvas context snapshot.
 *
 * Designed to be token-efficient for LLM consumption. Includes entity
 * positions, type-specific properties, and spatial relationships.
 *
 * @param options - Configuration for what to include
 * @returns AICanvasContext snapshot
 */
export function buildCanvasAIContext(
  options: BuildCanvasAIContextOptions = {},
): AICanvasContext {
  const {
    viewportOnly = false,
    maxEntities = 100,
    maxRelations = 50,
    entities = [],
    viewport = { x: 0, y: 0, zoom: 1, screenWidth: 1920, screenHeight: 1080 },
  } = options;

  const canvasState = useCanvasStore.getState();
  const widgetState = useWidgetStore.getState();

  const vpSnapshot = buildViewportSnapshot(viewport);

  // Convert entities to snapshots
  let snapshots = entities.map(entityToSnapshot);

  // Filter to viewport if requested
  if (viewportOnly) {
    snapshots = snapshots.filter((s) => isInViewport(s, vpSnapshot));
  }

  const totalEntities = snapshots.length;

  // Limit entity count
  if (snapshots.length > maxEntities) {
    // Sort by z-index (topmost first) and take the top N
    snapshots.sort((a, b) => b.z - a.z);
    snapshots = snapshots.slice(0, maxEntities);
  }

  // Compute spatial relations
  const relations = computeRelations(snapshots, maxRelations);

  // Available widgets
  const availableWidgets = Object.values(widgetState.registry).map((entry) => ({
    widgetId: entry.widgetId,
    name: entry.manifest?.name ?? entry.widgetId,
    category: entry.manifest?.category,
  }));

  return {
    canvasId: canvasState.activeCanvasId ?? 'unknown',
    canvasName: canvasState.canvasMeta?.name,
    viewport: vpSnapshot,
    entities: snapshots,
    relations,
    availableWidgets: availableWidgets.length > 0 ? availableWidgets : undefined,
    totalEntities,
    timestamp: new Date().toISOString(),
  };
}
