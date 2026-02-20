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
}

interface ChannelSubscription {
  channel: ReturnType<typeof supabase.channel>;
  callbacks: Array<(payload: unknown) => void>;
}

/**
 * Creates a new cross-canvas event router.
 *
 * @returns A CrossCanvasRouter instance for managing cross-canvas event subscriptions
 */
export function createCrossCanvasRouter(): CrossCanvasRouter {
  const subscriptions = new Map<string, ChannelSubscription>();

  return {
    subscribe(channel: string, callback: (payload: unknown) => void) {
      let sub = subscriptions.get(channel);
      if (!sub) {
        const realtimeChannel = supabase.channel(`crosscanvas:${channel}`);
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
          .subscribe();
        sub = { channel: realtimeChannel, callbacks: [] };
        subscriptions.set(channel, sub);
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
      const sub = subscriptions.get(channel);
      if (sub) {
        sub.channel.send({ type: 'broadcast', event: 'message', payload });
      } else {
        // Create ephemeral channel to send, then remove
        const tempChannel = supabase.channel(`crosscanvas:${channel}`);
        tempChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            tempChannel.send({ type: 'broadcast', event: 'message', payload });
            // Remove after a short delay to ensure message is sent
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
    },
  };
}
