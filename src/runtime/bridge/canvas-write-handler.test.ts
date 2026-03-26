/**
 * Canvas Write Handler Tests
 *
 * @module runtime/bridge
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import { handleCanvasWriteMessage, resetCanvasWriteRateLimits } from './canvas-write-handler';
import type { WidgetMessage } from './message-types';

vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(), subscribeAll: vi.fn(), getHistory: vi.fn() },
}));

vi.mock('../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: {
    getState: vi.fn(() => ({ registry: {} })),
  },
}));

function mockBridge() {
  return { send: vi.fn() } as any;
}

function ctx(overrides: Partial<{ widgetId: string; instanceId: string; bridge: any }> = {}) {
  return {
    widgetId: overrides.widgetId ?? 'w-1',
    instanceId: overrides.instanceId ?? 'inst-1',
    bridge: overrides.bridge ?? mockBridge(),
  };
}

function setPermissions(widgetId: string, permissions: string[]) {
  (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
    registry: {
      [widgetId]: { manifest: { permissions } },
    },
  });
}

describe('handleCanvasWriteMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCanvasWriteRateLimits();
    (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ registry: {} });
  });

  it('returns false for unrelated message types', () => {
    const bridge = mockBridge();
    const result = handleCanvasWriteMessage(
      { type: 'EMIT', eventType: 'x', payload: null } as WidgetMessage,
      ctx({ bridge }),
    );
    expect(result).toBe(false);
    expect(bridge.send).not.toHaveBeenCalled();
  });

  it('denies CREATE_ENTITY without canvas-write permission', () => {
    const bridge = mockBridge();
    const msg: WidgetMessage = {
      type: 'CREATE_ENTITY',
      requestId: 'r1',
      entityType: 'sticker',
      position: { x: 0, y: 0 },
    };
    const handled = handleCanvasWriteMessage(msg, ctx({ bridge }));

    expect(handled).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CANVAS_WRITE_RESPONSE',
        requestId: 'r1',
        success: false,
        error: expect.stringContaining('Permission denied'),
      }),
    );
    expect(bus.emit).not.toHaveBeenCalled();
  });

  it('creates entity and emits bus event with permission', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);

    const msg: WidgetMessage = {
      type: 'CREATE_ENTITY',
      requestId: 'r2',
      entityType: 'sticker',
      position: { x: 100, y: 200 },
      name: 'My Sticker',
    };
    const handled = handleCanvasWriteMessage(msg, ctx({ bridge }));

    expect(handled).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      'canvas.entity.created',
      expect.objectContaining({
        type: 'sticker',
        name: 'My Sticker',
        transform: expect.objectContaining({ position: { x: 100, y: 200 } }),
      }),
    );
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CANVAS_WRITE_RESPONSE', success: true }),
    );
  });

  it('handles UPDATE_ENTITY with permission', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);

    const msg: WidgetMessage = {
      type: 'UPDATE_ENTITY',
      requestId: 'r3',
      entityId: 'ent-1',
      updates: { name: 'Renamed' },
    };
    const handled = handleCanvasWriteMessage(msg, ctx({ bridge }));

    expect(handled).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith('canvas.entity.updated', {
      entityId: 'ent-1',
      updates: { name: 'Renamed' },
    });
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, entityId: 'ent-1' }),
    );
  });

  it('handles DELETE_ENTITY with permission', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);

    const msg: WidgetMessage = {
      type: 'DELETE_ENTITY',
      requestId: 'r4',
      entityId: 'ent-del',
    };
    const handled = handleCanvasWriteMessage(msg, ctx({ bridge }));

    expect(handled).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith('canvas.entity.deleted', { entityId: 'ent-del' });
  });

  it('rate-limits after 10 writes per minute', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);

    // Perform 10 writes — all should succeed
    for (let i = 0; i < 10; i++) {
      handleCanvasWriteMessage(
        { type: 'CREATE_ENTITY', requestId: `r-${i}`, entityType: 'sticker', position: { x: 0, y: 0 } } as WidgetMessage,
        ctx({ bridge }),
      );
    }

    expect(bus.emit).toHaveBeenCalledTimes(10);
    bridge.send.mockClear();

    // The 11th write should be rate limited
    const handled = handleCanvasWriteMessage(
      { type: 'CREATE_ENTITY', requestId: 'r-11', entityType: 'sticker', position: { x: 0, y: 0 } } as WidgetMessage,
      ctx({ bridge }),
    );

    expect(handled).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CANVAS_WRITE_RESPONSE',
        success: false,
        error: expect.stringContaining('Rate limit'),
      }),
    );
  });

  it('resetCanvasWriteRateLimits clears rate limit state', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);

    // Fill up rate limit
    for (let i = 0; i < 10; i++) {
      handleCanvasWriteMessage(
        { type: 'CREATE_ENTITY', requestId: `r-${i}`, entityType: 's', position: { x: 0, y: 0 } } as WidgetMessage,
        ctx({ bridge }),
      );
    }

    // Reset
    resetCanvasWriteRateLimits();

    // Should be able to write again
    (bus.emit as ReturnType<typeof vi.fn>).mockClear();
    handleCanvasWriteMessage(
      { type: 'CREATE_ENTITY', requestId: 'r-after-reset', entityType: 's', position: { x: 0, y: 0 } } as WidgetMessage,
      ctx({ bridge }),
    );
    expect(bus.emit).toHaveBeenCalledTimes(1);
  });
});
