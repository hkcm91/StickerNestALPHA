/**
 * Move Tool — entity drag and drop with optional snapping
 *
 * @module canvas/tools/move
 * @layer L4A-2
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createDragManager } from '../../core';
import type { SceneGraph } from '../../core';
import type { Tool, CanvasPointerEvent } from '../registry';

import { snapToGrid } from './snap';

export interface MoveToolOptions {
  gridSnap?: boolean;
  gridSize?: number;
}

export function createMoveTool(
  sceneGraph: SceneGraph,
  getMode: () => 'edit' | 'preview',
  options: MoveToolOptions = {},
): Tool {
  const dragManager = createDragManager(getMode);

  return {
    name: 'move',

    onActivate() {},
    onDeactivate() {
      dragManager.cancel();
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (!event.entityId) return;
      dragManager.onPointerDown(event.entityId, event.canvasPosition);
    },

    onPointerMove(event: CanvasPointerEvent) {
      dragManager.onPointerMove(event.canvasPosition);
    },

    onPointerUp(event: CanvasPointerEvent) {
      const state = dragManager.onPointerUp(event.canvasPosition);
      if (state.isDragging && state.entityId && state.delta) {
        const entity = sceneGraph.getEntity(state.entityId);
        if (entity) {
          let newPosition = {
            x: entity.transform.position.x + state.delta.x,
            y: entity.transform.position.y + state.delta.y,
          };
          if (options.gridSnap && options.gridSize) {
            newPosition = snapToGrid(newPosition, options.gridSize);
          }
          bus.emit(CanvasEvents.ENTITY_MOVED, { id: state.entityId, position: newPosition });
        }
      }
    },

    cancel() {
      dragManager.cancel();
    },
  };
}
