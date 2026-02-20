/**
 * Text Tool — text entity creation
 *
 * @module canvas/tools/text
 * @layer L4A-2
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createTextTool(getMode: () => 'edit' | 'preview'): Tool {
  return {
    name: 'text',

    onActivate() {},
    onDeactivate() {},

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;
      if (event.entityId) return; // clicking on existing entity, not creating new

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'text',
        transform: {
          position: event.canvasPosition,
          size: { width: 200, height: 40 },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        content: '',
        fontFamily: 'system-ui',
        fontSize: 16,
        fontWeight: 400,
        color: '#000000',
        textAlign: 'left',
      });
    },

    onPointerMove() {},
    onPointerUp() {},
    cancel() {},
  };
}
