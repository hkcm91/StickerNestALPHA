/**
 * Canvas Write Bridge Handler
 *
 * Host-side handler for canvas entity CRUD operations from widgets.
 * Enforces 'canvas-write' permission and rate limiting before
 * executing actions via the AI action executor.
 *
 * @module runtime/bridge
 * @layer L3
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import type { WidgetBridge } from './bridge';
import type { WidgetMessage } from './message-types';

interface HandlerContext {
  widgetId: string;
  instanceId: string;
  bridge: WidgetBridge;
}

/** Rate limit: max 10 entity creates per minute per widget instance */
const MAX_WRITES_PER_MINUTE = 10;
const writeTimestamps = new Map<string, number[]>();

function isWriteRateLimited(instanceId: string): boolean {
  const now = Date.now();
  const timestamps = writeTimestamps.get(instanceId) ?? [];
  const recent = timestamps.filter((t) => now - t < 60_000);
  writeTimestamps.set(instanceId, recent);
  return recent.length >= MAX_WRITES_PER_MINUTE;
}

function recordWrite(instanceId: string): void {
  const timestamps = writeTimestamps.get(instanceId) ?? [];
  timestamps.push(Date.now());
  writeTimestamps.set(instanceId, timestamps);
}

function hasCanvasWritePermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('canvas-write') ?? false;
}

function generateEntityId(): string {
  return `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateLayerId(): string {
  return crypto.randomUUID();
}

const PROPERTY_LAYER_TYPES = new Set([
  'ADD_PROPERTY_LAYER',
  'UPDATE_PROPERTY_LAYER',
  'REMOVE_PROPERTY_LAYER',
] as const satisfies readonly WidgetMessage['type'][]);

/**
 * Handle canvas write messages from widgets.
 * Returns true if the message was handled, false otherwise.
 */
export function handleCanvasWriteMessage(
  message: WidgetMessage,
  ctx: HandlerContext,
): boolean {
  const isEntityMessage = message.type === 'CREATE_ENTITY' || message.type === 'UPDATE_ENTITY' || message.type === 'DELETE_ENTITY';
  const isPropertyLayerMessage = PROPERTY_LAYER_TYPES.has(message.type as 'ADD_PROPERTY_LAYER');

  if (!isEntityMessage && !isPropertyLayerMessage) {
    return false;
  }

  const responseType = isPropertyLayerMessage ? 'PROPERTY_LAYER_RESPONSE' as const : 'CANVAS_WRITE_RESPONSE' as const;

  // Permission check
  if (!hasCanvasWritePermission(ctx.widgetId)) {
    console.warn(`[CanvasWrite][${ctx.instanceId}] blocked: widget lacks 'canvas-write' permission`);
    if ('requestId' in message) {
      ctx.bridge.send({
        type: responseType,
        requestId: (message as { requestId: string }).requestId,
        success: false,
        error: 'Permission denied: widget requires canvas-write permission',
      } as Parameters<typeof ctx.bridge.send>[0]);
    }
    return true;
  }

  // Rate limit check
  if (isWriteRateLimited(ctx.instanceId)) {
    console.warn(`[CanvasWrite][${ctx.instanceId}] rate limited`);
    if ('requestId' in message) {
      ctx.bridge.send({
        type: responseType,
        requestId: (message as { requestId: string }).requestId,
        success: false,
        error: 'Rate limit exceeded: max 10 writes per minute',
      } as Parameters<typeof ctx.bridge.send>[0]);
    }
    return true;
  }

  switch (message.type) {
    case 'CREATE_ENTITY': {
      const entityId = generateEntityId();
      const entity = {
        id: entityId,
        type: message.entityType,
        name: message.name ?? `Widget ${message.entityType}`,
        visible: true,
        locked: false,
        createdBy: ctx.instanceId,
        transform: {
          position: message.position,
          size: message.size ?? { width: 200, height: 150 },
          rotation: 0,
          scale: 1,
        },
        zIndex: Date.now(),
        ...message.properties,
      };
      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      recordWrite(ctx.instanceId);
      ctx.bridge.send({
        type: 'CANVAS_WRITE_RESPONSE',
        requestId: message.requestId,
        success: true,
        entityId,
      });
      return true;
    }

    case 'UPDATE_ENTITY': {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        entityId: message.entityId,
        updates: message.updates,
      });
      recordWrite(ctx.instanceId);
      ctx.bridge.send({
        type: 'CANVAS_WRITE_RESPONSE',
        requestId: message.requestId,
        success: true,
        entityId: message.entityId,
      });
      return true;
    }

    case 'DELETE_ENTITY': {
      bus.emit(CanvasEvents.ENTITY_DELETED, {
        entityId: message.entityId,
      });
      recordWrite(ctx.instanceId);
      ctx.bridge.send({
        type: 'CANVAS_WRITE_RESPONSE',
        requestId: message.requestId,
        success: true,
        entityId: message.entityId,
      });
      return true;
    }

    case 'ADD_PROPERTY_LAYER': {
      const layerId = generateLayerId();
      const layer = {
        id: layerId,
        widgetInstanceId: ctx.instanceId,
        widgetId: ctx.widgetId,
        label: message.label ?? `Layer (${ctx.widgetId})`,
        enabled: true,
        order: Date.now(), // will be normalized by canvas core
        properties: message.properties,
        createdAt: new Date().toISOString(),
      };
      bus.emit(CanvasEvents.PROPERTY_LAYER_ADDED, {
        entityId: message.entityId,
        layer,
      });
      recordWrite(ctx.instanceId);
      ctx.bridge.send({
        type: 'PROPERTY_LAYER_RESPONSE',
        requestId: message.requestId,
        success: true,
        layerId,
      });
      return true;
    }

    case 'UPDATE_PROPERTY_LAYER': {
      bus.emit(CanvasEvents.PROPERTY_LAYER_UPDATED, {
        entityId: message.entityId,
        layerId: message.layerId,
        widgetInstanceId: ctx.instanceId,
        updates: { properties: message.properties },
      });
      recordWrite(ctx.instanceId);
      ctx.bridge.send({
        type: 'PROPERTY_LAYER_RESPONSE',
        requestId: message.requestId,
        success: true,
        layerId: message.layerId,
      });
      return true;
    }

    case 'REMOVE_PROPERTY_LAYER': {
      bus.emit(CanvasEvents.PROPERTY_LAYER_REMOVED, {
        entityId: message.entityId,
        layerId: message.layerId,
        widgetInstanceId: ctx.instanceId,
      });
      recordWrite(ctx.instanceId);
      ctx.bridge.send({
        type: 'PROPERTY_LAYER_RESPONSE',
        requestId: message.requestId,
        success: true,
        layerId: message.layerId,
      });
      return true;
    }
  }

  return false;
}

/**
 * Reset rate limit tracking (for testing).
 */
export function resetCanvasWriteRateLimits(): void {
  writeTimestamps.clear();
}
