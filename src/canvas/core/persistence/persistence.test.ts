/**
 * Canvas Persistence tests
 * @module canvas/core/persistence
 */

import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach } from 'vitest';

import type { CanvasEntity, TextEntity } from '@sn/types';

import { createSceneGraph } from '../scene';

import {
  // Version
  CURRENT_VERSION,
  MIN_SUPPORTED_VERSION,
  isVersionSupported,
  needsMigration,
  getMigrationPath,
  // Serialization
  serialize,
  serializeToJSON,
  createEmptyDocument,
  extractMetadata,
  extractEntityIds,
  // Deserialization
  deserialize,
  deserializeToSceneGraph,
  looksLikeCanvasDocument,
  peekEntityCount,
  peekVersion,
  // Migrations
  registerMigration,
  clearMigrations,
  migrate,
  getRegisteredMigrations,
} from './index';

describe('Version Management', () => {
  describe('isVersionSupported', () => {
    it('should support current version', () => {
      expect(isVersionSupported(CURRENT_VERSION)).toBe(true);
    });

    it('should support minimum version', () => {
      expect(isVersionSupported(MIN_SUPPORTED_VERSION)).toBe(true);
    });

    it('should reject versions below minimum', () => {
      expect(isVersionSupported(MIN_SUPPORTED_VERSION - 1)).toBe(false);
    });

    it('should reject versions above current', () => {
      expect(isVersionSupported(CURRENT_VERSION + 1)).toBe(false);
    });
  });

  describe('needsMigration', () => {
    it('should return false for current version', () => {
      expect(needsMigration(CURRENT_VERSION)).toBe(false);
    });

    it('should return true for older versions', () => {
      if (CURRENT_VERSION > MIN_SUPPORTED_VERSION) {
        expect(needsMigration(MIN_SUPPORTED_VERSION)).toBe(true);
      }
    });
  });

  describe('getMigrationPath', () => {
    it('should return empty array if no migration needed', () => {
      expect(getMigrationPath(CURRENT_VERSION)).toEqual([]);
    });

    it('should return correct path for multi-step migration', () => {
      expect(getMigrationPath(1, 3)).toEqual([1, 2]);
    });
  });
});

describe('Serialization', () => {
  const createTestEntity = (): TextEntity => {
    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      type: 'text',
      canvasId: uuidv4(),
      transform: {
        position: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 1,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      borderRadius: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: uuidv4(),
      content: 'Test Text',
      fontFamily: 'system-ui',
      fontSize: 16,
      fontWeight: 400,
      color: '#000000',
      textAlign: 'left',
    };
  };

  describe('serialize', () => {
    it('should serialize empty scene graph', () => {
      const sceneGraph = createSceneGraph();
      const meta = {
        id: uuidv4(),
        name: 'Test Canvas',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const doc = serialize({ sceneGraph, meta });

      expect(doc.version).toBe(CURRENT_VERSION);
      expect(doc.meta).toEqual(meta);
      expect(doc.entities).toEqual([]);
      expect(doc.layoutMode).toBe('freeform');
    });

    it('should serialize scene graph with entities', () => {
      const canvasId = uuidv4();
      const sceneGraph = createSceneGraph();
      const entity = { ...createTestEntity(), canvasId };
      sceneGraph.addEntity(entity);

      const meta = {
        id: canvasId,
        name: 'Test Canvas',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const doc = serialize({ sceneGraph, meta });

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].id).toBe(entity.id);
    });

    it('should include viewport config', () => {
      const sceneGraph = createSceneGraph();
      const meta = {
        id: uuidv4(),
        name: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const doc = serialize({
        sceneGraph,
        meta,
        viewportConfig: {
          width: 1920,
          height: 1080,
          background: { type: 'solid', color: '#f0f0f0', opacity: 1 },
        },
      });

      expect(doc.viewport.width).toBe(1920);
      expect(doc.viewport.height).toBe(1080);
      expect(doc.viewport.background.type).toBe('solid');
    });

    it('should include layout mode', () => {
      const sceneGraph = createSceneGraph();
      const meta = {
        id: uuidv4(),
        name: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const doc = serialize({
        sceneGraph,
        meta,
        layoutMode: 'bento',
      });

      expect(doc.layoutMode).toBe('bento');
    });

    it('should filter invisible entities when option set', () => {
      const canvasId = uuidv4();
      const sceneGraph = createSceneGraph();

      const visibleEntity = { ...createTestEntity(), canvasId, visible: true };
      const invisibleEntity = { ...createTestEntity(), canvasId, visible: false };

      sceneGraph.addEntity(visibleEntity);
      sceneGraph.addEntity(invisibleEntity);

      const meta = {
        id: canvasId,
        name: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const doc = serialize({ sceneGraph, meta }, { includeInvisible: false });

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].id).toBe(visibleEntity.id);
    });
  });

  describe('serializeToJSON', () => {
    it('should return valid JSON string', () => {
      const sceneGraph = createSceneGraph();
      const meta = {
        id: uuidv4(),
        name: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const json = serializeToJSON({ sceneGraph, meta });

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('createEmptyDocument', () => {
    it('should create minimal document', () => {
      const id = uuidv4();
      const doc = createEmptyDocument(id, 'New Canvas');

      expect(doc.version).toBe(CURRENT_VERSION);
      expect(doc.meta.id).toBe(id);
      expect(doc.meta.name).toBe('New Canvas');
      expect(doc.entities).toEqual([]);
      expect(doc.layoutMode).toBe('freeform');
    });

    it('should accept options', () => {
      const id = uuidv4();
      const doc = createEmptyDocument(id, 'Test', {
        layoutMode: 'desktop',
        description: 'A test canvas',
      });

      expect(doc.layoutMode).toBe('desktop');
      expect(doc.meta.description).toBe('A test canvas');
    });
  });

  describe('extractMetadata', () => {
    it('should extract meta from document', () => {
      const doc = createEmptyDocument(uuidv4(), 'Test');
      const meta = extractMetadata(doc);

      expect(meta).toEqual(doc.meta);
    });
  });

  describe('extractEntityIds', () => {
    it('should return entity IDs', () => {
      const doc = createEmptyDocument(uuidv4(), 'Test');
      const entity1 = { id: uuidv4() } as CanvasEntity;
      const entity2 = { id: uuidv4() } as CanvasEntity;
      doc.entities = [entity1, entity2] as CanvasEntity[];

      const ids = extractEntityIds(doc);

      expect(ids).toEqual([entity1.id, entity2.id]);
    });
  });
});

describe('Deserialization', () => {
  const createValidDocJson = (): string => {
    const now = new Date().toISOString();
    return JSON.stringify({
      version: CURRENT_VERSION,
      meta: {
        id: uuidv4(),
        name: 'Test Canvas',
        createdAt: now,
        updatedAt: now,
      },
      viewport: {
        background: { type: 'solid', color: '#ffffff', opacity: 1 },
      },
      entities: [],
      layoutMode: 'freeform',
    });
  };

  describe('deserialize', () => {
    it('should deserialize valid JSON string', () => {
      const json = createValidDocJson();
      const result = deserialize(json);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.wasMigrated).toBe(false);
    });

    it('should deserialize valid object', () => {
      const obj = JSON.parse(createValidDocJson());
      const result = deserialize(obj);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
    });

    it('should reject invalid JSON', () => {
      const result = deserialize('not valid json {');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should reject unsupported version', () => {
      const doc = JSON.parse(createValidDocJson());
      doc.version = CURRENT_VERSION + 100;

      const result = deserialize(doc);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should reject documents missing required fields', () => {
      const result = deserialize({ version: 1 });

      expect(result.success).toBe(false);
    });
  });

  describe('deserializeToSceneGraph', () => {
    it('should populate scene graph with entities', () => {
      const canvasId = uuidv4();
      const now = new Date().toISOString();

      const doc = {
        version: CURRENT_VERSION,
        meta: {
          id: canvasId,
          name: 'Test',
          createdAt: now,
          updatedAt: now,
        },
        viewport: {
          background: { type: 'solid', color: '#fff', opacity: 1 },
        },
        entities: [
          {
            id: uuidv4(),
            type: 'text',
            canvasId,
            transform: {
              position: { x: 0, y: 0 },
              size: { width: 100, height: 50 },
              rotation: 0,
              scale: 1,
            },
            zIndex: 1,
            visible: true,
            locked: false,
            opacity: 1,
            borderRadius: 0,
            createdAt: now,
            updatedAt: now,
            createdBy: uuidv4(),
            content: 'Hello',
            fontFamily: 'system-ui',
            fontSize: 16,
            fontWeight: 400,
            color: '#000',
            textAlign: 'left',
          },
        ],
        layoutMode: 'freeform',
      };

      const sceneGraph = createSceneGraph();
      const result = deserializeToSceneGraph(doc, sceneGraph);

      expect(result.success).toBe(true);
      expect(sceneGraph.getAllEntities()).toHaveLength(1);
    });
  });

  describe('looksLikeCanvasDocument', () => {
    it('should return true for valid structure', () => {
      const doc = JSON.parse(createValidDocJson());
      expect(looksLikeCanvasDocument(doc)).toBe(true);
    });

    it('should return true for valid JSON string', () => {
      const json = createValidDocJson();
      expect(looksLikeCanvasDocument(json)).toBe(true);
    });

    it('should return false for invalid structure', () => {
      expect(looksLikeCanvasDocument({ foo: 'bar' })).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(looksLikeCanvasDocument('string')).toBe(false);
      expect(looksLikeCanvasDocument(123)).toBe(false);
      expect(looksLikeCanvasDocument(null)).toBe(false);
    });
  });

  describe('peekEntityCount', () => {
    it('should return entity count without full parsing', () => {
      const doc = JSON.parse(createValidDocJson());
      doc.entities = [{}, {}, {}];

      expect(peekEntityCount(doc)).toBe(3);
    });

    it('should return null for invalid input', () => {
      expect(peekEntityCount('invalid')).toBe(null);
    });
  });

  describe('peekVersion', () => {
    it('should return version without full parsing', () => {
      const doc = { version: 5 };
      expect(peekVersion(doc)).toBe(5);
    });

    it('should return null for invalid input', () => {
      expect(peekVersion({})).toBe(null);
    });
  });
});

describe('Migrations', () => {
  beforeEach(() => {
    clearMigrations();
  });

  describe('registerMigration', () => {
    it('should register a migration', () => {
      registerMigration(1, (doc) => ({ ...doc, version: 2 }));
      expect(getRegisteredMigrations()).toContain(1);
    });

    it('should throw if migration already exists', () => {
      registerMigration(1, (doc) => doc);
      expect(() => registerMigration(1, (doc) => doc)).toThrow();
    });
  });

  describe('migrate', () => {
    it('should apply single migration', () => {
      registerMigration(1, (doc) => ({
        ...doc,
        version: 2,
        meta: { ...doc.meta, name: doc.meta.name + ' (migrated)' },
      }));

      const doc = createEmptyDocument(uuidv4(), 'Test');
      doc.version = 1;

      const migrated = migrate(doc, 1, 2);

      expect(migrated.version).toBe(2);
      expect(migrated.meta.name).toContain('(migrated)');
    });

    it('should apply multiple migrations in sequence', () => {
      registerMigration(1, (doc) => ({ ...doc, version: 2 }));
      registerMigration(2, (doc) => ({ ...doc, version: 3 }));

      const doc = createEmptyDocument(uuidv4(), 'Test');
      doc.version = 1;

      const migrated = migrate(doc, 1, 3);

      expect(migrated.version).toBe(3);
    });

    it('should throw if migration is missing', () => {
      const doc = createEmptyDocument(uuidv4(), 'Test');
      doc.version = 1;

      expect(() => migrate(doc, 1, 2)).toThrow('Missing migration');
    });

    it('should return same document if no migration needed', () => {
      const doc = createEmptyDocument(uuidv4(), 'Test');

      const result = migrate(doc, CURRENT_VERSION, CURRENT_VERSION);

      expect(result).toBe(doc);
    });
  });
});

describe('Round-trip', () => {
  it('should preserve data through serialize -> deserialize', () => {
    const canvasId = uuidv4();
    const now = new Date().toISOString();
    const sceneGraph = createSceneGraph();

    // Add a text entity
    const entity: TextEntity = {
      id: uuidv4(),
      type: 'text',
      canvasId,
      transform: {
        position: { x: 100, y: 200 },
        size: { width: 300, height: 50 },
        rotation: 45,
        scale: 1.5,
      },
      zIndex: 5,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      borderRadius: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: uuidv4(),
      content: 'Round-trip test',
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: 600,
      color: '#333333',
      textAlign: 'center',
    };
    sceneGraph.addEntity(entity);

    const meta = {
      id: canvasId,
      name: 'Round-trip Test',
      createdAt: now,
      updatedAt: now,
    };

    // Serialize
    const doc = serialize({ sceneGraph, meta, layoutMode: 'bento' });
    const json = JSON.stringify(doc);

    // Deserialize to new scene graph
    const newSceneGraph = createSceneGraph();
    const result = deserializeToSceneGraph(json, newSceneGraph);

    expect(result.success).toBe(true);

    // Verify round-trip
    const restoredEntities = newSceneGraph.getAllEntities();
    expect(restoredEntities).toHaveLength(1);

    const restored = restoredEntities[0] as TextEntity;
    expect(restored.id).toBe(entity.id);
    expect(restored.content).toBe(entity.content);
    expect(restored.transform.position).toEqual(entity.transform.position);
    expect(restored.transform.rotation).toBe(entity.transform.rotation);
  });
});
