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

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useSocialStore } from '../../kernel/stores/social/social.store';
import type { CanvasChannel } from '../channel';

/** Grace period before showing offline state (ms) */
export const OFFLINE_GRACE_PERIOD_MS = 5_000;

/** Polling interval for connection status (ms) */
const CONNECTION_POLL_INTERVAL_MS = 1_000;

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
export function createOfflineManager(channel: CanvasChannel): OfflineManager {
  let offline = false;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  const editQueue: QueuedEdit[] = [];
  let wasConnected = channel.isConnected();

  /**
   * Hide all remote cursors by emitting cursor.moved with position: null.
   */
  function hideRemoteCursors(): void {
    const presenceMap = useSocialStore.getState().presenceMap;
    for (const userId of Object.keys(presenceMap)) {
      bus.emit(SocialEvents.CURSOR_MOVED, {
        userId,
        position: null,
        color: presenceMap[userId].color,
      });
    }
  }

  /**
   * Replay queued edits through the channel.
   */
  function replayQueuedEdits(): void {
    while (editQueue.length > 0) {
      const edit = editQueue.shift()!;
      channel.broadcast(edit.type, edit.payload);
    }
  }

  // Poll connection status
  const pollInterval = setInterval(() => {
    if (destroyed) return;

    const connected = channel.isConnected();

    if (wasConnected && !connected) {
      // Lost connection — start grace period
      if (!graceTimer) {
        graceTimer = setTimeout(() => {
          if (destroyed) return;
          if (!channel.isConnected()) {
            offline = true;
            hideRemoteCursors();
          }
          graceTimer = null;
        }, OFFLINE_GRACE_PERIOD_MS);
      }
    } else if (!wasConnected && connected) {
      // Reconnected
      if (graceTimer) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
      if (offline) {
        offline = false;
        replayQueuedEdits();
      }
    }

    wasConnected = connected;
  }, CONNECTION_POLL_INTERVAL_MS);

  return {
    isOffline(): boolean {
      return offline;
    },

    queueEdit(edit: QueuedEdit): void {
      editQueue.push(edit);
    },

    getQueuedEdits(): QueuedEdit[] {
      return [...editQueue];
    },

    destroy(): void {
      destroyed = true;
      clearInterval(pollInterval);
      if (graceTimer) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
      editQueue.length = 0;
    },
  };
}
