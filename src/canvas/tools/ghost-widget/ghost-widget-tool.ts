/**
 * Ghost Widget Tool — cursor-follow placement for widget invite acceptance
 *
 * Renders a faint, glowy widget preview that follows the cursor until the user
 * clicks to place it. Used after accepting a widget connection invite.
 *
 * @module canvas/tools/ghost-widget
 * @layer L4A-2
 */

import { CanvasEvents } from '@sn/types';
import type { WidgetInviteMode } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { Tool, CanvasPointerEvent, CanvasKeyEvent } from '../registry';

export interface GhostWidgetPayload {
  inviteId: string;
  widgetId: string;
  widgetManifestSnapshot?: Record<string, unknown>;
  mode: WidgetInviteMode;
  sourcePortId?: string;
  targetPortId?: string;
  sourceCanvasId?: string;
  sourceWidgetInstanceId?: string;
}

export function createGhostWidgetTool(
  payload: GhostWidgetPayload,
  getMode: () => 'edit' | 'preview',
): Tool {
  return {
    name: 'ghost-widget',

    onActivate() {
      bus.emit(CanvasEvents.GHOST_ACTIVATED, {
        widgetId: payload.widgetId,
        widgetManifestSnapshot: payload.widgetManifestSnapshot,
        inviteId: payload.inviteId,
        mode: payload.mode,
      });
    },

    onDeactivate() {
      bus.emit(CanvasEvents.GHOST_DEACTIVATED, {
        inviteId: payload.inviteId,
      });
    },

    onPointerMove(event: CanvasPointerEvent) {
      bus.emit(CanvasEvents.GHOST_POSITION_UPDATE, {
        position: event.canvasPosition,
        inviteId: payload.inviteId,
      });
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;

      // Determine default size from manifest snapshot or use fallback
      const manifest = payload.widgetManifestSnapshot;
      const size = manifest?.size as Record<string, unknown> | undefined;
      const width = (size?.defaultWidth as number) ?? 300;
      const height = (size?.defaultHeight as number) ?? 200;

      // 1. Create the widget entity at click position
      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'widget',
        transform: {
          position: event.canvasPosition,
          size: { width, height },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        widgetId: payload.widgetId,
        config: {},
      });

      // 2. If pipeline mode, request cross-canvas edge creation
      if (payload.mode === 'pipeline') {
        bus.emit(CanvasEvents.PIPELINE_CROSS_CANVAS_EDGE_REQUESTED, {
          inviteId: payload.inviteId,
          sourceCanvasId: payload.sourceCanvasId,
          sourceWidgetInstanceId: payload.sourceWidgetInstanceId,
          sourcePortId: payload.sourcePortId,
          targetPortId: payload.targetPortId,
          targetPosition: event.canvasPosition,
        });
      }

      // 3. Signal placement complete
      bus.emit(CanvasEvents.GHOST_PLACED, {
        inviteId: payload.inviteId,
        position: event.canvasPosition,
      });

      // 4. Switch back to select tool
      bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'select' });
    },

    onPointerUp() {},

    onKeyDown(event: CanvasKeyEvent) {
      if (event.key === 'Escape') {
        // Cancel placement, switch to select tool
        bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'select' });
      }
    },

    cancel() {
      bus.emit(CanvasEvents.GHOST_DEACTIVATED, {
        inviteId: payload.inviteId,
      });
    },
  };
}
