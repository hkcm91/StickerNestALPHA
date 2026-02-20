/**
 * Sticker Tool — sticker entity placement
 *
 * @module canvas/tools/sticker
 * @layer L4A-2
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createStickerTool(assetUrl: string, getMode: () => 'edit' | 'preview'): Tool {
  return {
    name: 'sticker',

    onActivate() {},
    onDeactivate() {},

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'sticker',
        transform: {
          position: event.canvasPosition,
          size: { width: 100, height: 100 },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        assetUrl,
        assetType: 'image',
        aspectLocked: true,
      });
    },

    onPointerMove() {},
    onPointerUp() {},
    cancel() {},
  };
}
