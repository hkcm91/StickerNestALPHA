/**
 * Presence Tracking
 *
 * Tracks user join/leave events on a canvas channel.
 * Updates socialStore via bus events (never directly).
 * Guests appear with label "Guest" and a randomly assigned color.
 *
 * @module social/presence
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import type { CanvasChannel } from '../channel';

/**
 * Presence state for a user on a canvas.
 * Minimum shape per L1-social.md.
 */
export interface PresenceState {
  userId: string;
  displayName: string;
  color: string;
  cursorPosition?: { x: number; y: number };
  joinedAt: number;
}

/**
 * Manages presence tracking for a canvas channel.
 */
export interface PresenceManager {
  /** Join the canvas and broadcast presence to other users */
  join(user: PresenceState): Promise<void>;
  /** Leave the canvas and remove from all clients' presence maps */
  leave(): Promise<void>;
  /** Get the current presence map */
  getPresenceMap(): Record<string, PresenceState>;
  /** Clean up all subscriptions */
  destroy(): void;
}

/**
 * Creates a presence manager bound to a canvas channel.
 *
 * @param channel - The canvas channel to track presence on
 * @returns A PresenceManager instance
 */
export function createPresenceManager(_channel: CanvasChannel): PresenceManager {
  // TODO: Implement — see AC2 in current-story.md
  throw new Error('Not implemented: createPresenceManager');
}

/**
 * Generates a random color for Guest users.
 */
export function generateGuestColor(): string {
  // TODO: Implement
  throw new Error('Not implemented: generateGuestColor');
}
