/**
 * Social Store — manages presence map and cursor positions
 * @module kernel/stores/social
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { SocialEvents } from '@sn/types';

import { bus } from '../../bus';

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  cursorPosition: { x: number; y: number } | null;
  joinedAt: string;
}

export interface SocialState {
  presenceMap: Record<string, PresenceUser>;
}

export interface SocialActions {
  setPresence: (userId: string, user: PresenceUser) => void;
  removePresence: (userId: string) => void;
  updateCursor: (userId: string, position: { x: number; y: number } | null) => void;
  clearPresence: () => void;
  reset: () => void;
}

export type SocialStore = SocialState & SocialActions;

const initialState: SocialState = {
  presenceMap: {},
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
}
