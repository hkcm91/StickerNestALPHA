/**
 * Cross-Canvas Event Router
 *
 * Three transport layers, always active in parallel:
 * 1. **Local** — same-page delivery (synchronous, instant)
 * 2. **BroadcastChannel** — cross-tab on same origin (no server needed)
 * 3. **Supabase Realtime** — cross-user / cross-device (needs Supabase)
 *
 * Security:
 * - Messages are wrapped in envelopes with sender identity (injected by host, not widget)
 * - Dedup via message ID prevents double-delivery across transports
 * - Channels are scoped by userId when authenticated (transparent to widgets)
 *
 * Subscription model (mirrors kernel event bus pattern):
 * - `subscribe()` returns an unsubscribe function for that specific callback
 * - Each callback is tracked individually — removing one does not affect others
 * - Transport is torn down only when the last callback for a channel is removed
 * - `emit()` works without a prior `subscribe()` — creates transport on demand
 *
 * @module runtime/cross-canvas
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { useAuthStore } from '../../kernel/stores/auth/auth.store';
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

/** Maximum number of message IDs to track for dedup */
const DEDUP_WINDOW_SIZE = 500;

// ── Envelope ────────────────────────────────────────────────────

/** Sender metadata injected by the host (WidgetFrame), not by the widget */
export interface CrossCanvasSender {
  /** Widget ID of the sender */
  widgetId: string;
  /** Widget instance ID of the sender */
  instanceId: string;
}

/** Wire format for messages sent over BroadcastChannel and Supabase Realtime */
export interface CrossCanvasEnvelope {
  /** Unique message ID for dedup */
  id: string;
  /** Sender identity (injected by host) */
  sender: CrossCanvasSender;
  /** Original payload from the widget */
  payload: unknown;
  /** Emission timestamp (ms since epoch) */
  timestamp: number;
}

// ── Router Interface ────────────────────────────────────────────

/**
 * Cross-canvas router API.
 *
 * `subscribe()` returns an unsubscribe function — call it to remove only that
 * specific callback. The transport stays alive until the last callback is removed.
 */
export interface CrossCanvasRouter {
  /** Subscribe to a channel. Returns an unsubscribe function for this callback. */
  subscribe(channel: string, callback: (payload: unknown) => void): () => void;
  /** Tear down an entire channel (all callbacks + transports). */
  unsubscribe(channel: string): void;
  /** Emit to a channel. Creates transport on demand if needed. */
  emit(channel: string, payload: unknown, sender?: CrossCanvasSender): void;
  /** Destroy the router and clean up everything */
  destroy(): void;
  /** Get the current offline queue length (for testing/observability) */
  getQueueLength(): number;
}

// ── Internal Types ──────────────────────────────────────────────

type Callback = (payload: unknown) => void;

interface ChannelEntry {
  /** Individual callbacks — Set for O(1) add/remove */
  callbacks: Set<Callback>;
  /** BroadcastChannel for same-origin cross-tab delivery */
  bc: BroadcastChannel | null;
  /** Supabase Realtime channel for cross-user delivery */
  rtChannel: ReturnType<typeof supabase.channel> | null;
  rtConnected: boolean;
}

interface QueuedMessage {
  channel: string;
  envelope: CrossCanvasEnvelope;
}

// ── Factory ─────────────────────────────────────────────────────

/**
 * Creates a new cross-canvas event router.
 *
 * @param userId - If provided, all channels are scoped to this user
 */
export function createCrossCanvasRouter(userId?: string): CrossCanvasRouter {
  const channels = new Map<string, ChannelEntry>();
  const offlineQueue: QueuedMessage[] = [];
  const seenMessageIds = new Set<string>();

  function scopedChannel(channel: string): string {
    return userId ? `${userId}:${channel}` : channel;
  }

  function trackMessageId(id: string): boolean {
    if (seenMessageIds.has(id)) return false;
    seenMessageIds.add(id);
    if (seenMessageIds.size > DEDUP_WINDOW_SIZE) {
      const first = seenMessageIds.values().next().value;
      if (first !== undefined) seenMessageIds.delete(first);
    }
    return true;
  }

  function flushQueue() {
    while (offlineQueue.length > 0) {
      const msg = offlineQueue.shift()!;
      const entry = channels.get(msg.channel);
      if (entry?.rtChannel && entry.rtConnected) {
        entry.rtChannel.send({ type: 'broadcast', event: 'message', payload: msg.envelope });
      }
    }
  }

  function enqueue(channel: string, envelope: CrossCanvasEnvelope) {
    if (offlineQueue.length >= MAX_OFFLINE_QUEUE) {
      offlineQueue.shift();
    }
    offlineQueue.push({ channel, envelope });
  }

  function deliverLocal(channel: string, payload: unknown) {
    const entry = channels.get(channel);
    if (entry) {
      for (const cb of entry.callbacks) {
        try { cb(payload); } catch (e) { console.error('[CrossCanvas] Handler error:', e); }
      }
    }
  }

  function handleRemoteEnvelope(channel: string, data: unknown) {
    if (!data || typeof data !== 'object') return;
    const envelope = data as Partial<CrossCanvasEnvelope>;
    if (!envelope.id || !('payload' in envelope)) return;
    if (!trackMessageId(envelope.id)) return;
    deliverLocal(channel, envelope.payload);
  }

  /** Create transport for a channel if it doesn't exist yet */
  function ensureChannel(channel: string): ChannelEntry {
    let entry = channels.get(channel);
    if (entry) return entry;

    const scoped = scopedChannel(channel);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(`crosscanvas:${scoped}`);
      bc.onmessage = (event) => handleRemoteEnvelope(channel, event.data);
    }

    const rtChannel = supabase.channel(`crosscanvas:${scoped}`, {
      config: { broadcast: { self: false } },
    });

    entry = { callbacks: new Set(), bc, rtChannel, rtConnected: false };
    channels.set(channel, entry);

    rtChannel
      .on('broadcast', { event: 'message' }, (event) => {
        handleRemoteEnvelope(channel, event.payload);
      })
      .subscribe((status) => {
        const current = channels.get(channel);
        if (current) {
          current.rtConnected = status === 'SUBSCRIBED';
          if (current.rtConnected) flushQueue();
        }
      });

    return entry;
  }

  function teardownChannel(channel: string) {
    const entry = channels.get(channel);
    if (!entry) return;
    entry.bc?.close();
    if (entry.rtChannel) supabase.removeChannel(entry.rtChannel);
    channels.delete(channel);
  }

  return {
    subscribe(channel: string, callback: Callback): () => void {
      if (!isValidChannelName(channel)) {
        console.warn(`[CrossCanvas] Invalid channel name rejected: "${channel}"`);
        return () => {};
      }

      const entry = ensureChannel(channel);
      entry.callbacks.add(callback);

      // Return per-callback unsubscribe (like the kernel event bus)
      return () => {
        entry.callbacks.delete(callback);
        if (entry.callbacks.size === 0) {
          teardownChannel(channel);
        }
      };
    },

    unsubscribe(channel: string) {
      teardownChannel(channel);
    },

    emit(channel: string, payload: unknown, sender?: CrossCanvasSender) {
      if (!isValidChannelName(channel)) {
        console.warn(`[CrossCanvas] Invalid channel name rejected: "${channel}"`);
        return;
      }

      // 1. Local delivery — same-page, instant
      deliverLocal(channel, payload);

      const envelope: CrossCanvasEnvelope = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        sender: sender ?? { widgetId: 'unknown', instanceId: 'unknown' },
        payload,
        timestamp: Date.now(),
      };

      trackMessageId(envelope.id);

      // Ensure transport exists even if emitter hasn't subscribed
      const entry = ensureChannel(channel);

      // 2. BroadcastChannel — cross-tab
      if (entry.bc) {
        try { entry.bc.postMessage(envelope); } catch { /* closed */ }
      }

      // 3. Supabase Realtime — cross-user / cross-device
      if (entry.rtChannel && entry.rtConnected) {
        entry.rtChannel.send({ type: 'broadcast', event: 'message', payload: envelope });
      } else if (entry.rtChannel && !entry.rtConnected) {
        enqueue(channel, envelope);
      }
    },

    destroy() {
      for (const [channel] of channels) {
        teardownChannel(channel);
      }
      channels.clear();
      offlineQueue.length = 0;
      seenMessageIds.clear();
    },

    getQueueLength() {
      return offlineQueue.length;
    },
  };
}

// ── Shared Singleton ────────────────────────────────────────────

let sharedRouter: CrossCanvasRouter | null = null;

export function getSharedCrossCanvasRouter(): CrossCanvasRouter {
  if (!sharedRouter) {
    const userId = useAuthStore.getState().user?.id;
    sharedRouter = createCrossCanvasRouter(userId);
  }
  return sharedRouter;
}
