/**
 * Shape Tool — rectangle, ellipse, line creation via drag
 *
 * @module canvas/tools/shape
 * @layer L4A-2
 */

import type { Point2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { Tool, CanvasPointerEvent } from '../registry';

export type ShapeMode = 'rectangle' | 'ellipse' | 'line';

export function createShapeTool(shapeMode: ShapeMode, getMode: () => 'edit' | 'preview'): Tool {
  let startPosition: Point2D | null = null;

  return {
    name: shapeMode === 'rectangle' ? 'rect' : shapeMode === 'ellipse' ? 'ellipse' : 'line',

    onActivate() {},
    onDeactivate() {
      startPosition = null;
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;
      startPosition = event.canvasPosition;
    },

    onPointerMove() {},

    onPointerUp(event: CanvasPointerEvent) {
      if (getMode() !== 'edit' || !startPosition) return;

      const minX = Math.min(startPosition.x, event.canvasPosition.x);
      const minY = Math.min(startPosition.y, event.canvasPosition.y);
      const width = Math.max(1, Math.abs(event.canvasPosition.x - startPosition.x));
      const height = Math.max(1, Math.abs(event.canvasPosition.y - startPosition.y));

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'shape',
        shapeType: shapeMode,
        transform: {
          position: { x: minX, y: minY },
          size: { width, height },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        fill: null,
        stroke: '#000000',
        strokeWidth: 1,
        cornerRadius: 0,
      });

      startPosition = null;
    },

    cancel() {
      startPosition = null;
    },
  };
}
