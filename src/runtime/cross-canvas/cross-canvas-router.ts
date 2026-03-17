/**
 * Cross-Canvas Event Router
 *
 * Routes events between widgets on different canvases via Supabase Realtime.
 * Channel naming: crosscanvas:{channel}
 *
 * @module runtime/cross-canvas
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { supabase } from '../../kernel/supabase/client';

/** Valid channel name: alphanumeric, dots, hyphens, underscores, 1-128 chars */
const CHANNEL_NAME_RE = /^[a-zA-Z0-9._-]{1,128}$/;

/**
 * Validates a cross-canvas channel name.
 * @returns true if valid, false otherwise
 */
export function isValidChannelName(channel: string): boolean {
  return CHANNEL_NAME_RE.test(channel);
}

/** Maximum number of queued messages while offline */
const MAX_OFFLINE_QUEUE = 100;

/**
 * Cross-canvas router API for routing events between widgets across canvases.
 */
export interface CrossCanvasRouter {
  /** Subscribe to a cross-canvas channel */
  subscribe(channel: string, callback: (payload: unknown) => void): void;
  /** Unsubscribe from a cross-canvas channel */
  unsubscribe(channel: string): void;
  /** Emit an event to a cross-canvas channel */
  emit(channel: string, payload: unknown): void;
  /** Destroy the router and clean up all subscriptions */
  destroy(): void;
  /** Get the current offline queue length (for testing/observability) */
  getQueueLength(): number;
}

interface ChannelSubscription {
  channel: ReturnType<typeof supabase.channel>;
  callbacks: Array<(payload: unknown) => void>;
  connected: boolean;
}

interface QueuedMessage {
  channel: string;
  payload: unknown;
}

/**
 * Creates a new cross-canvas event router.
 *
 * @returns A CrossCanvasRouter instance for managing cross-canvas event subscriptions
 */
export function createCrossCanvasRouter(): CrossCanvasRouter {
  const subscriptions = new Map<string, ChannelSubscription>();
  const offlineQueue: QueuedMessage[] = [];

  function flushQueue() {
    while (offlineQueue.length > 0) {
      const msg = offlineQueue.shift()!;
      const sub = subscriptions.get(msg.channel);
      if (sub && sub.connected) {
        sub.channel.send({ type: 'broadcast', event: 'message', payload: msg.payload });
      }
    }
  }

  function enqueue(channel: string, payload: unknown) {
    if (offlineQueue.length >= MAX_OFFLINE_QUEUE) {
      offlineQueue.shift(); // Drop oldest
    }
    offlineQueue.push({ channel, payload });
  }

  return {
    subscribe(channel: string, callback: (payload: unknown) => void) {
      if (!isValidChannelName(channel)) {
        console.warn(`[CrossCanvas] Invalid channel name rejected: "${channel}"`);
        return;
      }
      let sub = subscriptions.get(channel);
      if (!sub) {
        const realtimeChannel = supabase.channel(`crosscanvas:${channel}`);
        sub = { channel: realtimeChannel, callbacks: [], connected: false };
        subscriptions.set(channel, sub);
        realtimeChannel
          .on('broadcast', { event: 'message' }, (event) => {
            const currentSub = subscriptions.get(channel);
            if (currentSub) {
              for (const cb of currentSub.callbacks) {
                try {
                  cb(event.payload);
                } catch (e) {
                  console.error('[CrossCanvas] Handler error:', e);
                }
              }
            }
          })
          .subscribe((status) => {
            const currentSub = subscriptions.get(channel);
            if (currentSub) {
              currentSub.connected = status === 'SUBSCRIBED';
              if (currentSub.connected) {
                flushQueue();
              }
            }
          });
      }
      sub.callbacks.push(callback);
    },

    unsubscribe(channel: string) {
      const sub = subscriptions.get(channel);
      if (sub) {
        supabase.removeChannel(sub.channel);
        subscriptions.delete(channel);
      }
    },

    emit(channel: string, payload: unknown) {
      if (!isValidChannelName(channel)) {
        console.warn(`[CrossCanvas] Invalid channel name rejected: "${channel}"`);
        return;
      }
      const sub = subscriptions.get(channel);
      if (sub && sub.connected) {
        sub.channel.send({ type: 'broadcast', event: 'message', payload });
      } else if (sub && !sub.connected) {
        // Channel exists but not connected — queue for replay
        enqueue(channel, payload);
      } else {
        // No subscription — create ephemeral channel to send, then remove
        const tempChannel = supabase.channel(`crosscanvas:${channel}`);
        tempChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            tempChannel.send({ type: 'broadcast', event: 'message', payload });
            setTimeout(() => supabase.removeChannel(tempChannel), 500);
          }
        });
      }
    },

    destroy() {
      for (const [, sub] of subscriptions) {
        supabase.removeChannel(sub.channel);
      }
      subscriptions.clear();
      offlineQueue.length = 0;
    },

    getQueueLength() {
      return offlineQueue.length;
    },
  };
}
