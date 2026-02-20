/**
 * Offline Degradation Manager
 *
 * Handles graceful degradation when the Realtime channel loses connection:
 * - Hides all remote cursors (no stale positions)
 * - Continues accepting local edits and stores them locally
 * - No error states for routine interruptions under 5 seconds
 * - On reconnect: re-join channel, re-broadcast presence, reconcile edits
 *
 * @module social/offline
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import type { CanvasChannel } from '../channel';

/** Grace period before showing offline state (ms) */
export const OFFLINE_GRACE_PERIOD_MS = 5_000;

/**
 * Offline edit queued for replay on reconnect.
 */
export interface QueuedEdit {
  type: 'entity-transform' | 'datasource-update';
  payload: unknown;
  timestamp: number;
}

/**
 * Manages offline degradation and reconnection.
 */
export interface OfflineManager {
  /** Whether the channel is currently disconnected */
  isOffline(): boolean;
  /** Queue a local edit for replay on reconnect */
  queueEdit(edit: QueuedEdit): void;
  /** Get all queued edits */
  getQueuedEdits(): QueuedEdit[];
  /** Clean up */
  destroy(): void;
}

/**
 * Creates an offline manager for a canvas channel.
 *
 * @param channel - The canvas channel to monitor
 * @returns An OfflineManager instance
 */
export function createOfflineManager(_channel: CanvasChannel): OfflineManager {
  // TODO: Implement — see AC9 in current-story.md
  throw new Error('Not implemented: createOfflineManager');
}
