/**
 * Physics System — Basic 2D Physics for Game-Mode Worlds
 *
 * @module kernel/systems/physics-system
 *
 * @remarks
 * Provides basic 2D physics simulation including:
 * - Velocity-based movement
 * - Gravity
 * - Friction/drag
 * - Basic AABB collision detection
 *
 * Entities must have physics components to be processed.
 */

import type { TickSystem, TickContext } from '../world/tick-loop';

// =============================================================================
// Physics Components
// =============================================================================

/**
 * Position component
 */
export interface PositionComponent {
  x: number;
  y: number;
}

/**
 * Velocity component (units per second)
 */
export interface VelocityComponent {
  vx: number;
  vy: number;
}

/**
 * Physics body component
 */
export interface PhysicsBodyComponent {
  /** Mass in kg (affects momentum) */
  mass: number;
  /** Friction coefficient (0-1, applied each frame) */
  friction: number;
  /** Bounciness / restitution (0-1) */
  restitution: number;
  /** Whether the body is static (doesn't move) */
  isStatic: boolean;
  /** Whether gravity affects this body */
  useGravity: boolean;
}

/**
 * Axis-aligned bounding box for collision
 */
export interface AABBComponent {
  width: number;
  height: number;
  /** Offset from position */
  offsetX: number;
  offsetY: number;
}

/**
 * Entity with physics components
 */
export interface PhysicsEntity {
  id: string;
  position: PositionComponent;
  velocity?: VelocityComponent;
  body?: PhysicsBodyComponent;
  aabb?: AABBComponent;
}

/**
 * Collision result
 */
export interface Collision {
  entityA: string;
  entityB: string;
  overlapX: number;
  overlapY: number;
  normalX: number;
  normalY: number;
}

// =============================================================================
// Physics System Options
// =============================================================================

export interface PhysicsSystemOptions {
  /** Gravity acceleration in units/s² (default: 0, -980 for Earth-like) */
  gravity?: number;
  /** Global friction multiplier (default: 1) */
  frictionMultiplier?: number;
  /** Minimum velocity threshold before stopping (default: 0.01) */
  velocityThreshold?: number;
  /** Enable collision detection (default: true) */
  enableCollisions?: boolean;
}

// =============================================================================
// Physics System Implementation
// =============================================================================

export interface IPhysicsSystem extends TickSystem {
  /** Add an entity to the physics simulation */
  addEntity(entity: PhysicsEntity): void;
  /** Remove an entity from the simulation */
  removeEntity(id: string): void;
  /** Get an entity by ID */
  getEntity(id: string): PhysicsEntity | undefined;
  /** Get all entities */
  getAllEntities(): PhysicsEntity[];
  /** Update an entity's position */
  setPosition(id: string, x: number, y: number): void;
  /** Update an entity's velocity */
  setVelocity(id: string, vx: number, vy: number): void;
  /** Apply an impulse (instant velocity change) */
  applyImpulse(id: string, impulseX: number, impulseY: number): void;
  /** Apply a force (acceleration based on mass) */
  applyForce(id: string, forceX: number, forceY: number): void;
  /** Get collisions from the last tick */
  getCollisions(): ReadonlyArray<Collision>;
  /** Subscribe to collision events */
  onCollision(handler: (collision: Collision) => void): () => void;
}

/**
 * Creates a physics system for game-mode worlds
 */
export function createPhysicsSystem(options?: PhysicsSystemOptions): IPhysicsSystem {
  const gravity = options?.gravity ?? 0;
  const frictionMultiplier = options?.frictionMultiplier ?? 1;
  const velocityThreshold = options?.velocityThreshold ?? 0.01;
  const enableCollisions = options?.enableCollisions ?? true;

  // Entity storage
  const entities = new Map<string, PhysicsEntity>();

  // Collision tracking
  let lastCollisions: Collision[] = [];
  const collisionHandlers = new Set<(collision: Collision) => void>();

  // Force accumulator (cleared each tick)
  const forces = new Map<string, { fx: number; fy: number }>();

  // Helper: Check AABB collision between two entities
  function checkAABBCollision(a: PhysicsEntity, b: PhysicsEntity): Collision | null {
    if (!a.aabb || !b.aabb) return null;

    const aLeft = a.position.x + a.aabb.offsetX;
    const aRight = aLeft + a.aabb.width;
    const aTop = a.position.y + a.aabb.offsetY;
    const aBottom = aTop + a.aabb.height;

    const bLeft = b.position.x + b.aabb.offsetX;
    const bRight = bLeft + b.aabb.width;
    const bTop = b.position.y + b.aabb.offsetY;
    const bBottom = bTop + b.aabb.height;

    // Check for overlap
    if (aRight <= bLeft || aLeft >= bRight || aBottom <= bTop || aTop >= bBottom) {
      return null;
    }

    // Calculate overlap
    const overlapX = Math.min(aRight - bLeft, bRight - aLeft);
    const overlapY = Math.min(aBottom - bTop, bBottom - aTop);

    // Determine collision normal (smallest overlap direction)
    let normalX = 0;
    let normalY = 0;
    if (overlapX < overlapY) {
      normalX = a.position.x < b.position.x ? -1 : 1;
    } else {
      normalY = a.position.y < b.position.y ? -1 : 1;
    }

    return {
      entityA: a.id,
      entityB: b.id,
      overlapX,
      overlapY,
      normalX,
      normalY,
    };
  }

  // Helper: Resolve collision between two entities
  function resolveCollision(collision: Collision): void {
    const a = entities.get(collision.entityA);
    const b = entities.get(collision.entityB);
    if (!a || !b) return;

    const aStatic = a.body?.isStatic ?? false;
    const bStatic = b.body?.isStatic ?? false;

    // If both static, no resolution needed
    if (aStatic && bStatic) return;

    const separationX = collision.overlapX * -collision.normalX;
    const separationY = collision.overlapY * -collision.normalY;

    // Separate entities (move apart along the collision normal)
    // separationX/Y are the amounts to separate, with direction based on normal
    if (aStatic) {
      // Only B moves - away from A (opposite of normal direction)
      b.position.x += separationX;
      b.position.y += separationY;
    } else if (bStatic) {
      // Only A moves - away from B (in normal direction)
      a.position.x -= separationX;
      a.position.y -= separationY;
    } else {
      // Both dynamic - split the separation
      a.position.x -= separationX * 0.5;
      a.position.y -= separationY * 0.5;
      b.position.x += separationX * 0.5;
      b.position.y += separationY * 0.5;
    }

    // Apply restitution (bounce)
    if (a.velocity && b.velocity) {
      const aRestitution = a.body?.restitution ?? 0;
      const bRestitution = b.body?.restitution ?? 0;
      const restitution = Math.max(aRestitution, bRestitution);

      if (collision.normalX !== 0) {
        if (!aStatic) a.velocity.vx *= -restitution;
        if (!bStatic) b.velocity.vx *= -restitution;
      }
      if (collision.normalY !== 0) {
        if (!aStatic) a.velocity.vy *= -restitution;
        if (!bStatic) b.velocity.vy *= -restitution;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // System Implementation
  // ---------------------------------------------------------------------------

  const system: IPhysicsSystem = {
    name: 'physics',
    priority: 100, // High priority - runs early

    tick(ctx: TickContext): void {
      const dt = ctx.deltaTime;
      lastCollisions = [];

      // Process all entities
      for (const entity of entities.values()) {
        // Skip static entities
        if (entity.body?.isStatic) continue;

        // Initialize velocity if not present
        if (!entity.velocity) {
          entity.velocity = { vx: 0, vy: 0 };
        }

        const vel = entity.velocity;

        // Apply accumulated forces
        const force = forces.get(entity.id);
        if (force && entity.body) {
          const mass = entity.body.mass || 1;
          vel.vx += (force.fx / mass) * dt;
          vel.vy += (force.fy / mass) * dt;
        }

        // Apply gravity
        if (entity.body?.useGravity) {
          vel.vy += gravity * dt;
        }

        // Apply friction
        if (entity.body) {
          const friction = entity.body.friction * frictionMultiplier;
          vel.vx *= 1 - friction * dt;
          vel.vy *= 1 - friction * dt;
        }

        // Apply velocity threshold (stop if too slow)
        if (Math.abs(vel.vx) < velocityThreshold) vel.vx = 0;
        if (Math.abs(vel.vy) < velocityThreshold) vel.vy = 0;

        // Update position
        entity.position.x += vel.vx * dt;
        entity.position.y += vel.vy * dt;
      }

      // Clear forces
      forces.clear();

      // Collision detection
      if (enableCollisions) {
        const entityList = Array.from(entities.values());
        for (let i = 0; i < entityList.length; i++) {
          for (let j = i + 1; j < entityList.length; j++) {
            const collision = checkAABBCollision(entityList[i], entityList[j]);
            if (collision) {
              lastCollisions.push(collision);
              resolveCollision(collision);

              // Notify handlers
              for (const handler of collisionHandlers) {
                try {
                  handler(collision);
                } catch (err) {
                  console.error('[PhysicsSystem] Collision handler error:', err);
                }
              }
            }
          }
        }
      }
    },

    onRegister() {
      // Called when system is registered with a tick loop
    },

    onUnregister() {
      // Cleanup
      entities.clear();
      forces.clear();
      collisionHandlers.clear();
    },

    addEntity(entity: PhysicsEntity): void {
      entities.set(entity.id, entity);
    },

    removeEntity(id: string): void {
      entities.delete(id);
      forces.delete(id);
    },

    getEntity(id: string): PhysicsEntity | undefined {
      return entities.get(id);
    },

    getAllEntities(): PhysicsEntity[] {
      return Array.from(entities.values());
    },

    setPosition(id: string, x: number, y: number): void {
      const entity = entities.get(id);
      if (entity) {
        entity.position.x = x;
        entity.position.y = y;
      }
    },

    setVelocity(id: string, vx: number, vy: number): void {
      const entity = entities.get(id);
      if (entity) {
        if (!entity.velocity) {
          entity.velocity = { vx: 0, vy: 0 };
        }
        entity.velocity.vx = vx;
        entity.velocity.vy = vy;
      }
    },

    applyImpulse(id: string, impulseX: number, impulseY: number): void {
      const entity = entities.get(id);
      if (entity) {
        if (!entity.velocity) {
          entity.velocity = { vx: 0, vy: 0 };
        }
        entity.velocity.vx += impulseX;
        entity.velocity.vy += impulseY;
      }
    },

    applyForce(id: string, forceX: number, forceY: number): void {
      let force = forces.get(id);
      if (!force) {
        force = { fx: 0, fy: 0 };
        forces.set(id, force);
      }
      force.fx += forceX;
      force.fy += forceY;
    },

    getCollisions(): ReadonlyArray<Collision> {
      return lastCollisions;
    },

    onCollision(handler: (collision: Collision) => void): () => void {
      collisionHandlers.add(handler);
      return () => {
        collisionHandlers.delete(handler);
      };
    },
  };

  return system;
}
