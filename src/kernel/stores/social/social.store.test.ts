/**
 * Social Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SocialEvents } from '@sn/types';

import { bus } from '../../bus';

import {
  useSocialStore,
  selectUserCount,
  setupSocialBusSubscriptions,
} from './social.store';
import type { PresenceUser } from './social.store';

const mockPresenceUser: PresenceUser = {
  userId: 'user-1',
  displayName: 'Alice',
  color: '#FF5733',
  cursorPosition: null,
  joinedAt: '2026-01-01T00:00:00.000Z',
};

const mockPresenceUser2: PresenceUser = {
  userId: 'user-2',
  displayName: 'Guest',
  color: '#33FF57',
  cursorPosition: { x: 100, y: 200 },
  joinedAt: '2026-01-01T00:01:00.000Z',
};

describe('socialStore', () => {
  beforeEach(() => {
    useSocialStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have empty presenceMap', () => {
      expect(useSocialStore.getState().presenceMap).toEqual({});
    });
  });

  describe('actions', () => {
    it('setPresence should add user to presenceMap', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      expect(useSocialStore.getState().presenceMap['user-1']).toEqual(mockPresenceUser);
    });

    it('setPresence should overwrite existing user', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      const updated = { ...mockPresenceUser, displayName: 'Alice Updated' };
      useSocialStore.getState().setPresence('user-1', updated);
      expect(useSocialStore.getState().presenceMap['user-1'].displayName).toBe('Alice Updated');
    });

    it('removePresence should remove user from presenceMap', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      useSocialStore.getState().removePresence('user-1');
      expect(useSocialStore.getState().presenceMap['user-1']).toBeUndefined();
    });

    it('removePresence should not affect other users', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      useSocialStore.getState().setPresence('user-2', mockPresenceUser2);
      useSocialStore.getState().removePresence('user-1');
      expect(useSocialStore.getState().presenceMap['user-2']).toEqual(mockPresenceUser2);
    });

    it('updateCursor should update cursor position', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      useSocialStore.getState().updateCursor('user-1', { x: 50, y: 75 });
      expect(useSocialStore.getState().presenceMap['user-1'].cursorPosition).toEqual({ x: 50, y: 75 });
    });

    it('updateCursor should set position to null', () => {
      useSocialStore.getState().setPresence('user-1', { ...mockPresenceUser, cursorPosition: { x: 10, y: 20 } });
      useSocialStore.getState().updateCursor('user-1', null);
      expect(useSocialStore.getState().presenceMap['user-1'].cursorPosition).toBeNull();
    });

    it('updateCursor should no-op for unknown user', () => {
      const before = useSocialStore.getState().presenceMap;
      useSocialStore.getState().updateCursor('unknown', { x: 10, y: 20 });
      expect(useSocialStore.getState().presenceMap).toBe(before);
    });

    it('clearPresence should empty presenceMap', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      useSocialStore.getState().setPresence('user-2', mockPresenceUser2);
      useSocialStore.getState().clearPresence();
      expect(useSocialStore.getState().presenceMap).toEqual({});
    });

    it('reset should restore initial state', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      useSocialStore.getState().reset();
      expect(useSocialStore.getState().presenceMap).toEqual({});
    });
  });

  describe('selectors', () => {
    it('selectUserCount returns 0 for empty map', () => {
      expect(selectUserCount(useSocialStore.getState())).toBe(0);
    });

    it('selectUserCount returns correct count', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      useSocialStore.getState().setPresence('user-2', mockPresenceUser2);
      expect(selectUserCount(useSocialStore.getState())).toBe(2);
    });

    it('selectUserCount updates after removal', () => {
      useSocialStore.getState().setPresence('user-1', mockPresenceUser);
      useSocialStore.getState().setPresence('user-2', mockPresenceUser2);
      useSocialStore.getState().removePresence('user-1');
      expect(selectUserCount(useSocialStore.getState())).toBe(1);
    });
  });

  describe('bus subscriptions', () => {
    it('should add presence on social.presence.joined', () => {
      setupSocialBusSubscriptions();

      bus.emit(SocialEvents.PRESENCE_JOINED, mockPresenceUser);

      expect(useSocialStore.getState().presenceMap['user-1']).toEqual(mockPresenceUser);
    });

    it('should ignore presence.joined with null payload', () => {
      setupSocialBusSubscriptions();

      bus.emit(SocialEvents.PRESENCE_JOINED, null);

      expect(Object.keys(useSocialStore.getState().presenceMap)).toHaveLength(0);
    });

    it('should remove presence on social.presence.left', () => {
      setupSocialBusSubscriptions();

      useSocialStore.getState().setPresence('user-1', mockPresenceUser);

      bus.emit(SocialEvents.PRESENCE_LEFT, { userId: 'user-1' });

      expect(useSocialStore.getState().presenceMap['user-1']).toBeUndefined();
    });

    it('should ignore presence.left with null payload', () => {
      setupSocialBusSubscriptions();

      useSocialStore.getState().setPresence('user-1', mockPresenceUser);

      bus.emit(SocialEvents.PRESENCE_LEFT, null);

      expect(useSocialStore.getState().presenceMap['user-1']).toEqual(mockPresenceUser);
    });

    it('should update cursor on social.cursor.moved', () => {
      setupSocialBusSubscriptions();

      useSocialStore.getState().setPresence('user-1', mockPresenceUser);

      bus.emit(SocialEvents.CURSOR_MOVED, {
        userId: 'user-1',
        position: { x: 300, y: 400 },
      });

      expect(useSocialStore.getState().presenceMap['user-1'].cursorPosition).toEqual({ x: 300, y: 400 });
    });

    it('should ignore cursor.moved with null payload', () => {
      setupSocialBusSubscriptions();

      useSocialStore.getState().setPresence('user-1', mockPresenceUser);

      bus.emit(SocialEvents.CURSOR_MOVED, null);

      expect(useSocialStore.getState().presenceMap['user-1'].cursorPosition).toBeNull();
    });

    it('should handle cursor.moved for unknown user gracefully', () => {
      setupSocialBusSubscriptions();

      // Should not throw
      bus.emit(SocialEvents.CURSOR_MOVED, {
        userId: 'unknown-user',
        position: { x: 10, y: 20 },
      });

      expect(useSocialStore.getState().presenceMap['unknown-user']).toBeUndefined();
    });
  });
});
