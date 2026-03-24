/**
 * Canvas Serialization — Tests
 *
 * @module canvas/core/persistence
 * @layer L4A-1
 */

import { describe, it, expect } from 'vitest';

import type { CanvasEntity } from '@sn/types';

import type { SceneGraph } from '../scene';

import { serialize, serializeToJSON, createEmptyDocument, countEntitiesByType, extractEntityIds, extractMetadata } from './serialize';
import { CURRENT_VERSION } from './version';

// ---------------------------------------------------------------------------
// Mock scene graph
// ---------------------------------------------------------------------------

function createMockSceneGraph(entities: CanvasEntity[]): SceneGraph {
  return {
    getAllEntities: () => entities,
    getEntity: (id: string) => entities.find((e) => e.id === id),
    addEntity: () => {},
    removeEntity: () => {},
    updateEntity: () => {},
    clear: () => {},
    getEntityCount: () => entities.length,
  } as unknown as SceneGraph;
}

function makeEntity(overrides: Partial<CanvasEntity> & { id: string; type: string }): CanvasEntity {
  return {
    canvasId: 'canvas-1',
    transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 },
    zIndex: 0,
    visible: true,
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    borderRadius: 0,
    syncTransform2d3d: false,
    canvasVisibility: 'both',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  } as CanvasEntity;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('serialize', () => {
  it('produces a valid CanvasDocument', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text' }),
      makeEntity({ id: 'e2', type: 'sticker' }),
    ];
    const sceneGraph = createMockSceneGraph(entities);

    const doc = serialize({
      sceneGraph,
      meta: { id: 'canvas-1', name: 'Test', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    });

    expect(doc.version).toBe(CURRENT_VERSION);
    expect(doc.entities).toHaveLength(2);
    expect(doc.meta.name).toBe('Test');
    expect(doc.layoutMode).toBe('freeform');
    expect(doc.platform).toBe('web');
    expect(doc.spatialMode).toBe('2d');
  });

  it('filters invisible entities when includeInvisible is false', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text', visible: true }),
      makeEntity({ id: 'e2', type: 'text', visible: false }),
    ];
    const sceneGraph = createMockSceneGraph(entities);

    const doc = serialize(
      { sceneGraph, meta: { id: '00000000-0000-0000-0000-000000000001', name: 'T', createdAt: '', updatedAt: '' } },
      { includeInvisible: false },
    );

    expect(doc.entities).toHaveLength(1);
    expect(doc.entities[0].id).toBe('e1');
  });

  it('filters locked entities when includeLocked is false', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text', locked: false }),
      makeEntity({ id: 'e2', type: 'text', locked: true }),
    ];
    const sceneGraph = createMockSceneGraph(entities);

    const doc = serialize(
      { sceneGraph, meta: { id: '00000000-0000-0000-0000-000000000001', name: 'T', createdAt: '', updatedAt: '' } },
      { includeLocked: false },
    );

    expect(doc.entities).toHaveLength(1);
  });

  it('applies custom filter predicate', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text' }),
      makeEntity({ id: 'e2', type: 'sticker' }),
    ];
    const sceneGraph = createMockSceneGraph(entities);

    const doc = serialize(
      { sceneGraph, meta: { id: '00000000-0000-0000-0000-000000000001', name: 'T', createdAt: '', updatedAt: '' } },
      { filter: (e) => e.type === 'sticker' },
    );

    expect(doc.entities).toHaveLength(1);
    expect(doc.entities[0].type).toBe('sticker');
  });
});

describe('serializeToJSON', () => {
  it('returns valid JSON string', () => {
    const sceneGraph = createMockSceneGraph([]);
    const json = serializeToJSON({
      sceneGraph,
      meta: { id: '00000000-0000-0000-0000-000000000001', name: 'T', createdAt: '', updatedAt: '' },
    });

    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(CURRENT_VERSION);
    expect(parsed.entities).toEqual([]);
  });
});

describe('createEmptyDocument', () => {
  it('creates a document with no entities', () => {
    const doc = createEmptyDocument('canvas-1', 'New Canvas');

    expect(doc.version).toBe(CURRENT_VERSION);
    expect(doc.meta.id).toBe('canvas-1');
    expect(doc.meta.name).toBe('New Canvas');
    expect(doc.entities).toEqual([]);
    expect(doc.layoutMode).toBe('freeform');
  });

  it('uses custom options', () => {
    const doc = createEmptyDocument('canvas-1', 'Grid Canvas', {
      layoutMode: 'bento',
      spatialMode: '3d',
      description: 'A test canvas',
    });

    expect(doc.layoutMode).toBe('bento');
    expect(doc.spatialMode).toBe('3d');
    expect(doc.meta.description).toBe('A test canvas');
  });
});

describe('extractMetadata', () => {
  it('returns document metadata', () => {
    const doc = createEmptyDocument('c1', 'Test');
    const meta = extractMetadata(doc);
    expect(meta.id).toBe('c1');
    expect(meta.name).toBe('Test');
  });
});

describe('extractEntityIds', () => {
  it('returns array of entity IDs', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text' }),
      makeEntity({ id: 'e2', type: 'sticker' }),
    ];
    const sceneGraph = createMockSceneGraph(entities);
    const doc = serialize({
      sceneGraph,
      meta: { id: '00000000-0000-0000-0000-000000000001', name: 'T', createdAt: '', updatedAt: '' },
    });

    const ids = extractEntityIds(doc);
    expect(ids).toEqual(['e1', 'e2']);
  });
});

describe('countEntitiesByType', () => {
  it('counts entities grouped by type', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'text' }),
      makeEntity({ id: 'e2', type: 'text' }),
      makeEntity({ id: 'e3', type: 'sticker' }),
    ];
    const sceneGraph = createMockSceneGraph(entities);
    const doc = serialize({
      sceneGraph,
      meta: { id: '00000000-0000-0000-0000-000000000001', name: 'T', createdAt: '', updatedAt: '' },
    });

    const counts = countEntitiesByType(doc);
    expect(counts.text).toBe(2);
    expect(counts.sticker).toBe(1);
  });
});
