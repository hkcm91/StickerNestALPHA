/**
 * Pen Tool — freehand drawing
 *
 * @module canvas/tools/pen
 * @layer L4A-2
 */

import type { Point2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createPenTool(getMode: () => 'edit' | 'preview'): Tool {
  let isDrawing = false;
  let points: Point2D[] = [];

  return {
    name: 'pen',

    onActivate() {},
    onDeactivate() {
      isDrawing = false;
      points = [];
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;
      isDrawing = true;
      points = [event.canvasPosition];
    },

    onPointerMove(event: CanvasPointerEvent) {
      if (!isDrawing || getMode() !== 'edit') return;
      points.push(event.canvasPosition);
    },

    onPointerUp(_event: CanvasPointerEvent) {
      if (!isDrawing || points.length < 2) {
        isDrawing = false;
        points = [];
        return;
      }

      const minX = Math.min(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxX = Math.max(...points.map((p) => p.x));
      const maxY = Math.max(...points.map((p) => p.y));

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'drawing',
        transform: {
          position: { x: minX, y: minY },
          size: { width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        points,
        stroke: '#000000',
        strokeWidth: 2,
        smoothing: 0.5,
      });

      isDrawing = false;
      points = [];
    },

    cancel() {
      isDrawing = false;
      points = [];
    },
  };
}
