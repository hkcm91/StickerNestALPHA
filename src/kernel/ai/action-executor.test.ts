/**
 * AI Action Executor — Tests
 * @module kernel/ai
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../bus';

import { executeAIAction, executeAIActions, executeAIActionBatch } from './action-executor';

// ---------------------------------------------------------------------------
// Mock bus.emit to capture calls
// ---------------------------------------------------------------------------

vi.spyOn(bus, 'emit');

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('executeAIAction', () => {
  it('creates a sticker entity', () => {
    const result = executeAIAction({
      action: 'create_sticker',
      assetUrl: 'https://example.com/cat.png',
      position: { x: 100, y: 200 },
    });

    expect(result.success).toBe(true);
    expect(result.entityId).toBeDefined();
    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_CREATED,
      expect.objectContaining({
        type: 'sticker',
        assetUrl: 'https://example.com/cat.png',
        transform: expect.objectContaining({
          position: { x: 100, y: 200 },
        }),
      }),
    );
  });

  it('creates a widget entity', () => {
    const result = executeAIAction({
      action: 'create_widget',
      widgetId: 'wgt-clock',
      position: { x: 0, y: 0 },
      config: { timezone: 'UTC' },
    });

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_CREATED,
      expect.objectContaining({
        type: 'widget',
        widgetId: 'wgt-clock',
        config: { timezone: 'UTC' },
      }),
    );
  });

  it('creates a text entity', () => {
    const result = executeAIAction({
      action: 'create_text',
      content: 'Hello World',
      position: { x: 50, y: 50 },
      fontSize: 24,
      color: '#ff0000',
    });

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_CREATED,
      expect.objectContaining({
        type: 'text',
        content: 'Hello World',
        fontSize: 24,
        color: '#ff0000',
      }),
    );
  });

  it('creates a shape entity', () => {
    const result = executeAIAction({
      action: 'create_shape',
      shapeType: 'rectangle',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      fill: '#0000ff',
    });

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_CREATED,
      expect.objectContaining({
        type: 'shape',
        shapeType: 'rectangle',
        fill: '#0000ff',
      }),
    );
  });

  it('moves an entity', () => {
    const entityId = crypto.randomUUID();
    const result = executeAIAction({
      action: 'move_entity',
      entityId,
      position: { x: 300, y: 400 },
    });

    expect(result.success).toBe(true);
    expect(result.entityId).toBe(entityId);
    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_MOVED,
      { entityId, position: { x: 300, y: 400 } },
    );
  });

  it('updates an entity', () => {
    const entityId = crypto.randomUUID();
    const result = executeAIAction({
      action: 'update_entity',
      entityId,
      updates: { opacity: 0.5 },
    });

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_UPDATED,
      { entityId, updates: { opacity: 0.5 } },
    );
  });

  it('deletes an entity', () => {
    const entityId = crypto.randomUUID();
    const result = executeAIAction({
      action: 'delete_entity',
      entityId,
    });

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_DELETED,
      { entityId },
    );
  });

  it('triggers AI generation', () => {
    const result = executeAIAction({
      action: 'trigger_generation',
      prompt: 'a cute cat sticker',
      position: { x: 100, y: 100 },
    });

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      'ai.generation.requested',
      expect.objectContaining({ prompt: 'a cute cat sticker' }),
    );
  });

  it('emits a custom bus event', () => {
    const result = executeAIAction({
      action: 'emit_event',
      eventType: 'custom.test',
      payload: { foo: 'bar' },
    });

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith('custom.test', { foo: 'bar' });
  });
});

describe('executeAIActions', () => {
  it('executes a batch of actions and returns results', () => {
    const result = executeAIActions([
      { action: 'create_text', content: 'Title', position: { x: 0, y: 0 } },
      { action: 'create_text', content: 'Subtitle', position: { x: 0, y: 50 } },
    ]);

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(bus.emit).toHaveBeenCalledTimes(2);
  });

  it('handles empty action array', () => {
    const result = executeAIActions([]);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

describe('executeAIActionBatch', () => {
  it('executes batch with reasoning', () => {
    const result = executeAIActionBatch({
      actions: [
        { action: 'create_text', content: 'Hello', position: { x: 0, y: 0 } },
      ],
      reasoning: 'Adding a greeting',
    });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });
});
