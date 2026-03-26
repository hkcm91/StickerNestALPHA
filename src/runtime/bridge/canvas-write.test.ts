import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import type { WidgetBridge } from './bridge';
import { handleCanvasWriteMessage, resetCanvasWriteRateLimits } from './canvas-write-handler';
import type { WidgetMessage } from './message-types';

function makeBridge(): WidgetBridge {
  return {
    send: vi.fn(),
    onMessage: vi.fn(),
    isReady: vi.fn(() => true),
    destroy: vi.fn(),
  };
}

function makeCtx(bridge?: WidgetBridge) {
  return {
    widgetId: 'test-widget',
    instanceId: 'test-instance',
    bridge: bridge ?? makeBridge(),
  };
}

function registerWidgetWithPermissions(widgetId: string, permissions: string[]) {
  const ws = useWidgetStore.getState();
  ws.registerWidget({
    widgetId,
    manifest: {
      id: widgetId,
      name: widgetId,
      version: '1.0.0',
      license: 'MIT',
      tags: [],
      category: 'other',
      permissions: permissions as never[],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
      entry: 'index.html',
      crossCanvasChannels: [],
      spatialSupport: false,
    },
    htmlContent: '',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  });
}

describe('handleCanvasWriteMessage', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    resetCanvasWriteRateLimits();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('returns false for non-canvas-write messages', () => {
    const result = handleCanvasWriteMessage(
      { type: 'EMIT', eventType: 'test', payload: {} } as WidgetMessage,
      makeCtx(),
    );
    expect(result).toBe(false);
  });

  it('blocks CREATE_ENTITY without canvas-write permission', () => {
    registerWidgetWithPermissions('test-widget', ['storage']);
    const bridge = makeBridge();
    const ctx = makeCtx(bridge);

    const result = handleCanvasWriteMessage(
      { type: 'CREATE_ENTITY', requestId: 'r1', entityType: 'text', position: { x: 0, y: 0 } } as WidgetMessage,
      ctx,
    );

    expect(result).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CANVAS_WRITE_RESPONSE',
        requestId: 'r1',
        success: false,
        error: expect.stringContaining('Permission denied'),
      }),
    );
  });

  it('creates entity with canvas-write permission', () => {
    registerWidgetWithPermissions('test-widget', ['canvas-write']);
    const bridge = makeBridge();
    const ctx = makeCtx(bridge);

    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_CREATED, handler);

    const result = handleCanvasWriteMessage(
      { type: 'CREATE_ENTITY', requestId: 'r1', entityType: 'text', name: 'AI Note', position: { x: 100, y: 200 }, size: { width: 300, height: 200 } } as WidgetMessage,
      ctx,
    );

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    const entity = handler.mock.calls[0][0].payload;
    expect(entity.type).toBe('text');
    expect(entity.name).toBe('AI Note');
    expect(entity.createdBy).toBe('test-instance');
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CANVAS_WRITE_RESPONSE',
        requestId: 'r1',
        success: true,
        entityId: expect.stringMatching(/^ent-/),
      }),
    );
  });

  it('updates entity with canvas-write permission', () => {
    registerWidgetWithPermissions('test-widget', ['canvas-write']);
    const bridge = makeBridge();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);

    handleCanvasWriteMessage(
      { type: 'UPDATE_ENTITY', requestId: 'r2', entityId: 'ent-1', updates: { name: 'Renamed' } } as WidgetMessage,
      makeCtx(bridge),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, entityId: 'ent-1' }),
    );
  });

  it('deletes entity with canvas-write permission', () => {
    registerWidgetWithPermissions('test-widget', ['canvas-write']);
    const bridge = makeBridge();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);

    handleCanvasWriteMessage(
      { type: 'DELETE_ENTITY', requestId: 'r3', entityId: 'ent-1' } as WidgetMessage,
      makeCtx(bridge),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, entityId: 'ent-1' }),
    );
  });

  it('rate limits after 10 writes per minute', () => {
    registerWidgetWithPermissions('test-widget', ['canvas-write']);
    const bridge = makeBridge();
    const ctx = makeCtx(bridge);

    // 10 writes should succeed
    for (let i = 0; i < 10; i++) {
      handleCanvasWriteMessage(
        { type: 'CREATE_ENTITY', requestId: `r${i}`, entityType: 'text', position: { x: 0, y: 0 } } as WidgetMessage,
        ctx,
      );
    }

    // 11th should be rate limited
    handleCanvasWriteMessage(
      { type: 'CREATE_ENTITY', requestId: 'r-limited', entityType: 'text', position: { x: 0, y: 0 } } as WidgetMessage,
      ctx,
    );

    const lastCall = (bridge.send as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      type: 'CANVAS_WRITE_RESPONSE',
      requestId: 'r-limited',
      success: false,
      error: expect.stringContaining('Rate limit'),
    });
  });
});
