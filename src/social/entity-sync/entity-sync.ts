/**
 * Entity Transform Broadcast
 *
 * Broadcasts entity position/transform updates during drag (optimistic)
 * and reconciles on drop using last-write-wins (LWW) resolution.
 * Emits `social.entity.transformed` bus event after reconciliation.
 *
 * @module social/entity-sync
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import type { CanvasChannel } from '../channel';

/**
 * Entity transform data broadcast over the channel.
 */
export interface EntityTransform {
  entityId: string;
  position: { x: number; y: number };
  rotation?: number;
  scale?: number;
  userId: string;
  timestamp: number;
}

/**
 * Manages entity transform broadcasting and LWW reconciliation.
 */
export interface EntitySyncManager {
  /** Broadcast an optimistic entity transform during drag */
  broadcastTransform(transform: EntityTransform): void;
  /** Reconcile final position on drop (LWW) */
  reconcileOnDrop(transform: EntityTransform): void;
  /** Clean up subscriptions */
  destroy(): void;
}

/**
 * Creates an entity sync manager for a canvas channel.
 *
 * @param channel - The canvas channel for broadcasting
 * @returns An EntitySyncManager instance
 */
export function createEntitySync(_channel: CanvasChannel): EntitySyncManager {
  // TODO: Implement — see AC4 in current-story.md
  throw new Error('Not implemented: createEntitySync');
}
