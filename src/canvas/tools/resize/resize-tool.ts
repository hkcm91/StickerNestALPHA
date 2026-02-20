/**
 * Resize Tool — handle-based entity resize
 *
 * @module canvas/tools/resize
 * @layer L4A-2
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createDragManager, entityBounds } from '../../core';
import type { SceneGraph } from '../../core';
import type { Tool, CanvasPointerEvent } from '../registry';

import type { HandlePosition } from './resize-handles';
import { computeResize } from './resize-handles';

export function createResizeTool(
  sceneGraph: SceneGraph,
  getMode: () => 'edit' | 'preview',
): Tool {
  const dragManager = createDragManager(getMode);
  let activeHandle: HandlePosition | null = null;
  let targetEntityId: string | null = null;

  return {
    name: 'resize',

    onActivate() {},
    onDeactivate() {
      dragManager.cancel();
      activeHandle = null;
      targetEntityId = null;
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (!event.entityId) return;
      targetEntityId = event.entityId;
      activeHandle = 'bottom-right'; // default handle; real impl would detect which handle
      dragManager.onPointerDown(event.entityId, event.canvasPosition);
    },

    onPointerMove(event: CanvasPointerEvent) {
      dragManager.onPointerMove(event.canvasPosition);
    },

    onPointerUp(event: CanvasPointerEvent) {
      const state = dragManager.onPointerUp(event.canvasPosition);
      if (state.isDragging && targetEntityId && activeHandle && state.delta) {
        const entity = sceneGraph.getEntity(targetEntityId);
        if (entity) {
          const bounds = entityBounds(entity);
          const result = computeResize(activeHandle, state.delta, bounds, {
            aspectLock: event.shiftKey,
            centerResize: event.altKey,
          });
          bus.emit(CanvasEvents.ENTITY_RESIZED, {
            id: targetEntityId,
            position: result.position,
            size: result.size,
          });
        }
      }
      activeHandle = null;
      targetEntityId = null;
    },

    cancel() {
      dragManager.cancel();
      activeHandle = null;
      targetEntityId = null;
    },
  };
}
