/**
 * Minimap Controller — bird's-eye overview panel
 *
 * Maintains a scaled-down representation of all entities and the current
 * viewport rectangle. Supports click-to-teleport and drag-to-pan.
 *
 * @module canvas/panels/minimap
 * @layer L4A-4
 */

import type { Point2D, BoundingBox2D } from '@sn/types';

// Note: bus import reserved for future event emission (e.g., minimap.teleport)
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MinimapEntity {
  id: string;
  bounds: BoundingBox2D;
  color: string;
}

export interface MinimapViewport {
  bounds: BoundingBox2D;
}

export interface MinimapState {
  /** All tracked entities */
  entities: ReadonlyArray<MinimapEntity>;
  /** Current viewport rectangle in canvas space */
  viewport: MinimapViewport;
  /** Combined bounds of all entities (or null if empty) */
  worldBounds: BoundingBox2D | null;
  /** Whether the minimap is collapsed */
  collapsed: boolean;
  /** Minimap render dimensions */
  width: number;
  height: number;
}

export interface MinimapController {
  /** Get current minimap state */
  getState(): MinimapState;
  /** Add or update an entity */
  upsertEntity(id: string, bounds: BoundingBox2D, color?: string): void;
  /** Remove an entity */
  removeEntity(id: string): void;
  /** Clear all entities */
  clearEntities(): void;
  /** Update the viewport rectangle */
  updateViewport(bounds: BoundingBox2D): void;
  /** Handle click on minimap — returns the canvas-space point to navigate to */
  handleClick(minimapPosition: Point2D): Point2D | null;
  /** Handle drag delta on the viewport rectangle — returns the pan delta in canvas space */
  handleViewportDrag(minimapDelta: Point2D): Point2D | null;
  /** Toggle collapsed state */
  toggleCollapsed(): void;
  /** Whether the minimap should be visible (edit mode only) */
  isActiveInMode(): boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
const DEFAULT_ENTITY_COLOR = '#6366f1'; // indigo

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createMinimapController(
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
): MinimapController {
  const entities = new Map<string, MinimapEntity>();
  let viewportBounds: BoundingBox2D = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
  let collapsed = false;

  function computeWorldBounds(): BoundingBox2D | null {
    if (entities.size === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const e of entities.values()) {
      if (e.bounds.min.x < minX) minX = e.bounds.min.x;
      if (e.bounds.min.y < minY) minY = e.bounds.min.y;
      if (e.bounds.max.x > maxX) maxX = e.bounds.max.x;
      if (e.bounds.max.y > maxY) maxY = e.bounds.max.y;
    }

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  }

  /**
   * Compute the transform from canvas space to minimap space.
   * Returns {scale, offsetX, offsetY} such that:
   *   minimapX = (canvasX - offsetX) * scale
   *   minimapY = (canvasY - offsetY) * scale
   */
  function computeMinimapTransform(): { scale: number; offsetX: number; offsetY: number } | null {
    const world = computeWorldBounds();
    if (!world) return null;

    // Expand world bounds to include the viewport
    const expandedMin = {
      x: Math.min(world.min.x, viewportBounds.min.x),
      y: Math.min(world.min.y, viewportBounds.min.y),
    };
    const expandedMax = {
      x: Math.max(world.max.x, viewportBounds.max.x),
      y: Math.max(world.max.y, viewportBounds.max.y),
    };

    const contentW = expandedMax.x - expandedMin.x;
    const contentH = expandedMax.y - expandedMin.y;

    if (contentW <= 0 || contentH <= 0) return null;

    const padding = 10; // minimap padding in px
    const availW = width - padding * 2;
    const availH = height - padding * 2;

    const scale = Math.min(availW / contentW, availH / contentH);

    return {
      scale,
      offsetX: expandedMin.x - padding / scale,
      offsetY: expandedMin.y - padding / scale,
    };
  }

  return {
    getState(): MinimapState {
      return {
        entities: [...entities.values()],
        viewport: { bounds: viewportBounds },
        worldBounds: computeWorldBounds(),
        collapsed,
        width,
        height,
      };
    },

    upsertEntity(id, bounds, color) {
      entities.set(id, { id, bounds, color: color ?? DEFAULT_ENTITY_COLOR });
    },

    removeEntity(id) {
      entities.delete(id);
    },

    clearEntities() {
      entities.clear();
    },

    updateViewport(bounds) {
      viewportBounds = bounds;
    },

    handleClick(minimapPosition: Point2D): Point2D | null {
      const transform = computeMinimapTransform();
      if (!transform) return null;

      // Convert minimap position to canvas space
      return {
        x: minimapPosition.x / transform.scale + transform.offsetX,
        y: minimapPosition.y / transform.scale + transform.offsetY,
      };
    },

    handleViewportDrag(minimapDelta: Point2D): Point2D | null {
      const transform = computeMinimapTransform();
      if (!transform) return null;

      // Convert minimap delta to canvas-space delta
      return {
        x: minimapDelta.x / transform.scale,
        y: minimapDelta.y / transform.scale,
      };
    },

    toggleCollapsed() {
      collapsed = !collapsed;
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
