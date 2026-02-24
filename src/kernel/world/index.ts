/**
 * World Instance Module — Barrel Export
 *
 * @module kernel/world
 *
 * @remarks
 * Provides isolated world instances for multi-canvas scenarios.
 * Each world has its own event bus, state, history, and presence.
 * Game-mode worlds also have a tick loop for physics/animation systems.
 */

export { createWorldInstance, type WorldInstance } from './world-instance';
export { createWorldManager, type WorldManager } from './world-manager';
export {
  createTickLoop,
  type ITickLoop,
  type TickSystem,
  type TickContext,
  type TickLoopState,
  type TickLoopOptions,
} from './tick-loop';
