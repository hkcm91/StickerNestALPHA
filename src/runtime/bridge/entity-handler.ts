/**
 * Canvas Entity Bridge Handler
 *
 * Host-side handler for entity creation/deletion from widgets.
 * Enforces 'canvas-write' permission before emitting bus events
 * that canvas core processes.
 *
 * @module runtime/bridge
 * @layer L3
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import type { WidgetBridge } from './bridge';
import type { WidgetMessage } from './message-types';

/**
 * Checks whether a widget has the 'canvas-write' permission.
 */
function hasCanvasWritePermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('canvas-write') ?? false;
}

interface HandlerContext {
  widgetId: string;
  instanceId: string;
  bridge: WidgetBridge;
}

/**
 * Handles entity creation/deletion messages from a widget iframe.
 * Returns true if the message was handled, false otherwise.
 */
export function handleEntityMessage(
  message: WidgetMessage,
  ctx: HandlerContext,
): boolean {
  const { widgetId, instanceId, bridge } = ctx;

  switch (message.type) {
    case 'CREATE_ENTITY': {
      if (!hasCanvasWritePermission(widgetId)) {
        bridge.send({
          type: 'ENTITY_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks canvas-write permission',
        });
        return true;
      }

      const entity = message.entity as Record<string, unknown> | null;
      if (!entity || typeof entity !== 'object') {
        bridge.send({
          type: 'ENTITY_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Invalid entity: must be a non-null object',
        });
        return true;
      }

      // Ensure entity has an ID
      const entityId = (entity.id as string) || crypto.randomUUID();
      entity.id = entityId;

      // Emit to canvas core — it handles auto-fill of missing fields
      bus.emit(CanvasEvents.ENTITY_CREATED, entity);

      bridge.send({
        type: 'ENTITY_RESPONSE',
        requestId: message.requestId,
        result: { success: true, entityId },
      });

      console.debug(`[EntityHandler][${instanceId}] Entity created: ${entityId} (type: ${entity.type})`);
      return true;
    }

    case 'DELETE_ENTITY': {
      if (!hasCanvasWritePermission(widgetId)) {
        bridge.send({
          type: 'ENTITY_RESPONSE',
          requestId: message.requestId,
          result: null,
          error: 'Permission denied: widget lacks canvas-write permission',
        });
        return true;
      }

      bus.emit(CanvasEvents.ENTITY_DELETED, { entityId: message.entityId });

      bridge.send({
        type: 'ENTITY_RESPONSE',
        requestId: message.requestId,
        result: { success: true, entityId: message.entityId },
      });

      console.debug(`[EntityHandler][${instanceId}] Entity deleted: ${message.entityId}`);
      return true;
    }

    default:
      return false;
  }
}
