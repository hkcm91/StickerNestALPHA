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

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useCanvasStore } from '../../kernel/stores/canvas/canvas.store';
import type { CanvasChannel } from '../channel';
import { resolveLWW } from '../conflict';

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

/** Internal broadcast payload with finality flag */
interface EntityTransformMessage extends EntityTransform {
  isFinal: boolean;
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
 * Check if the current user has write permission on the canvas.
 */
function canWrite(): boolean {
  const role = useCanvasStore.getState().userRole;
  return role === 'owner' || role === 'editor';
}

/**
 * Creates an entity sync manager for a canvas channel.
 *
 * @param channel - The canvas channel for broadcasting
 * @returns An EntitySyncManager instance
 */
export function createEntitySync(channel: CanvasChannel): EntitySyncManager {
  const lastKnownTransforms = new Map<string, EntityTransform>();
  let destroyed = false;

  // Listen for remote entity transform broadcasts
  channel.onBroadcast('entity-transform', (payload) => {
    if (destroyed) return;
    const remote = payload as EntityTransformMessage;

    if (remote.isFinal) {
      // Final drop — apply LWW resolution
      const local = lastKnownTransforms.get(remote.entityId);
      let winner: EntityTransform;

      if (local) {
        winner = resolveLWW(
          { value: local, timestamp: local.timestamp },
          { value: remote, timestamp: remote.timestamp },
        );
      } else {
        winner = remote;
      }

      lastKnownTransforms.set(remote.entityId, winner);

      bus.emit(SocialEvents.ENTITY_TRANSFORMED, {
        entityId: winner.entityId,
        position: winner.position,
        rotation: winner.rotation,
        scale: winner.scale,
        userId: winner.userId,
        timestamp: winner.timestamp,
      });
    } else {
      // Optimistic drag — apply immediately for visual feedback
      bus.emit(SocialEvents.ENTITY_TRANSFORMED, {
        entityId: remote.entityId,
        position: remote.position,
        rotation: remote.rotation,
        scale: remote.scale,
        userId: remote.userId,
        timestamp: remote.timestamp,
      });
    }
  });

  return {
    broadcastTransform(transform: EntityTransform): void {
      if (!canWrite()) {
        bus.emit(SocialEvents.CONFLICT_REJECTED, {
          reason: 'permission',
          message: 'You do not have edit permission on this canvas',
        });
        return;
      }

      channel.broadcast('entity-transform', {
        ...transform,
        isFinal: false,
      } satisfies EntityTransformMessage);
    },

    reconcileOnDrop(transform: EntityTransform): void {
      if (!canWrite()) {
        bus.emit(SocialEvents.CONFLICT_REJECTED, {
          reason: 'permission',
          message: 'You do not have edit permission on this canvas',
        });
        return;
      }

      lastKnownTransforms.set(transform.entityId, transform);
      channel.broadcast('entity-transform', {
        ...transform,
        isFinal: true,
      } satisfies EntityTransformMessage);

      // Emit locally for our own canvas layer
      bus.emit(SocialEvents.ENTITY_TRANSFORMED, {
        entityId: transform.entityId,
        position: transform.position,
        rotation: transform.rotation,
        scale: transform.scale,
        userId: transform.userId,
        timestamp: transform.timestamp,
      });
    },

    destroy(): void {
      destroyed = true;
      lastKnownTransforms.clear();
    },
  };
}
