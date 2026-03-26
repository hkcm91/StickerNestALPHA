/**
 * Widget Tool — widget entity placement
 *
 * @module canvas/tools/widget
 * @layer L4A-2
 */

import type { GridConfig } from '@sn/types';
import { CanvasEvents, GridEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { snapToGridCell } from '../move/snap';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createWidgetTool(widgetId: string, getMode: () => 'edit' | 'preview'): Tool {
  let gridConfig: GridConfig | null = null;

  const unsubGrid = bus.subscribe(GridEvents.CONFIG_CHANGED, (event: { payload: { config: Partial<GridConfig> } }) => {
    gridConfig = gridConfig ? { ...gridConfig, ...event.payload.config } : null;
  });

  return {
    name: 'widget',

    onActivate() {},
    onDeactivate() {
      unsubGrid();
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;

      const size = { width: 300, height: 200 };
      let position = event.canvasPosition;
      if (gridConfig && gridConfig.enabled && gridConfig.snapMode !== 'none') {
        position = snapToGridCell(position, gridConfig, size);
      }

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'widget',
        transform: {
          position,
          size,
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
