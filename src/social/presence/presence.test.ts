import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useSocialStore, setupSocialBusSubscriptions } from '../../kernel/stores/social/social.store';
import type { CanvasChannel } from '../channel';

import { createPresenceManager, generateGuestColor } from './presence';
import type { PresenceState } from './presence';

/**
 * Creates a mock CanvasChannel for testing presence.
 * Captures presence event handlers registered via channel.on('presence', ...).
 */
function createMockChannel(): CanvasChannel & {
  _simulatePresenceJoin: (presences: PresenceState[]) => void;
  _simulatePresenceLeave: (presences: PresenceState[]) => void;
  _simulatePresenceSync: () => void;
} {
  const presenceHandlers: Record<string, (data: Record<string, unknown>) => void> = {};

  const mockChannel = {
    on: vi.fn((type: string, filter: { event: string }, cb: (data: Record<string, unknown>) => void) => {
      if (type === 'presence') {
        presenceHandlers[filter.event] = cb;
      }
      return mockChannel;
    }),
    track: vi.fn().mockResolvedValue('ok'),
    untrack: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn(() => ({})),
    send: vi.fn(),
    subscribe: vi.fn(),
  };

  return {
    canvasId: 'test-canvas',
    channel: mockChannel as unknown as CanvasChannel['channel'],
    async join() {},
    async leave() {},
    isConnected: () => true,
    broadcast: vi.fn(),
    onBroadcast: vi.fn(),

    _simulatePresenceJoin(presences: PresenceState[]) {
      presenceHandlers['join']?.({ newPresences: presences });
    },
    _simulatePresenceLeave(presences: PresenceState[]) {
      presenceHandlers['leave']?.({ leftPresences: presences });
    },
    _simulatePresenceSync() {
      presenceHandlers['sync']?.({});
    },
  };
}

const testUser: PresenceState = {
  userId: 'user-1',
  displayName: 'Alice',
  color: '#FF0000',
  joinedAt: Date.now(),
};

const guestUser: PresenceState = {
  userId: 'guest-1',
  displayName: 'Guest',
  color: '#4ECDC4',
  joinedAt: Date.now(),
};

beforeEach(() => {
  bus.unsubscribeAll();
  useSocialStore.getState().reset();
});

describe('PresenceManager', () => {
  it('tracks join event and updates socialStore via bus event', async () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.join(testUser);

    const store = useSocialStore.getState();
    expect(store.presenceMap['user-1']).toBeDefined();
    expect(store.presenceMap['user-1'].displayName).toBe('Alice');
    expect(store.presenceMap['user-1'].color).toBe('#FF0000');
  });

  it('tracks leave event and removes from socialStore via bus event', async () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.join(testUser);
    expect(useSocialStore.getState().presenceMap['user-1']).toBeDefined();

    // Simulate remote leave
    mock._simulatePresenceLeave([testUser]);
    expect(useSocialStore.getState().presenceMap['user-1']).toBeUndefined();
  });

  it('guests appear with label "Guest" and assigned color', async () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.join(guestUser);

    const store = useSocialStore.getState();
    expect(store.presenceMap['guest-1'].displayName).toBe('Guest');
    expect(store.presenceMap['guest-1'].color).toBe('#4ECDC4');
  });

  it('removes user from presence map promptly on disconnect', () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    createPresenceManager(mock);

    // Simulate remote join then leave
    mock._simulatePresenceJoin([testUser]);
    expect(useSocialStore.getState().presenceMap['user-1']).toBeDefined();

    mock._simulatePresenceLeave([testUser]);
    expect(useSocialStore.getState().presenceMap['user-1']).toBeUndefined();
  });

  it('includes userId, displayName, color, cursorPosition, joinedAt', async () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    const userWithCursor: PresenceState = {
      ...testUser,
      cursorPosition: { x: 100, y: 200 },
    };
    await manager.join(userWithCursor);

    const stored = useSocialStore.getState().presenceMap['user-1'];
    expect(stored.userId).toBe('user-1');
    expect(stored.displayName).toBe('Alice');
    expect(stored.color).toBe('#FF0000');
    expect(stored.cursorPosition).toEqual({ x: 100, y: 200 });
    expect(stored.joinedAt).toBeDefined();
  });

  it('join event skips entries without userId', () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    createPresenceManager(mock);

    // Simulate join with one valid and one entry missing userId
    mock._simulatePresenceJoin([
      testUser,
      { displayName: 'NoId', color: '#CCCCCC', joinedAt: Date.now() } as unknown as PresenceState,
    ]);

    const store = useSocialStore.getState();
    expect(store.presenceMap['user-1']).toBeDefined();
    expect(Object.keys(store.presenceMap)).toHaveLength(1);
  });

  it('leave event skips entries without userId', () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    // Join a user first
    mock._simulatePresenceJoin([testUser]);
    expect(useSocialStore.getState().presenceMap['user-1']).toBeDefined();

    // Simulate leave with an entry missing userId — should not throw
    mock._simulatePresenceLeave([
      { displayName: 'NoId', color: '#CCCCCC', joinedAt: Date.now() } as unknown as PresenceState,
    ]);

    // Original user should still be present
    expect(useSocialStore.getState().presenceMap['user-1']).toBeDefined();
    expect(Object.keys(manager.getPresenceMap())).toHaveLength(1);
  });

  it('handles multiple users joining the same canvas', async () => {
    setupSocialBusSubscriptions();
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.join(testUser);
    mock._simulatePresenceJoin([guestUser]);

    const store = useSocialStore.getState();
    expect(Object.keys(store.presenceMap)).toHaveLength(2);
    expect(store.presenceMap['user-1']).toBeDefined();
    expect(store.presenceMap['guest-1']).toBeDefined();
  });

  it('emits social.presence.joined on join', async () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.PRESENCE_JOINED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    const manager = createPresenceManager(mock);
    await manager.join(testUser);

    expect(events).toHaveLength(1);
    const payload = events[0] as Record<string, unknown>;
    expect(payload.userId).toBe('user-1');
    expect(payload.displayName).toBe('Alice');
  });

  it('emits social.presence.left on leave', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.PRESENCE_LEFT, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    createPresenceManager(mock);
    mock._simulatePresenceLeave([testUser]);

    expect(events).toHaveLength(1);
    const payload = events[0] as Record<string, unknown>;
    expect(payload.userId).toBe('user-1');
  });

  it('getPresenceMap() returns current presence state', async () => {
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.join(testUser);
    const map = manager.getPresenceMap();
    expect(map['user-1']).toBeDefined();
    expect(map['user-1'].displayName).toBe('Alice');
  });

  it('destroy() clears local presence map', async () => {
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.join(testUser);
    expect(Object.keys(manager.getPresenceMap())).toHaveLength(1);

    manager.destroy();
    expect(Object.keys(manager.getPresenceMap())).toHaveLength(0);
  });

  it('join() calls channel.track() with user state', async () => {
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.join(testUser);
    expect(mock.channel.track).toHaveBeenCalledWith({
      userId: 'user-1',
      displayName: 'Alice',
      color: '#FF0000',
      cursorPosition: undefined,
      joinedAt: testUser.joinedAt,
    });
  });

  it('leave() calls channel.untrack()', async () => {
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    await manager.leave();
    expect(mock.channel.untrack).toHaveBeenCalled();
  });

  it('sync event rebuilds local presence map from channel state', () => {
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    // Mock presenceState to return two users
    (mock.channel.presenceState as ReturnType<typeof vi.fn>).mockReturnValue({
      'key-1': [{ userId: 'user-a', displayName: 'Alice', color: '#FF0000', joinedAt: Date.now() }],
      'key-2': [{ userId: 'user-b', displayName: 'Bob', color: '#00FF00', joinedAt: Date.now() }],
    });

    mock._simulatePresenceSync();

    const map = manager.getPresenceMap();
    expect(Object.keys(map)).toHaveLength(2);
    expect(map['user-a'].displayName).toBe('Alice');
    expect(map['user-b'].displayName).toBe('Bob');
  });

  it('sync event skips entries without userId', () => {
    const mock = createMockChannel();
    const manager = createPresenceManager(mock);

    // Mock presenceState with one valid and one invalid entry
    (mock.channel.presenceState as ReturnType<typeof vi.fn>).mockReturnValue({
      'key-1': [{ userId: 'user-a', displayName: 'Alice', color: '#FF0000', joinedAt: Date.now() }],
      'key-2': [{ displayName: 'NoId', color: '#CCCCCC', joinedAt: Date.now() }],
      'key-3': [{}],
    });

    mock._simulatePresenceSync();

    const map = manager.getPresenceMap();
    expect(Object.keys(map)).toHaveLength(1);
    expect(map['user-a']).toBeDefined();
  });
});

describe('generateGuestColor', () => {
  it('returns a valid hex color string', () => {
    const color = generateGuestColor();
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('returns colors from the palette', () => {
    // Run many times and check all results are valid hex colors
    for (let i = 0; i < 50; i++) {
      const color = generateGuestColor();
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
