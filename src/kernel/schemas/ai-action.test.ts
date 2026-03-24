import { describe, it, expect } from 'vitest';

import {
  AICanvasActionSchema,
  AICanvasActionBatchSchema,
} from './ai-action';

describe('AICanvasActionSchema', () => {
  it('validates create-entity action', () => {
    const action = {
      type: 'create-entity',
      entityType: 'text',
      name: 'My Note',
      position: { x: 100, y: 200 },
      size: { width: 300, height: 200 },
      properties: { content: 'Hello world' },
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates create-entity with minimal fields', () => {
    const action = {
      type: 'create-entity',
      entityType: 'sticker',
      position: { x: 0, y: 0 },
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates update-entity action', () => {
    const action = {
      type: 'update-entity',
      entityId: 'ent-123',
      updates: { name: 'Renamed' },
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates delete-entity action', () => {
    const action = {
      type: 'delete-entity',
      entityId: 'ent-123',
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates move-entity action', () => {
    const action = {
      type: 'move-entity',
      entityId: 'ent-123',
      position: { x: 500, y: 300 },
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates emit-event action', () => {
    const action = {
      type: 'emit-event',
      eventType: 'widget.custom.event',
      payload: { value: 42 },
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(true);
  });

  it('rejects unknown action type', () => {
    const action = {
      type: 'fly-to-moon',
      entityId: 'ent-123',
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(false);
  });

  it('rejects create-entity with invalid entity type', () => {
    const action = {
      type: 'create-entity',
      entityType: 'unicorn',
      position: { x: 0, y: 0 },
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(false);
  });

  it('rejects update-entity with empty entityId', () => {
    const action = {
      type: 'update-entity',
      entityId: '',
      updates: { name: 'test' },
    };
    expect(AICanvasActionSchema.safeParse(action).success).toBe(false);
  });
});

describe('AICanvasActionBatchSchema', () => {
  it('validates a batch of actions', () => {
    const batch = {
      actions: [
        { type: 'create-entity', entityType: 'text', position: { x: 0, y: 0 } },
        { type: 'move-entity', entityId: 'ent-1', position: { x: 100, y: 100 } },
      ],
    };
    expect(AICanvasActionBatchSchema.safeParse(batch).success).toBe(true);
  });

  it('rejects batch exceeding 20 actions', () => {
    const actions = Array.from({ length: 21 }, (_, i) => ({
      type: 'delete-entity' as const,
      entityId: `ent-${i}`,
    }));
    expect(AICanvasActionBatchSchema.safeParse({ actions }).success).toBe(false);
  });

  it('accepts empty batch', () => {
    expect(AICanvasActionBatchSchema.safeParse({ actions: [] }).success).toBe(true);
  });
});
