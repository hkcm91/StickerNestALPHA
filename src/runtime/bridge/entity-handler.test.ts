/**
 * Entity Handler Tests
 *
 * @module runtime/bridge
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import { handleEntityMessage } from './entity-handler';
import type { WidgetMessage } from './message-types';

// Mock kernel bus
vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(), subscribeAll: vi.fn(), getHistory: vi.fn() },
}));

// Mock widget store
vi.mock('../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: {
    getState: vi.fn(() => ({ registry: {} })),
  },
}));

function mockBridge() {
  return { send: vi.fn() } as any;
}

function ctxWith(overrides: Partial<{ widgetId: string; instanceId: string; bridge: any }> = {}) {
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

describe('handleEntityMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ registry: {} });
  });

  it('returns false for unrelated message types', () => {
    const bridge = mockBridge();
    const ctx = ctxWith({ bridge });
    const result = handleEntityMessage({ type: 'EMIT', eventType: 'x', payload: null } as WidgetMessage, ctx);
    expect(result).toBe(false);
    expect(bridge.send).not.toHaveBeenCalled();
  });

  it('rejects CREATE_ENTITY without canvas-write permission', () => {
    const bridge = mockBridge();
    const ctx = ctxWith({ bridge, widgetId: 'w-no-perm' });

    const msg: WidgetMessage = {
      type: 'CREATE_ENTITY',
      requestId: 'r1',
      entity: { type: 'sticker' },
    };
    const handled = handleEntityMessage(msg, ctx);

    expect(handled).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ENTITY_RESPONSE',
        requestId: 'r1',
        result: null,
        error: expect.stringContaining('Permission denied'),
      }),
    );
    expect(bus.emit).not.toHaveBeenCalled();
  });

  it('rejects CREATE_ENTITY with invalid entity (null)', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'CREATE_ENTITY',
      requestId: 'r2',
      entity: null,
    };
    const handled = handleEntityMessage(msg, ctx);

    expect(handled).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ENTITY_RESPONSE',
        error: expect.stringContaining('Invalid entity'),
      }),
    );
  });

  it('creates entity and emits bus event when permission is granted', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'CREATE_ENTITY',
      requestId: 'r3',
      entity: { id: 'ent-123', type: 'sticker' },
    };
    const handled = handleEntityMessage(msg, ctx);

    expect(handled).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      'canvas.entity.created',
      expect.objectContaining({ id: 'ent-123', type: 'sticker' }),
    );
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ENTITY_RESPONSE',
        requestId: 'r3',
        result: { success: true, entityId: 'ent-123' },
      }),
    );
  });

  it('DELETE_ENTITY without permission sends error response', () => {
    const bridge = mockBridge();
    const ctx = ctxWith({ bridge, widgetId: 'w-blocked' });

    const msg: WidgetMessage = {
      type: 'DELETE_ENTITY',
      requestId: 'r4',
      entityId: 'ent-abc',
    };
    const handled = handleEntityMessage(msg, ctx);

    expect(handled).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ENTITY_RESPONSE',
        error: expect.stringContaining('Permission denied'),
      }),
    );
  });

  it('DELETE_ENTITY with permission emits bus event and responds success', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'DELETE_ENTITY',
      requestId: 'r5',
      entityId: 'ent-del',
    };
    const handled = handleEntityMessage(msg, ctx);

    expect(handled).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith('canvas.entity.deleted', { entityId: 'ent-del' });
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ENTITY_RESPONSE',
        result: { success: true, entityId: 'ent-del' },
      }),
    );
  });

  it('assigns a random id when entity.id is missing on CREATE_ENTITY', () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['canvas-write']);
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'CREATE_ENTITY',
      requestId: 'r6',
      entity: { type: 'text' },
    };
    handleEntityMessage(msg, ctx);

    // The bus should have been called with an entity that has a non-empty id
    const emittedEntity = (bus.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof emittedEntity.id).toBe('string');
    expect((emittedEntity.id as string).length).toBeGreaterThan(0);
  });
});
