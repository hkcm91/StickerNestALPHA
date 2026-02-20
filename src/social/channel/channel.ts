/**
 * Canvas Channel Manager
 *
 * Manages Supabase Realtime channels for canvas collaboration.
 * One channel per canvas, naming convention: `canvas:{canvasId}`.
 *
 * @module social/channel
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../../kernel/supabase';

/**
 * Represents a managed Realtime channel for a canvas.
 * One channel per canvas — no per-user or per-widget channels.
 */
export interface CanvasChannel {
  /** The canvas this channel is bound to */
  readonly canvasId: string;
  /** The underlying Supabase Realtime channel */
  readonly channel: RealtimeChannel;
  /** Join the channel and start receiving events */
  join(): Promise<void>;
  /** Leave the channel and clean up subscriptions */
  leave(): Promise<void>;
  /** Whether the channel is currently connected */
  isConnected(): boolean;
  /** Send a message to all other users on this channel */
  broadcast(event: string, payload: unknown): void;
  /** Subscribe to a specific event type on this channel */
  onBroadcast(event: string, callback: (payload: unknown) => void): void;
}

/**
 * Creates a managed Realtime channel for a canvas.
 *
 * IMPORTANT: All onBroadcast() handlers must be registered BEFORE calling join().
 * Supabase requires .on() listeners to be set up before .subscribe().
 *
 * @param canvasId - The canvas ID to create a channel for
 * @returns A CanvasChannel instance
 */
export function createCanvasChannel(canvasId: string): CanvasChannel {
  const channelName = `canvas:${canvasId}`;
  const realtimeChannel = supabase.channel(channelName);

  let connected = false;

  const instance: CanvasChannel = {
    canvasId,
    channel: realtimeChannel,

    async join(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        realtimeChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            connected = true;
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            connected = false;
            reject(new Error(`Channel subscription failed: ${status}`));
          } else if (status === 'CLOSED') {
            connected = false;
          }
        });
      });
    },

    async leave(): Promise<void> {
      connected = false;
      await supabase.removeChannel(realtimeChannel);
    },

    isConnected(): boolean {
      return connected;
    },

    broadcast(event: string, payload: unknown): void {
      realtimeChannel.send({
        type: 'broadcast',
        event,
        payload: payload as Record<string, unknown>,
      });
    },

    onBroadcast(event: string, callback: (payload: unknown) => void): void {
      realtimeChannel.on(
        'broadcast',
        { event },
        (message: { payload: unknown }) => {
          callback(message.payload);
        },
      );
    },
  };

  return instance;
}
