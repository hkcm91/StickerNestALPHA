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
  _channel: CanvasChannel,
  _userId: string,
  _color: string,
): CursorBroadcaster {
  // TODO: Implement — see AC3 in current-story.md
  throw new Error('Not implemented: createCursorBroadcaster');
}
