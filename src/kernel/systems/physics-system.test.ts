/**
 * Physics System Tests
 *
 * @module kernel/systems/physics-system.test
 */

import { describe, it, expect, vi } from 'vitest';

import type { TickContext } from '../world/tick-loop';

import { createPhysicsSystem, type PhysicsEntity } from './physics-system';

// Helper to create a tick context
function createTickContext(deltaTime = 1 / 60): TickContext {
  return {
    deltaTime,
    elapsedTime: deltaTime,
    tickNumber: 1,
    tickRate: 60,
    fixedDeltaTime: 1 / 60,
  };
}

// Helper to create a basic physics entity
function createEntity(id: string, options?: Partial<PhysicsEntity>): PhysicsEntity {
  return {
    id,
    position: { x: 0, y: 0 },
    velocity: { vx: 0, vy: 0 },
    ...options,
  };
}

describe('createPhysicsSystem', () => {
  describe('system properties', () => {
    it('has correct name', () => {
      const system = createPhysicsSystem();
      expect(system.name).toBe('physics');
    });

    it('has high priority', () => {
      const system = createPhysicsSystem();
      expect(system.priority).toBe(100);
    });
  });

  describe('entity management', () => {
    it('adds an entity', () => {
      const system = createPhysicsSystem();
      const entity = createEntity('test');
      system.addEntity(entity);
      expect(system.getEntity('test')).toBe(entity);
    });

    it('removes an entity', () => {
      const system = createPhysicsSystem();
      const entity = createEntity('test');
      system.addEntity(entity);
      system.removeEntity('test');
      expect(system.getEntity('test')).toBeUndefined();
    });

    it('returns all entities', () => {
      const system = createPhysicsSystem();
      system.addEntity(createEntity('a'));
      system.addEntity(createEntity('b'));
      const all = system.getAllEntities();
      expect(all).toHaveLength(2);
      expect(all.map((e) => e.id)).toContain('a');
      expect(all.map((e) => e.id)).toContain('b');
    });
  });

  describe('position updates', () => {
    it('sets entity position', () => {
      const system = createPhysicsSystem();
      system.addEntity(createEntity('test'));
      system.setPosition('test', 100, 200);
      const entity = system.getEntity('test');
      expect(entity?.position.x).toBe(100);
      expect(entity?.position.y).toBe(200);
    });

    it('moves entity based on velocity', () => {
      const system = createPhysicsSystem();
      const entity = createEntity('test', {
        velocity: { vx: 100, vy: 50 },
      });
      system.addEntity(entity);

      const dt = 0.1; // 100ms
      system.tick(createTickContext(dt));

      expect(entity.position.x).toBeCloseTo(10, 5); // 100 * 0.1
      expect(entity.position.y).toBeCloseTo(5, 5); // 50 * 0.1
    });
  });

  describe('velocity', () => {
    it('sets entity velocity', () => {
      const system = createPhysicsSystem();
      system.addEntity(createEntity('test'));
      system.setVelocity('test', 50, 100);
      const entity = system.getEntity('test');
      expect(entity?.velocity?.vx).toBe(50);
      expect(entity?.velocity?.vy).toBe(100);
    });

    it('initializes velocity if not present', () => {
      const system = createPhysicsSystem();
      system.addEntity({
        id: 'test',
        position: { x: 0, y: 0 },
        // No velocity
      });
      system.setVelocity('test', 10, 20);
      const entity = system.getEntity('test');
      expect(entity?.velocity?.vx).toBe(10);
      expect(entity?.velocity?.vy).toBe(20);
    });

    it('stops velocity below threshold', () => {
      const system = createPhysicsSystem({ velocityThreshold: 0.5 });
      const entity = createEntity('test', {
        velocity: { vx: 0.1, vy: 0.1 },
      });
      system.addEntity(entity);
      system.tick(createTickContext());
      expect(entity.velocity?.vx).toBe(0);
      expect(entity.velocity?.vy).toBe(0);
    });
  });

  describe('impulse and force', () => {
    it('applies impulse as instant velocity change', () => {
      const system = createPhysicsSystem();
      const entity = createEntity('test', {
        velocity: { vx: 10, vy: 0 },
      });
      system.addEntity(entity);
      system.applyImpulse('test', 5, 10);
      expect(entity.velocity?.vx).toBe(15);
      expect(entity.velocity?.vy).toBe(10);
    });

    it('applies force as acceleration based on mass', () => {
      const system = createPhysicsSystem();
      const entity = createEntity('test', {
        velocity: { vx: 0, vy: 0 },
        body: {
          mass: 2,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      system.addEntity(entity);
      system.applyForce('test', 20, 10); // Force = 20, 10

      const dt = 0.1;
      system.tick(createTickContext(dt));

      // acceleration = force / mass = (20, 10) / 2 = (10, 5)
      // velocity change = acceleration * dt = (10, 5) * 0.1 = (1, 0.5)
      expect(entity.velocity?.vx).toBeCloseTo(1, 5);
      expect(entity.velocity?.vy).toBeCloseTo(0.5, 5);
    });

    it('accumulates multiple forces', () => {
      const system = createPhysicsSystem();
      const entity = createEntity('test', {
        velocity: { vx: 0, vy: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      system.addEntity(entity);
      system.applyForce('test', 10, 0);
      system.applyForce('test', 5, 5);

      const dt = 0.1;
      system.tick(createTickContext(dt));

      // Total force = (15, 5), mass = 1, dt = 0.1
      // velocity = (15, 5) * 0.1 = (1.5, 0.5)
      expect(entity.velocity?.vx).toBeCloseTo(1.5, 5);
      expect(entity.velocity?.vy).toBeCloseTo(0.5, 5);
    });
  });

  describe('gravity', () => {
    it('applies gravity when enabled', () => {
      const system = createPhysicsSystem({ gravity: -980 });
      const entity = createEntity('test', {
        velocity: { vx: 0, vy: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: true,
        },
      });
      system.addEntity(entity);

      const dt = 0.1;
      system.tick(createTickContext(dt));

      // gravity velocity change = -980 * 0.1 = -98
      expect(entity.velocity?.vy).toBeCloseTo(-98, 5);
    });

    it('does not apply gravity when disabled', () => {
      const system = createPhysicsSystem({ gravity: -980 });
      const entity = createEntity('test', {
        velocity: { vx: 0, vy: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      system.addEntity(entity);

      system.tick(createTickContext(0.1));

      expect(entity.velocity?.vy).toBe(0);
    });
  });

  describe('friction', () => {
    it('applies friction to reduce velocity', () => {
      const system = createPhysicsSystem();
      const entity = createEntity('test', {
        velocity: { vx: 100, vy: 100 },
        body: {
          mass: 1,
          friction: 0.5,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      system.addEntity(entity);

      const dt = 0.1;
      system.tick(createTickContext(dt));

      // velocity *= 1 - friction * dt = 1 - 0.5 * 0.1 = 0.95
      expect(entity.velocity?.vx).toBeCloseTo(95, 5);
      expect(entity.velocity?.vy).toBeCloseTo(95, 5);
    });

    it('uses friction multiplier', () => {
      const system = createPhysicsSystem({ frictionMultiplier: 2 });
      const entity = createEntity('test', {
        velocity: { vx: 100, vy: 100 },
        body: {
          mass: 1,
          friction: 0.5,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      system.addEntity(entity);

      const dt = 0.1;
      system.tick(createTickContext(dt));

      // velocity *= 1 - friction * multiplier * dt = 1 - 0.5 * 2 * 0.1 = 0.9
      expect(entity.velocity?.vx).toBeCloseTo(90, 5);
      expect(entity.velocity?.vy).toBeCloseTo(90, 5);
    });
  });

  describe('static entities', () => {
    it('does not move static entities', () => {
      const system = createPhysicsSystem({ gravity: -980 });
      const entity = createEntity('test', {
        position: { x: 100, y: 100 },
        velocity: { vx: 50, vy: 50 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: true,
          useGravity: true,
        },
      });
      system.addEntity(entity);

      system.tick(createTickContext(0.1));

      expect(entity.position.x).toBe(100);
      expect(entity.position.y).toBe(100);
    });
  });

  describe('AABB collision', () => {
    it('detects collision between overlapping entities', () => {
      const system = createPhysicsSystem();

      const entityA = createEntity('a', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      const entityB = createEntity('b', {
        position: { x: 25, y: 25 }, // Overlapping
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });

      system.addEntity(entityA);
      system.addEntity(entityB);
      system.tick(createTickContext());

      const collisions = system.getCollisions();
      expect(collisions.length).toBe(1);
      expect(collisions[0].entityA).toBe('a');
      expect(collisions[0].entityB).toBe('b');
    });

    it('does not detect collision between non-overlapping entities', () => {
      const system = createPhysicsSystem();

      const entityA = createEntity('a', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
      });
      const entityB = createEntity('b', {
        position: { x: 100, y: 100 }, // Not overlapping
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
      });

      system.addEntity(entityA);
      system.addEntity(entityB);
      system.tick(createTickContext());

      expect(system.getCollisions().length).toBe(0);
    });

    it('calls collision handler on collision', () => {
      const system = createPhysicsSystem();
      const handler = vi.fn();
      system.onCollision(handler);

      const entityA = createEntity('a', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      const entityB = createEntity('b', {
        position: { x: 25, y: 25 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });

      system.addEntity(entityA);
      system.addEntity(entityB);
      system.tick(createTickContext());

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].entityA).toBe('a');
      expect(handler.mock.calls[0][0].entityB).toBe('b');
    });

    it('allows unsubscribing from collision events', () => {
      const system = createPhysicsSystem();
      const handler = vi.fn();
      const unsubscribe = system.onCollision(handler);

      const entityA = createEntity('a', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      const entityB = createEntity('b', {
        position: { x: 25, y: 25 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });

      system.addEntity(entityA);
      system.addEntity(entityB);
      unsubscribe();
      system.tick(createTickContext());

      expect(handler).not.toHaveBeenCalled();
    });

    it('resolves collision by separating entities', () => {
      const system = createPhysicsSystem();

      const entityA = createEntity('a', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      const entityB = createEntity('b', {
        position: { x: 40, y: 0 }, // Overlapping by 10px in X
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });

      system.addEntity(entityA);
      system.addEntity(entityB);
      system.tick(createTickContext());

      // After resolution, entities should not overlap
      const aRight = entityA.position.x + 50;
      const bLeft = entityB.position.x;
      expect(aRight).toBeLessThanOrEqual(bLeft + 0.01);
    });

    it('resolves collision with static entity by moving only dynamic entity', () => {
      const system = createPhysicsSystem();

      const staticEntity = createEntity('static', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: true,
          useGravity: false,
        },
      });
      const dynamicEntity = createEntity('dynamic', {
        position: { x: 40, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });

      system.addEntity(staticEntity);
      system.addEntity(dynamicEntity);

      const originalStaticX = staticEntity.position.x;
      system.tick(createTickContext());

      expect(staticEntity.position.x).toBe(originalStaticX);
      expect(dynamicEntity.position.x).toBeGreaterThan(40);
    });

    it('can disable collisions', () => {
      const system = createPhysicsSystem({ enableCollisions: false });

      const entityA = createEntity('a', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
      });
      const entityB = createEntity('b', {
        position: { x: 25, y: 25 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
      });

      system.addEntity(entityA);
      system.addEntity(entityB);
      system.tick(createTickContext());

      expect(system.getCollisions().length).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('clears all state on unregister', () => {
      const system = createPhysicsSystem();
      system.addEntity(createEntity('a'));
      system.addEntity(createEntity('b'));
      system.onCollision(() => {});

      system.onUnregister?.();

      expect(system.getAllEntities().length).toBe(0);
    });

    it('handles collision handler errors gracefully', () => {
      const system = createPhysicsSystem();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      system.onCollision(() => {
        throw new Error('Handler error');
      });

      const entityA = createEntity('a', {
        position: { x: 0, y: 0 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });
      const entityB = createEntity('b', {
        position: { x: 25, y: 25 },
        aabb: { width: 50, height: 50, offsetX: 0, offsetY: 0 },
        body: {
          mass: 1,
          friction: 0,
          restitution: 0,
          isStatic: false,
          useGravity: false,
        },
      });

      system.addEntity(entityA);
      system.addEntity(entityB);

      // Should not throw
      expect(() => system.tick(createTickContext())).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
