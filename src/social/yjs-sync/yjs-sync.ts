/**
 * Yjs CRDT Sync
 *
 * Synchronizes Doc DataSources using Yjs CRDT over Supabase Realtime.
 * One Y.Doc per DataSource instance. Uses y-protocols for encoding
 * Yjs updates as binary messages over the channel.
 *
 * @module social/yjs-sync
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import type * as Y from 'yjs';

import type { CanvasChannel } from '../channel';

/**
 * Manages Yjs document sync over a Realtime channel.
 */
export interface YjsSyncManager {
  /** Get or create a Y.Doc for a DataSource */
  getDoc(dataSourceId: string): Y.Doc;
  /** Start syncing a document over the channel */
  startSync(dataSourceId: string): void;
  /** Stop syncing a document */
  stopSync(dataSourceId: string): void;
  /** Clean up all documents and subscriptions */
  destroy(): void;
}

/**
 * Creates a Yjs sync manager for a canvas channel.
 *
 * @param channel - The canvas channel for sync messages
 * @returns A YjsSyncManager instance
 */
export function createYjsSync(_channel: CanvasChannel): YjsSyncManager {
  // TODO: Implement — see AC6 in current-story.md
  throw new Error('Not implemented: createYjsSync');
}
