/**
 * Cursor Broadcast
 *
 * Broadcasts local cursor position to all other users in the canvas channel.
 * Throttled to 30fps maximum (33ms window) to prevent channel flooding.
 * Incoming cursor positions update socialStore via bus events.
 *
 * @module social/cursor
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { CanvasChannel } from '../channel';

/** 30fps throttle = 33ms between broadcasts */
export const CURSOR_THROTTLE_MS = 33;

/**
 * Canvas-space cursor position.
 */
export interface CursorPosition {
  x: number;
  y: number;
}

/**
 * Cursor data broadcast to other users.
 */
export interface CursorData {
  userId: string;
  position: CursorPosition;
  color: string;
}

/**
 * Manages cursor position broadcasting for a canvas session.
 */
export interface CursorBroadcaster {
  /** Broadcast the local cursor position (throttled to 30fps) */
  broadcastPosition(position: CursorPosition): void;
  /** Stop broadcasting and clean up */
  stop(): void;
}

/**
 * Creates a cursor broadcaster bound to a canvas channel.
 *
 * @param channel - The canvas channel to broadcast on
 * @param userId - The local user's ID
 * @param color - The local user's assigned color
 * @returns A CursorBroadcaster instance
 */
export function createCursorBroadcaster(
  channel: CanvasChannel,
  userId: string,
  color: string,
): CursorBroadcaster {
  let lastBroadcastTime = 0;
  let pendingPosition: CursorPosition | null = null;
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  // Listen for incoming cursor broadcasts from other users
  channel.onBroadcast('cursor', (payload) => {
    if (stopped) return;
    const data = payload as CursorData;
    // Filter out own cursor — only emit for remote users
    if (data.userId !== userId) {
      bus.emit(SocialEvents.CURSOR_MOVED, {
        userId: data.userId,
        position: data.position,
        color: data.color,
      });
    }
  });

  function doBroadcast(position: CursorPosition): void {
    channel.broadcast('cursor', {
      userId,
      position,
      color,
    } satisfies CursorData);
    lastBroadcastTime = Date.now();
  }

  return {
    broadcastPosition(position: CursorPosition): void {
      if (stopped) return;

      const now = Date.now();
      const elapsed = now - lastBroadcastTime;

      if (elapsed >= CURSOR_THROTTLE_MS) {
        // Enough time has passed — send immediately
        doBroadcast(position);
        pendingPosition = null;
      } else {
        // Within throttle window — queue and send when window opens
        pendingPosition = position;
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            if (pendingPosition && !stopped) {
              doBroadcast(pendingPosition);
              pendingPosition = null;
            }
            throttleTimer = null;
          }, CURSOR_THROTTLE_MS - elapsed);
        }
      }
    },

    stop(): void {
      stopped = true;
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      pendingPosition = null;
    },
  };
}
