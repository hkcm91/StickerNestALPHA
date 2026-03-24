import { describe, it, expect } from 'vitest';

import type { CanvasEntity } from '@sn/types';

import { buildCanvasAISnapshot, serializeSnapshotForPrompt } from './canvas-ai-context';

function makeEntity(overrides: Partial<CanvasEntity> & { id: string; type: string }): CanvasEntity {
  return {
    visible: true,
    locked: false,
    zIndex: 0,
    transform: {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    },
    ...overrides,
  } as CanvasEntity;
}

describe('buildCanvasAISnapshot', () => {
  it('returns all visible entities within viewport', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text', name: 'Note', transform: { position: { x: 50, y: 50 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } }),
      makeEntity({ id: 'e2', type: 'sticker', transform: { position: { x: 100, y: 100 }, size: { width: 50, height: 50 }, rotation: 0, scale: 1 } }),
    ];

    const snapshot = buildCanvasAISnapshot(entities, {
      viewport: { pan: { x: 0, y: 0 }, zoom: 1, screenWidth: 1920, screenHeight: 1080 },
    });

    expect(snapshot.totalEntities).toBe(2);
    expect(snapshot.entities).toHaveLength(2);
    expect(snapshot.stats).toEqual({ text: 1, sticker: 1 });
  });

  it('excludes invisible entities', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text', visible: true }),
      makeEntity({ id: 'e2', type: 'text', visible: false }),
    ];

    const snapshot = buildCanvasAISnapshot(entities);
    expect(snapshot.entities).toHaveLength(1);
    expect(snapshot.entities[0].id).toBe('e1');
  });

  it('excludes entities outside viewport when viewportScoped is true', () => {
    const entities = [
      makeEntity({ id: 'inside', type: 'text', transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } }),
      makeEntity({ id: 'outside', type: 'text', transform: { position: { x: 99999, y: 99999 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } }),
    ];

    const snapshot = buildCanvasAISnapshot(entities, {
      viewportScoped: true,
      viewport: { pan: { x: 0, y: 0 }, zoom: 1, screenWidth: 1920, screenHeight: 1080 },
    });

    expect(snapshot.entities).toHaveLength(1);
    expect(snapshot.entities[0].id).toBe('inside');
  });

  it('includes all entities when viewportScoped is false', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text', transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } }),
      makeEntity({ id: 'e2', type: 'text', transform: { position: { x: 99999, y: 99999 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } }),
    ];

    const snapshot = buildCanvasAISnapshot(entities, { viewportScoped: false });
    expect(snapshot.entities).toHaveLength(2);
  });

  it('limits entities to maxEntities', () => {
    const entities = Array.from({ length: 100 }, (_, i) =>
      makeEntity({ id: `e${i}`, type: 'text' }),
    );

    const snapshot = buildCanvasAISnapshot(entities, {
      viewportScoped: false,
      maxEntities: 10,
    });

    expect(snapshot.entities).toHaveLength(10);
    expect(snapshot.totalEntities).toBe(100);
  });

  it('prioritizes selected entities in output order', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text', zIndex: 10 }),
      makeEntity({ id: 'e2', type: 'text', zIndex: 20 }),
      makeEntity({ id: 'e3', type: 'text', zIndex: 5 }),
    ];

    const snapshot = buildCanvasAISnapshot(entities, {
      viewportScoped: false,
      selectedEntityIds: ['e3'],
    });

    expect(snapshot.entities[0].id).toBe('e3');
    expect(snapshot.selection).toEqual(['e3']);
  });

  it('extracts text content property', () => {
    const entity = makeEntity({
      id: 'e1',
      type: 'text',
      content: 'Hello world',
    } as Partial<CanvasEntity> & { id: string; type: string; content: string });

    const snapshot = buildCanvasAISnapshot([entity], { viewportScoped: false });
    expect(snapshot.entities[0].properties?.content).toBe('Hello world');
  });

  it('truncates long text content', () => {
    const longText = 'a'.repeat(200);
    const entity = makeEntity({
      id: 'e1',
      type: 'text',
      content: longText,
    } as Partial<CanvasEntity> & { id: string; type: string; content: string });

    const snapshot = buildCanvasAISnapshot([entity], { viewportScoped: false });
    const content = snapshot.entities[0].properties?.content as string;
    expect(content.length).toBeLessThanOrEqual(101); // 100 + ellipsis
  });
});

describe('serializeSnapshotForPrompt', () => {
  it('produces readable prompt text', () => {
    const snapshot = buildCanvasAISnapshot(
      [
        makeEntity({ id: 'e1', type: 'text', name: 'My Note' }),
        makeEntity({ id: 'e2', type: 'sticker' }),
      ],
      { viewportScoped: false },
    );

    const text = serializeSnapshotForPrompt(snapshot);
    expect(text).toContain('Canvas: 2 entities total');
    expect(text).toContain('1 text');
    expect(text).toContain('1 sticker');
    expect(text).toContain('text "My Note"');
  });

  it('includes selection info when present', () => {
    const snapshot = buildCanvasAISnapshot(
      [makeEntity({ id: 'e1', type: 'text' })],
      { viewportScoped: false, selectedEntityIds: ['e1'] },
    );

    const text = serializeSnapshotForPrompt(snapshot);
    expect(text).toContain('Selected: e1');
  });
});
