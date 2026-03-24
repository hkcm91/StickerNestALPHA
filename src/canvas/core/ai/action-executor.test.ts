import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { AICanvasAction } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { executeAIActions, resetRateLimits } from './action-executor';

describe('executeAIActions', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    resetRateLimits();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('executes create-entity action and emits ENTITY_CREATED', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_CREATED, handler);

    const result = executeAIActions([
      {
        type: 'create-entity',
        entityType: 'text',
        name: 'AI Note',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 200 },
      },
    ]);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toHaveLength(0);
    expect(handler).toHaveBeenCalledTimes(1);
    const entity = handler.mock.calls[0][0].payload;
    expect(entity.type).toBe('text');
    expect(entity.name).toBe('AI Note');
    expect(entity.transform.position).toEqual({ x: 100, y: 200 });
  });

  it('executes update-entity action', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);

    const result = executeAIActions([
      {
        type: 'update-entity',
        entityId: 'ent-1',
        updates: { name: 'Renamed' },
      },
    ]);

    expect(result.succeeded).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('executes delete-entity action', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);

    const result = executeAIActions([
      { type: 'delete-entity', entityId: 'ent-1' },
    ]);

    expect(result.succeeded).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('executes move-entity action', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_MOVED, handler);

    const result = executeAIActions([
      {
        type: 'move-entity',
        entityId: 'ent-1',
        position: { x: 500, y: 300 },
      },
    ]);

    expect(result.succeeded).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('executes emit-event action', () => {
    const handler = vi.fn();
    bus.subscribe('widget.custom.event', handler);

    const result = executeAIActions([
      {
        type: 'emit-event',
        eventType: 'widget.custom.event',
        payload: { value: 42 },
      },
    ]);

    expect(result.succeeded).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid actions', () => {
    const result = executeAIActions([
      { type: 'invalid-type' } as unknown as AICanvasAction,
    ]);

    expect(result.succeeded).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toContain('Invalid action');
  });

  it('rejects batch exceeding 20 actions', () => {
    const actions: AICanvasAction[] = Array.from({ length: 21 }, () => ({
      type: 'delete-entity' as const,
      entityId: 'ent-1',
    }));

    const result = executeAIActions(actions);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toHaveLength(21);
  });

  it('creates entity with default size when none provided', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_CREATED, handler);

    executeAIActions([
      {
        type: 'create-entity',
        entityType: 'sticker',
        position: { x: 0, y: 0 },
      },
    ]);

    const entity = handler.mock.calls[0][0].payload;
    expect(entity.transform.size).toEqual({ width: 200, height: 150 });
  });

  it('handles mixed success and failure in a batch', () => {
    const result = executeAIActions([
      { type: 'create-entity', entityType: 'text', position: { x: 0, y: 0 } },
      { type: 'bogus' } as unknown as AICanvasAction,
      { type: 'delete-entity', entityId: 'ent-1' },
    ]);

    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(1);
  });
});
