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

/**
 * Lock state for an entity.
 */
export interface EditLock {
  entityId: string;
  lockedBy: string;
  lockedAt: number;
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
export function createEditLockManager(_channel: CanvasChannel): EditLockManager {
  // TODO: Implement — see AC8 in current-story.md
  throw new Error('Not implemented: createEditLockManager');
}
