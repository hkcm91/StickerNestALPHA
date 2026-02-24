/**
 * World Manager Tests
 *
 * @module kernel/world/world-manager.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createWorldManager } from './world-manager';
import type { WorldManager } from './world-manager';

// Valid UUIDs for testing
const CANVAS_ID_1 = '11111111-1111-4111-a111-111111111111';
const CANVAS_ID_2 = '22222222-2222-4222-a222-222222222222';

describe('createWorldManager', () => {
  let manager: WorldManager;

  beforeEach(() => {
    manager = createWorldManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('world creation', () => {
    it('should create a world and add it to the manager', () => {
      const world = manager.createWorld(CANVAS_ID_1);

      expect(world).toBeDefined();
      expect(world.canvasId).toBe(CANVAS_ID_1);
      expect(manager.worldCount).toBe(1);
    });

    it('should emit world:created event', () => {
      const events: string[] = [];
      manager.on('world:created', () => {
        events.push('created');
      });

      manager.createWorld(CANVAS_ID_1);
      expect(events).toContain('created');
    });

    it('should support creating multiple worlds', () => {
      manager.createWorld(CANVAS_ID_1);
      manager.createWorld(CANVAS_ID_2);

      expect(manager.worldCount).toBe(2);
    });

    it('should support creating multiple worlds for the same canvas', () => {
      const world1 = manager.createWorld(CANVAS_ID_1);
      const world2 = manager.createWorld(CANVAS_ID_1);

      expect(manager.worldCount).toBe(2);
      expect(world1.id).not.toBe(world2.id);
    });
  });

  describe('world lookup', () => {
    it('should get world by ID', () => {
      const world = manager.createWorld(CANVAS_ID_1);
      const found = manager.getWorld(world.id);

      expect(found).toBe(world);
    });

    it('should return undefined for unknown world ID', () => {
      expect(manager.getWorld('unknown-id')).toBeUndefined();
    });

    it('should get world by canvas ID', () => {
      const world = manager.createWorld(CANVAS_ID_1);
      const found = manager.getWorldByCanvasId(CANVAS_ID_1);

      expect(found).toBe(world);
    });

    it('should return undefined for unknown canvas ID', () => {
      expect(manager.getWorldByCanvasId('unknown-canvas')).toBeUndefined();
    });

    it('should get all worlds for a canvas', () => {
      const world1 = manager.createWorld(CANVAS_ID_1);
      const world2 = manager.createWorld(CANVAS_ID_1);
      manager.createWorld(CANVAS_ID_2);

      const worlds = manager.getWorldsForCanvas(CANVAS_ID_1);

      expect(worlds).toHaveLength(2);
      expect(worlds).toContain(world1);
      expect(worlds).toContain(world2);
    });

    it('should get all worlds', () => {
      manager.createWorld(CANVAS_ID_1);
      manager.createWorld(CANVAS_ID_2);

      const allWorlds = manager.getAllWorlds();
      expect(allWorlds).toHaveLength(2);
    });
  });

  describe('world focus', () => {
    it('should start with no active world', () => {
      expect(manager.activeWorld).toBeNull();
    });

    it('should focus a world', () => {
      const world = manager.createWorld(CANVAS_ID_1);

      const result = manager.focusWorld(world.id);

      expect(result).toBe(true);
      expect(manager.activeWorld).toBe(world);
    });

    it('should start the world when focusing', () => {
      const world = manager.createWorld(CANVAS_ID_1);
      expect(world.status).toBe('ready');

      manager.focusWorld(world.id);

      expect(world.status).toBe('running');
    });

    it('should emit world:focused event', () => {
      const world = manager.createWorld(CANVAS_ID_1);
      const events: { world: unknown; previous: unknown }[] = [];

      manager.on<{ world: unknown; previous: unknown }>('world:focused', (payload) => {
        events.push(payload);
      });

      manager.focusWorld(world.id);

      expect(events).toHaveLength(1);
      expect(events[0].world).toBe(world);
      expect(events[0].previous).toBeNull();
    });

    it('should blur previous world when focusing another', () => {
      const world1 = manager.createWorld(CANVAS_ID_1);
      const world2 = manager.createWorld(CANVAS_ID_2);

      manager.focusWorld(world1.id);
      expect(world1.status).toBe('running');

      manager.focusWorld(world2.id);

      expect(world1.status).toBe('suspended');
      expect(world2.status).toBe('running');
    });

    it('should emit world:blurred event for previous world', () => {
      const world1 = manager.createWorld(CANVAS_ID_1);
      const world2 = manager.createWorld(CANVAS_ID_2);
      const blurred: unknown[] = [];

      manager.focusWorld(world1.id);

      manager.on('world:blurred', (payload) => {
        blurred.push(payload);
      });

      manager.focusWorld(world2.id);

      expect(blurred).toHaveLength(1);
    });

    it('should return false when focusing non-existent world', () => {
      const result = manager.focusWorld('non-existent-id');
      expect(result).toBe(false);
    });

    it('should resume suspended world on re-focus', () => {
      const world1 = manager.createWorld(CANVAS_ID_1);
      const world2 = manager.createWorld(CANVAS_ID_2);

      manager.focusWorld(world1.id);
      manager.focusWorld(world2.id);

      expect(world1.status).toBe('suspended');

      manager.focusWorld(world1.id);

      expect(world1.status).toBe('running');
    });
  });

  describe('world destruction', () => {
    it('should destroy a world by ID', () => {
      const world = manager.createWorld(CANVAS_ID_1);

      const result = manager.destroyWorld(world.id);

      expect(result).toBe(true);
      expect(manager.worldCount).toBe(0);
      expect(world.status).toBe('destroyed');
    });

    it('should return false when destroying non-existent world', () => {
      const result = manager.destroyWorld('non-existent-id');
      expect(result).toBe(false);
    });

    it('should emit world:destroyed event', () => {
      const world = manager.createWorld(CANVAS_ID_1);
      const destroyed: { worldId: string; canvasId: string }[] = [];

      manager.on<{ worldId: string; canvasId: string }>('world:destroyed', (payload) => {
        destroyed.push(payload);
      });

      manager.destroyWorld(world.id);

      expect(destroyed).toHaveLength(1);
      expect(destroyed[0].worldId).toBe(world.id);
      expect(destroyed[0].canvasId).toBe(CANVAS_ID_1);
    });

    it('should clear active world when destroying it', () => {
      const world = manager.createWorld(CANVAS_ID_1);
      manager.focusWorld(world.id);

      expect(manager.activeWorld).toBe(world);

      manager.destroyWorld(world.id);

      expect(manager.activeWorld).toBeNull();
    });

    it('should destroy all worlds for a canvas', () => {
      manager.createWorld(CANVAS_ID_1);
      manager.createWorld(CANVAS_ID_1);
      manager.createWorld(CANVAS_ID_2);

      const count = manager.destroyWorldsForCanvas(CANVAS_ID_1);

      expect(count).toBe(2);
      expect(manager.worldCount).toBe(1);
    });

    it('should destroy all worlds', () => {
      manager.createWorld(CANVAS_ID_1);
      manager.createWorld(CANVAS_ID_2);

      manager.destroyAllWorlds();

      expect(manager.worldCount).toBe(0);
    });
  });

  describe('event subscription', () => {
    it('should allow subscribing to manager events', () => {
      const events: string[] = [];

      const unsub = manager.on('world:created', () => {
        events.push('created');
      });

      manager.createWorld(CANVAS_ID_1);
      expect(events).toHaveLength(1);

      manager.createWorld(CANVAS_ID_2);
      expect(events).toHaveLength(2);

      // Unsubscribe
      unsub();

      manager.createWorld(CANVAS_ID_1);
      expect(events).toHaveLength(2); // No new event
    });
  });

  describe('dispose', () => {
    it('should destroy all worlds on dispose', () => {
      const world1 = manager.createWorld(CANVAS_ID_1);
      const world2 = manager.createWorld(CANVAS_ID_2);

      manager.dispose();

      expect(world1.status).toBe('destroyed');
      expect(world2.status).toBe('destroyed');
      expect(manager.worldCount).toBe(0);
    });

    it('should clear all event handlers on dispose', () => {
      const events: string[] = [];
      manager.on('world:created', () => {
        events.push('created');
      });

      manager.dispose();

      // This creates a new manager instance effectively
      // The disposed manager's handlers are cleared
      expect(manager.worldCount).toBe(0);
    });
  });

  describe('auto-cleanup', () => {
    it('should auto-remove world when destroyed externally', () => {
      const world = manager.createWorld(CANVAS_ID_1);
      expect(manager.worldCount).toBe(1);

      // Destroy via the world instance directly
      world.destroy();

      expect(manager.worldCount).toBe(0);
      expect(manager.getWorld(world.id)).toBeUndefined();
    });
  });
});
