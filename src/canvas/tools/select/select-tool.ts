/**
 * Select Tool — click select, multi-select, marquee region select
 *
 * @module canvas/tools/select
 * @layer L4A-2
 */

import type { Point2D } from '@sn/types';
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

  function clearSelection() {
    selected.clear();
    bus.emit(CanvasEvents.SELECTION_CLEARED, {});
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
        if (!event.shiftKey) selected.clear();
        for (const entity of hits) {
          selected.add(entity.id);
          bus.emit(CanvasEvents.ENTITY_SELECTED, { id: entity.id });
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
              bus.emit(CanvasEvents.ENTITY_SELECTED, { id: entityId });
            }
          } else {
            selected.clear();
            selected.add(entityId);
            bus.emit(CanvasEvents.ENTITY_SELECTED, { id: entityId });
          }
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
