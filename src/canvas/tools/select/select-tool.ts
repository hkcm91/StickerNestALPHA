/**
 * Select Tool — click select, multi-select, marquee region select
 *
 * @module canvas/tools/select
 * @layer L4A-2
 */

import type { Point2D, CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { SceneGraph } from '../../core';
import { hitTestPoint, hitTestRegion } from '../../core';
import type { Tool, CanvasPointerEvent, CanvasKeyEvent } from '../registry';

const DRAG_THRESHOLD = 4;

export interface SelectTool extends Tool {
  getSelection(): ReadonlySet<string>;
}

export function createSelectTool(sceneGraph: SceneGraph): SelectTool {
  const selected = new Set<string>();
  let isMarquee = false;
  let marqueeStart: Point2D | null = null;

  /** Emit batch selection event with full entity data for widgets */
  function emitSelectionChanged() {
    const entities: CanvasEntity[] = [];
    for (const id of selected) {
      const entity = sceneGraph.getEntity(id);
      if (entity) {
        entities.push(entity);
      }
    }
    const payload = { entities };
    // Emit to canvas namespace for internal use
    bus.emit(CanvasEvents.ENTITY_SELECTED, payload);
    // Also emit to widget namespace so widgets can subscribe
    bus.emit(`widget.${CanvasEvents.ENTITY_SELECTED}`, payload);
  }

  function clearSelection() {
    selected.clear();
    bus.emit(CanvasEvents.SELECTION_CLEARED, {});
    // Also emit to widget namespace so widgets can subscribe
    bus.emit(`widget.${CanvasEvents.SELECTION_CLEARED}`, {});
  }

  const tool: SelectTool = {
    name: 'select',

    onActivate() {},
    onDeactivate() {
      tool.cancel();
    },

    onPointerDown(event: CanvasPointerEvent) {
      marqueeStart = event.canvasPosition;
      isMarquee = false;
    },

    onPointerMove(event: CanvasPointerEvent) {
      if (!marqueeStart) return;
      const dx = event.canvasPosition.x - marqueeStart.x;
      const dy = event.canvasPosition.y - marqueeStart.y;
      if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
        isMarquee = true;
      }
    },

    onPointerUp(event: CanvasPointerEvent) {
      if (isMarquee && marqueeStart) {
        const region = {
          min: {
            x: Math.min(marqueeStart.x, event.canvasPosition.x),
            y: Math.min(marqueeStart.y, event.canvasPosition.y),
          },
          max: {
            x: Math.max(marqueeStart.x, event.canvasPosition.x),
            y: Math.max(marqueeStart.y, event.canvasPosition.y),
          },
        };
        const hits = hitTestRegion(sceneGraph, region);
        if (event.shiftKey) {
          for (const entity of hits) {
            selected.add(entity.id);
          }
          emitSelectionChanged();
        } else if (hits.length > 0) {
          selected.clear();
          const topMost = hits.reduce((best, current) => {
            if (!best) return current;
            return current.zIndex > best.zIndex ? current : best;
          }, hits[0]);
          selected.add(topMost.id);
          emitSelectionChanged();
        } else {
          clearSelection();
        }
      } else {
        // Click selection
        if (event.entityId) {
          const hit = hitTestPoint(sceneGraph, event.canvasPosition);
          const entityId = hit?.id ?? event.entityId;
          if (event.shiftKey) {
            if (selected.has(entityId)) {
              selected.delete(entityId);
              bus.emit(CanvasEvents.ENTITY_DESELECTED, { id: entityId });
            } else {
              selected.add(entityId);
            }
          } else {
            selected.clear();
            selected.add(entityId);
          }
          emitSelectionChanged();
        } else {
          clearSelection();
        }
      }
      marqueeStart = null;
      isMarquee = false;
    },

    onKeyDown(event: CanvasKeyEvent) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        for (const id of selected) {
          bus.emit(CanvasEvents.ENTITY_DELETED, { id });
        }
        selected.clear();
      }
    },

    cancel() {
      marqueeStart = null;
      isMarquee = false;
    },

    getSelection() {
      return selected;
    },
  };

  return tool;
}
