/**
 * Layer 1 -- Social + Sync
 *
 * Real-time collaboration infrastructure for StickerNest V5.
 * Manages presence, cursors, entity sync, conflict resolution,
 * edit locks, and offline degradation.
 *
 * @module social
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

// Channel management
export { createCanvasChannel } from './channel';
export type { CanvasChannel } from './channel';

// Presence tracking
export { createPresenceManager, generateGuestColor } from './presence';
export type { PresenceManager, PresenceState } from './presence';

// Cursor broadcast
export { createCursorBroadcaster, CURSOR_THROTTLE_MS } from './cursor';
export type { CursorBroadcaster, CursorPosition, CursorData } from './cursor';

// Entity transform sync
export { createEntitySync } from './entity-sync';
export type { EntitySyncManager, EntityTransform } from './entity-sync';

// Conflict resolution
export { getStrategyForType } from './conflict';
export type { ConflictStrategy } from './conflict';

// Yjs CRDT sync
export { createYjsSync } from './yjs-sync';
export type { YjsSyncManager } from './yjs-sync';

// Edit locks
export { createEditLockManager, EDIT_LOCK_TIMEOUT_MS } from './edit-lock';
export type { EditLockManager, EditLock } from './edit-lock';

// Offline degradation
export { createOfflineManager, OFFLINE_GRACE_PERIOD_MS } from './offline';
export type { OfflineManager, QueuedEdit } from './offline';

// Layer init
export { initSocial, teardownSocial, isSocialInitialized } from './init';
