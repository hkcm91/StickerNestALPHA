/**
 * Widget Tool — widget entity placement
 *
 * @module canvas/tools/widget
 * @layer L4A-2
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createWidgetTool(widgetId: string, getMode: () => 'edit' | 'preview'): Tool {
  return {
    name: 'widget',

    onActivate() {},
    onDeactivate() {},

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'widget',
        transform: {
          position: event.canvasPosition,
          size: { width: 300, height: 200 },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        widgetId,
        config: {},
      });
    },

    onPointerMove() {},
    onPointerUp() {},
    cancel() {},
  };
}
