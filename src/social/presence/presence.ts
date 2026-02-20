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

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { PresenceUser } from '../../kernel/stores/social/social.store';
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

/** Predefined palette of distinct colors for Guest users */
const GUEST_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];

/**
 * Generates a random color for Guest users.
 */
export function generateGuestColor(): string {
  return GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
}

/**
 * Converts a PresenceState (L1) to a PresenceUser (socialStore) bus payload.
 */
function toPresenceUser(state: PresenceState): PresenceUser {
  return {
    userId: state.userId,
    displayName: state.displayName,
    color: state.color,
    cursorPosition: state.cursorPosition ?? null,
    joinedAt: new Date(state.joinedAt).toISOString(),
  };
}

/**
 * Creates a presence manager bound to a canvas channel.
 *
 * @param channel - The canvas channel to track presence on
 * @returns A PresenceManager instance
 */
export function createPresenceManager(channel: CanvasChannel): PresenceManager {
  const presenceMap: Record<string, PresenceState> = {};

  // Listen for presence join events on the underlying Supabase channel
  channel.channel.on('presence', { event: 'join' }, ({ newPresences }: { newPresences: Array<Record<string, unknown>> }) => {
    for (const presence of newPresences) {
      const user = presence as unknown as PresenceState;
      if (!user.userId) continue;
      presenceMap[user.userId] = user;
      bus.emit(SocialEvents.PRESENCE_JOINED, toPresenceUser(user));
    }
  });

  // Listen for presence leave events
  channel.channel.on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: Array<Record<string, unknown>> }) => {
    for (const presence of leftPresences) {
      const user = presence as unknown as PresenceState;
      if (!user.userId) continue;
      delete presenceMap[user.userId];
      bus.emit(SocialEvents.PRESENCE_LEFT, { userId: user.userId });
    }
  });

  // Listen for presence sync (full state reconciliation)
  channel.channel.on('presence', { event: 'sync' }, () => {
    const state = channel.channel.presenceState();
    // Rebuild local map from channel presence state
    for (const key of Object.keys(state)) {
      const presences = state[key] as unknown as PresenceState[];
      if (presences && presences.length > 0) {
        const user = presences[0];
        if (user.userId) {
          presenceMap[user.userId] = user;
        }
      }
    }
  });

  return {
    async join(user: PresenceState): Promise<void> {
      presenceMap[user.userId] = user;
      await channel.channel.track({
        userId: user.userId,
        displayName: user.displayName,
        color: user.color,
        cursorPosition: user.cursorPosition,
        joinedAt: user.joinedAt,
      });
      // Emit local presence join event
      bus.emit(SocialEvents.PRESENCE_JOINED, toPresenceUser(user));
    },

    async leave(): Promise<void> {
      await channel.channel.untrack();
    },

    getPresenceMap(): Record<string, PresenceState> {
      return { ...presenceMap };
    },

    destroy(): void {
      // Clear local map; channel destruction handles underlying cleanup
      for (const key of Object.keys(presenceMap)) {
        delete presenceMap[key];
      }
    },
  };
}
