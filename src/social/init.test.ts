import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAuthStore } from '../kernel/stores/auth/auth.store';
import { useSocialStore } from '../kernel/stores/social/social.store';

// Mock all manager factories
vi.mock('./channel', () => ({
  createCanvasChannel: vi.fn(() => ({
    canvasId: 'test-canvas',
    channel: {},
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    isConnected: () => true,
    broadcast: vi.fn(),
    onBroadcast: vi.fn(),
  })),
}));

vi.mock('./presence', () => ({
  createPresenceManager: vi.fn(() => ({
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    getPresenceMap: vi.fn(() => ({})),
    destroy: vi.fn(),
  })),
  generateGuestColor: vi.fn(() => '#FF6B6B'),
}));

vi.mock('./cursor', () => ({
  createCursorBroadcaster: vi.fn(() => ({
    broadcastPosition: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('./entity-sync', () => ({
  createEntitySync: vi.fn(() => ({
    broadcastTransform: vi.fn(),
    reconcileOnDrop: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('./yjs-sync', () => ({
  createYjsSync: vi.fn(() => ({
    getDoc: vi.fn(),
    startSync: vi.fn(),
    stopSync: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('./edit-lock', () => ({
  createEditLockManager: vi.fn(() => ({
    acquireLock: vi.fn(),
    releaseLock: vi.fn(),
    getLock: vi.fn(() => null),
    getAllLocks: vi.fn(() => []),
    destroy: vi.fn(),
  })),
}));

vi.mock('./offline', () => ({
  createOfflineManager: vi.fn(() => ({
    isOffline: vi.fn(() => false),
    queueEdit: vi.fn(),
    getQueuedEdits: vi.fn(() => []),
    destroy: vi.fn(),
  })),
}));

// Must import AFTER mocks are set up
import { createCanvasChannel } from './channel';
import { createCursorBroadcaster } from './cursor';
import { createEditLockManager } from './edit-lock';
import { createEntitySync } from './entity-sync';
import { initSocial, isSocialInitialized, teardownSocial } from './init';
import { createOfflineManager } from './offline';
import { createPresenceManager } from './presence';
import { createYjsSync } from './yjs-sync';

beforeEach(async () => {
  vi.clearAllMocks();
  useAuthStore.getState().reset();
  useSocialStore.getState().reset();
  // Reset module state by tearing down if initialized
  if (isSocialInitialized()) {
    await teardownSocial();
  }
});

describe('initSocial', () => {
  it('creates canvas channel on init', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(createCanvasChannel).toHaveBeenCalledWith('canvas-1');
  });

  it('sets up presence manager', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(createPresenceManager).toHaveBeenCalledTimes(1);
  });

  it('sets up cursor broadcaster', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(createCursorBroadcaster).toHaveBeenCalledTimes(1);
    // Should pass userId and color
    expect(createCursorBroadcaster).toHaveBeenCalledWith(
      expect.anything(), // channel
      'user-1',
      expect.any(String), // color
    );
  });

  it('sets up entity sync manager', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(createEntitySync).toHaveBeenCalledTimes(1);
  });

  it('sets up yjs sync manager', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(createYjsSync).toHaveBeenCalledTimes(1);
  });

  it('sets up edit lock manager', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(createEditLockManager).toHaveBeenCalledTimes(1);
  });

  it('sets up offline manager', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(createOfflineManager).toHaveBeenCalledTimes(1);
  });

  it('joins the channel after creating managers', async () => {
    await initSocial('canvas-1', 'user-1');

    const channelInstance = vi.mocked(createCanvasChannel).mock.results[0].value;
    expect(channelInstance.join).toHaveBeenCalled();
  });

  it('is idempotent — second call is a no-op', async () => {
    await initSocial('canvas-1', 'user-1');
    await initSocial('canvas-1', 'user-1');

    expect(createCanvasChannel).toHaveBeenCalledTimes(1);
  });

  it('uses guest color when no auth user', async () => {
    // No auth user set → should be treated as Guest
    await initSocial('canvas-1', 'user-1');

    expect(createCursorBroadcaster).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      '#FF6B6B', // from mocked generateGuestColor
    );
  });

  it('uses default color when auth user exists', async () => {
    useAuthStore.getState().setUser({
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      tier: 'creator',
    });

    await initSocial('canvas-1', 'user-1');

    expect(createCursorBroadcaster).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      '#3B82F6', // default authenticated color
    );
  });
});

describe('teardownSocial', () => {
  it('destroys all managers', async () => {
    await initSocial('canvas-1', 'user-1');

    const entitySyncInstance = vi.mocked(createEntitySync).mock.results[0].value;
    const yjsSyncInstance = vi.mocked(createYjsSync).mock.results[0].value;
    const editLockInstance = vi.mocked(createEditLockManager).mock.results[0].value;
    const offlineInstance = vi.mocked(createOfflineManager).mock.results[0].value;
    const cursorInstance = vi.mocked(createCursorBroadcaster).mock.results[0].value;
    const presenceInstance = vi.mocked(createPresenceManager).mock.results[0].value;

    await teardownSocial();

    expect(entitySyncInstance.destroy).toHaveBeenCalled();
    expect(yjsSyncInstance.destroy).toHaveBeenCalled();
    expect(editLockInstance.destroy).toHaveBeenCalled();
    expect(offlineInstance.destroy).toHaveBeenCalled();
    expect(cursorInstance.stop).toHaveBeenCalled();
    expect(presenceInstance.destroy).toHaveBeenCalled();
  });

  it('leaves the canvas channel', async () => {
    await initSocial('canvas-1', 'user-1');
    const channelInstance = vi.mocked(createCanvasChannel).mock.results[0].value;

    await teardownSocial();

    expect(channelInstance.leave).toHaveBeenCalled();
  });

  it('clears socialStore presence', async () => {
    useSocialStore.getState().setPresence('user-x', {
      userId: 'user-x',
      displayName: 'X',
      color: '#000',
      cursorPosition: null,
      joinedAt: new Date().toISOString(),
    });
    expect(Object.keys(useSocialStore.getState().presenceMap)).toHaveLength(1);

    await initSocial('canvas-1', 'user-1');
    await teardownSocial();

    expect(Object.keys(useSocialStore.getState().presenceMap)).toHaveLength(0);
  });

  it('is a no-op if not initialized', async () => {
    // Should not throw
    await teardownSocial();
  });
});

describe('isSocialInitialized', () => {
  it('returns false before init', () => {
    expect(isSocialInitialized()).toBe(false);
  });

  it('returns true after init', async () => {
    await initSocial('canvas-1', 'user-1');

    expect(isSocialInitialized()).toBe(true);
  });

  it('returns false after teardown', async () => {
    await initSocial('canvas-1', 'user-1');
    await teardownSocial();

    expect(isSocialInitialized()).toBe(false);
  });
});
