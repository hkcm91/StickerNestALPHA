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

import * as Y from 'yjs';

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
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

/** Encode Uint8Array to base64 for channel transport */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode base64 to Uint8Array from channel transport */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a Yjs sync manager for a canvas channel.
 *
 * @param channel - The canvas channel for sync messages
 * @returns A YjsSyncManager instance
 */
export function createYjsSync(channel: CanvasChannel): YjsSyncManager {
  const docs = new Map<string, Y.Doc>();
  const observers = new Map<string, () => void>();

  // Listen for remote Yjs updates
  channel.onBroadcast('yjs-update', (payload) => {
    const { dataSourceId, update } = payload as {
      dataSourceId: string;
      update: string;
    };

    const doc = docs.get(dataSourceId);
    if (!doc) return;

    // Decode base64 to binary and apply update
    const binaryUpdate = base64ToUint8Array(update);
    Y.applyUpdate(doc, binaryUpdate, 'remote');

    // Notify via bus
    bus.emit(SocialEvents.DATASOURCE_UPDATED, {
      dataSourceId,
      type: 'doc',
      source: 'remote',
    });
  });

  return {
    getDoc(dataSourceId: string): Y.Doc {
      let doc = docs.get(dataSourceId);
      if (!doc) {
        doc = new Y.Doc();
        docs.set(dataSourceId, doc);
      }
      return doc;
    },

    startSync(dataSourceId: string): void {
      const doc = this.getDoc(dataSourceId);

      // If already syncing, don't double-subscribe
      if (observers.has(dataSourceId)) return;

      // Observe local updates and broadcast them
      const updateHandler = (update: Uint8Array, origin: unknown) => {
        // Don't echo remote updates back to the channel
        if (origin === 'remote') return;

        const base64Update = uint8ArrayToBase64(update);
        channel.broadcast('yjs-update', {
          dataSourceId,
          update: base64Update,
        });
      };

      doc.on('update', updateHandler);
      observers.set(dataSourceId, () => doc.off('update', updateHandler));
    },

    stopSync(dataSourceId: string): void {
      const cleanup = observers.get(dataSourceId);
      if (cleanup) {
        cleanup();
        observers.delete(dataSourceId);
      }
    },

    destroy(): void {
      for (const cleanup of observers.values()) {
        cleanup();
      }
      observers.clear();

      for (const doc of docs.values()) {
        doc.destroy();
      }
      docs.clear();
    },
  };
}
