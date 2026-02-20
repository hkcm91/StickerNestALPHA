/**
 * Social Layer Initialization
 *
 * Initializes the social/sync layer for a canvas session.
 * Creates the channel, presence manager, cursor broadcaster,
 * entity sync, Yjs sync, edit lock, and offline infrastructure.
 *
 * IMPORTANT: All onBroadcast() handlers are registered by manager
 * constructors, so channel.join() must be called AFTER all managers
 * are created.
 *
 * @module social/init
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import { useAuthStore } from '../kernel/stores/auth/auth.store';
import { useSocialStore } from '../kernel/stores/social/social.store';

import { createCanvasChannel } from './channel';
import type { CanvasChannel } from './channel';
import { createCursorBroadcaster } from './cursor';
import type { CursorBroadcaster } from './cursor';
import { createEditLockManager } from './edit-lock';
import type { EditLockManager } from './edit-lock';
import { createEntitySync } from './entity-sync';
import type { EntitySyncManager } from './entity-sync';
import { createOfflineManager } from './offline';
import type { OfflineManager } from './offline';
import { createPresenceManager, generateGuestColor } from './presence';
import type { PresenceManager } from './presence';
import { createYjsSync } from './yjs-sync';
import type { YjsSyncManager } from './yjs-sync';

// Module-scope references for teardown
let channel: CanvasChannel | null = null;
let presenceManager: PresenceManager | null = null;
let cursorBroadcaster: CursorBroadcaster | null = null;
let entitySync: EntitySyncManager | null = null;
let yjsSync: YjsSyncManager | null = null;
let editLockManager: EditLockManager | null = null;
let offlineManager: OfflineManager | null = null;
let initialized = false;

/**
 * Initialize the social layer for a canvas session.
 *
 * Creates all managers (which register onBroadcast handlers),
 * then joins the channel and broadcasts presence.
 *
 * @param canvasId - The canvas to join
 * @param userId - The current user's ID
 */
export async function initSocial(canvasId: string, userId: string): Promise<void> {
  if (initialized) return;

  // 1. Create the channel
  channel = createCanvasChannel(canvasId);

  // 2. Determine user info
  const authUser = useAuthStore.getState().user;
  const displayName = authUser?.displayName ?? 'Guest';
  const isGuest = !authUser;
  const color = isGuest ? generateGuestColor() : '#3B82F6';

  // 3. Create all managers (they register onBroadcast handlers in constructors)
  presenceManager = createPresenceManager(channel);
  cursorBroadcaster = createCursorBroadcaster(channel, userId, color);
  entitySync = createEntitySync(channel);
  yjsSync = createYjsSync(channel);
  editLockManager = createEditLockManager(channel);
  offlineManager = createOfflineManager(channel);

  // 4. Join the channel — AFTER all onBroadcast registrations
  await channel.join();

  // 5. Join presence after channel connects
  await presenceManager.join({
    userId,
    displayName,
    color,
    joinedAt: Date.now(),
  });

  initialized = true;
}

/**
 * Tear down the social layer and clean up all resources.
 */
export async function teardownSocial(): Promise<void> {
  if (!initialized) return;

  // Destroy managers in reverse order
  offlineManager?.destroy();
  offlineManager = null;

  editLockManager?.destroy();
  editLockManager = null;

  yjsSync?.destroy();
  yjsSync = null;

  entitySync?.destroy();
  entitySync = null;

  cursorBroadcaster?.stop();
  cursorBroadcaster = null;

  // Leave presence and channel
  if (presenceManager) {
    await presenceManager.leave();
    presenceManager.destroy();
    presenceManager = null;
  }

  if (channel) {
    await channel.leave();
    channel = null;
  }

  // Clear socialStore presence
  useSocialStore.getState().clearPresence();

  initialized = false;
}

/**
 * Check if the social layer is currently initialized.
 */
export function isSocialInitialized(): boolean {
  return initialized;
}
