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
 * @param canvasId - The canvas ID to create a channel for
 * @returns A CanvasChannel instance
 */
export function createCanvasChannel(_canvasId: string): CanvasChannel {
  // TODO: Implement — see AC1 in current-story.md
  throw new Error('Not implemented: createCanvasChannel');
}
