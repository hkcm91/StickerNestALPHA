/**
 * Social Store — manages presence map and cursor positions
 * @module kernel/stores/social
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { SocialEvents } from '@sn/types';

import { bus } from '../../bus';

/** A user present on the active canvas (including Guests) */
export interface PresenceUser {
  /** User ID (or guest ID) */
  userId: string;
  /** Display name shown next to their cursor ("Guest" for anonymous users) */
  displayName: string;
  /** Randomly assigned cursor/avatar color */
  color: string;
  /** Current cursor position in canvas-space coordinates, null if off-canvas */
  cursorPosition: { x: number; y: number } | null;
  /** ISO timestamp when the user joined the canvas session */
  joinedAt: string;
}

export interface EditLockEntry {
  entityId: string;
  lockedBy: string;
  lockedAt: string;
}

export interface SocialState {
  presenceMap: Record<string, PresenceUser>;
  /** Edit locks keyed by entityId */
  editLocks: Record<string, EditLockEntry>;
  /** Whether the realtime connection is active */
  isOnline: boolean;
}

/** Actions for managing the presence map — driven by social.* bus events from Layer 1 */
export interface SocialActions {
  /** Adds or updates a user in the presence map */
  setPresence: (userId: string, user: PresenceUser) => void;
  /** Removes a user from presence (on disconnect/leave) */
  removePresence: (userId: string) => void;
  /** Updates a specific user's cursor position (throttled to 30fps by Layer 1) */
  updateCursor: (userId: string, position: { x: number; y: number } | null) => void;
  /** Clears all presence data (e.g., on canvas leave) */
  clearPresence: () => void;
  /** Sets an edit lock on an entity */
  setEditLock: (entityId: string, lock: EditLockEntry) => void;
  /** Removes an edit lock from an entity */
  removeEditLock: (entityId: string) => void;
  /** Sets connection status */
  setOnline: (online: boolean) => void;
  /** Resets to initial state */
  reset: () => void;
}

export type SocialStore = SocialState & SocialActions;

const initialState: SocialState = {
  presenceMap: {},
  editLocks: {},
  isOnline: true,
};

export const useSocialStore = create<SocialStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialState,

      setPresence: (userId, user) =>
        set((state) => ({
          presenceMap: { ...state.presenceMap, [userId]: user },
        })),

      removePresence: (userId) =>
        set((state) => {
          const { [userId]: _removed, ...rest } = state.presenceMap;
          return { presenceMap: rest };
        }),

      updateCursor: (userId, position) =>
        set((state) => {
          const user = state.presenceMap[userId];
          if (!user) return state;
          return {
            presenceMap: {
              ...state.presenceMap,
              [userId]: { ...user, cursorPosition: position },
            },
          };
        }),

      clearPresence: () => set({ presenceMap: {} }),

      setEditLock: (entityId, lock) =>
        set((state) => ({
          editLocks: { ...state.editLocks, [entityId]: lock },
        })),

      removeEditLock: (entityId) =>
        set((state) => {
          const { [entityId]: _removed, ...rest } = state.editLocks;
          return { editLocks: rest };
        }),

      setOnline: (online) => set({ isOnline: online }),

      reset: () => set(initialState),
    })),
    { name: 'socialStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Derived selector: number of users present */
export const selectUserCount = (state: SocialStore): number =>
  Object.keys(state.presenceMap).length;

/** Subscribe to social-related bus events for cross-store coordination */
export function setupSocialBusSubscriptions(): void {
  // Presence joined — add user to presence map
  bus.subscribe(SocialEvents.PRESENCE_JOINED, (event: BusEvent) => {
    const payload = event.payload as PresenceUser | null;
    if (payload && payload.userId) {
      useSocialStore.getState().setPresence(payload.userId, payload);
    }
  });

  // Presence left — remove user from presence map
  bus.subscribe(SocialEvents.PRESENCE_LEFT, (event: BusEvent) => {
    const payload = event.payload as { userId: string } | null;
    if (payload && payload.userId) {
      useSocialStore.getState().removePresence(payload.userId);
    }
  });

  // Cursor moved — update cursor position
  bus.subscribe(SocialEvents.CURSOR_MOVED, (event: BusEvent) => {
    const payload = event.payload as {
      userId: string;
      position: { x: number; y: number } | null;
    } | null;
    if (payload && payload.userId) {
      useSocialStore.getState().updateCursor(payload.userId, payload.position);
    }
  });

  // Edit lock acquired — add lock to store
  bus.subscribe(SocialEvents.EDIT_LOCK_ACQUIRED, (event: BusEvent) => {
    const payload = event.payload as {
      entityId: string;
      lockedBy: string;
      lockedAt: string;
    } | null;
    if (payload && payload.entityId) {
      useSocialStore.getState().setEditLock(payload.entityId, payload);
    }
  });

  // Edit lock released — remove lock from store
  bus.subscribe(SocialEvents.EDIT_LOCK_RELEASED, (event: BusEvent) => {
    const payload = event.payload as { entityId: string } | null;
    if (payload && payload.entityId) {
      useSocialStore.getState().removeEditLock(payload.entityId);
    }
  });

  // Connection status changes
  bus.subscribe(SocialEvents.CONNECTION_LOST, () => {
    useSocialStore.getState().setOnline(false);
  });

  bus.subscribe(SocialEvents.CONNECTION_RESTORED, () => {
    useSocialStore.getState().setOnline(true);
  });
}
