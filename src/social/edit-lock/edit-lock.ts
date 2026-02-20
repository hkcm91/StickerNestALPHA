/**
 * Edit Lock Manager
 *
 * Advisory per-entity locks that indicate exclusive editing.
 * Locks are broadcast via the canvas channel, expire after 30s
 * of inactivity, and are released on drop, leave, or timeout.
 * Locks are NOT enforced at the data layer — they are UX affordances.
 *
 * @module social/edit-lock
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import type { CanvasChannel } from '../channel';

/** Default lock timeout in milliseconds (30 seconds) */
export const EDIT_LOCK_TIMEOUT_MS = 30_000;

/** Interval for checking expired locks (1 second) */
const EXPIRY_CHECK_INTERVAL_MS = 1_000;

/**
 * Lock state for an entity.
 */
export interface EditLock {
  entityId: string;
  lockedBy: string;
  lockedAt: number;
}

/** Internal broadcast payload with action type */
interface EditLockMessage {
  action: 'acquire' | 'release';
  lock: EditLock;
}

/**
 * Manages advisory edit locks for entities on a canvas.
 */
export interface EditLockManager {
  /** Acquire a lock on an entity (optimistic, broadcast to channel) */
  acquireLock(entityId: string, userId: string): void;
  /** Release a lock on an entity */
  releaseLock(entityId: string): void;
  /** Get the current lock for an entity, if any */
  getLock(entityId: string): EditLock | null;
  /** Get all active locks */
  getAllLocks(): EditLock[];
  /** Clean up all locks and subscriptions */
  destroy(): void;
}

/**
 * Creates an edit lock manager for a canvas channel.
 *
 * @param channel - The canvas channel for lock broadcasts
 * @returns An EditLockManager instance
 */
export function createEditLockManager(channel: CanvasChannel): EditLockManager {
  const locks = new Map<string, EditLock>();
  let destroyed = false;

  // Listen for remote lock broadcasts
  channel.onBroadcast('edit-lock', (payload) => {
    if (destroyed) return;
    const message = payload as EditLockMessage;

    if (message.action === 'acquire') {
      locks.set(message.lock.entityId, message.lock);
    } else if (message.action === 'release') {
      locks.delete(message.lock.entityId);
    }
  });

  // Periodically check for expired locks
  const expiryInterval = setInterval(() => {
    if (destroyed) return;
    const now = Date.now();
    for (const [entityId, lock] of locks) {
      if (now - lock.lockedAt > EDIT_LOCK_TIMEOUT_MS) {
        locks.delete(entityId);
      }
    }
  }, EXPIRY_CHECK_INTERVAL_MS);

  return {
    acquireLock(entityId: string, userId: string): void {
      if (destroyed) return;

      const lock: EditLock = {
        entityId,
        lockedBy: userId,
        lockedAt: Date.now(),
      };

      locks.set(entityId, lock);
      channel.broadcast('edit-lock', {
        action: 'acquire',
        lock,
      } satisfies EditLockMessage);
    },

    releaseLock(entityId: string): void {
      if (destroyed) return;

      const lock = locks.get(entityId);
      if (!lock) return;

      locks.delete(entityId);
      channel.broadcast('edit-lock', {
        action: 'release',
        lock,
      } satisfies EditLockMessage);
    },

    getLock(entityId: string): EditLock | null {
      return locks.get(entityId) ?? null;
    },

    getAllLocks(): EditLock[] {
      return Array.from(locks.values());
    },

    destroy(): void {
      destroyed = true;
      clearInterval(expiryInterval);
      locks.clear();
    },
  };
}
