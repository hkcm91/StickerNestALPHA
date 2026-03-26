/**
 * Event Bus — typed pub/sub IPC for StickerNest V5
 * @module kernel/bus/bus
 */

import { createBusEvent } from '@sn/types';
import type { BusEvent, SpatialContext } from '@sn/types';

import { createRingBuffer } from './ring-buffer';
import type {
  BenchResult,
  BusHandler,
  IEventBus,
  SubscribeOptions,
  Unsubscribe,
} from './types';

const DEFAULT_HISTORY_SIZE = 1000;

interface HandlerEntry {
  handler: BusHandler;
  priority: number;
  once: boolean;
}

class EventBus implements IEventBus {
  private handlers = new Map<string, Set<HandlerEntry>>();
  private wildcardHandlers = new Map<string, Set<HandlerEntry>>();
  private allHandlers = new Set<HandlerEntry>();
  private history = createRingBuffer<BusEvent>(DEFAULT_HISTORY_SIZE);

  get subscriptionCount(): number {
    let count = this.allHandlers.size;
    for (const set of this.handlers.values()) {
      count += set.size;
    }
    for (const set of this.wildcardHandlers.values()) {
      count += set.size;
    }
    return count;
  }

  /**
   * Emits a typed event to all matching subscribers.
   *
   * Dispatch order: exact-match → wildcard → catch-all.
   * Within each group, handlers are sorted by priority (higher first).
   * Handler errors are caught and logged — they never propagate.
   *
   * @param type - Dot-namespaced event type (e.g., 'widget.mounted')
   * @param payload - Event payload (must be JSON-serializable)
   * @param spatial - Optional spatial context for VR/3D events. Leave undefined for non-spatial events.
   */
  emit<T>(type: string, payload: T, spatial?: SpatialContext): void {
    const event = createBusEvent(type, payload, spatial);
    this.history.push(event as BusEvent);

    // Dispatch to exact-match subscribers
    const exact = this.handlers.get(type);
    if (exact) {
      this.dispatch(exact, event as BusEvent);
    }

    // Dispatch to wildcard subscribers (e.g., "social.*" matches "social.cursor.moved")
    for (const [prefix, subs] of this.wildcardHandlers) {
      if (type.startsWith(prefix)) {
        this.dispatch(subs, event as BusEvent);
      }
    }

    // Dispatch to catch-all subscribers
    if (this.allHandlers.size > 0) {
      this.dispatch(this.allHandlers, event as BusEvent);
    }
  }

  /**
   * Subscribes to events matching an exact type or wildcard pattern.
   *
   * Wildcard patterns end with `.*` and match any event whose type starts
   * with the prefix (e.g., `'social.*'` matches `'social.cursor.moved'`).
   *
   * @param type - Exact event type or wildcard pattern (e.g., 'social.*')
   * @param handler - Callback invoked with the matching BusEvent
   * @param options - Subscription options (once, priority)
   * @returns Unsubscribe function — call to remove this subscription
   */
  subscribe<T = unknown>(
    type: string,
    handler: BusHandler<T>,
    options?: SubscribeOptions,
  ): Unsubscribe {
    const entry: HandlerEntry = {
      handler: handler as BusHandler,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    };

    // Detect wildcard pattern: "social.*" -> prefix "social."
    if (type.endsWith('.*')) {
      const prefix = type.slice(0, -1); // "social.*" -> "social."
      let set = this.wildcardHandlers.get(prefix);
      if (!set) {
        set = new Set();
        this.wildcardHandlers.set(prefix, set);
      }
      set.add(entry);
      return () => {
        set!.delete(entry);
        if (set!.size === 0) {
          this.wildcardHandlers.delete(prefix);
        }
      };
    }

    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(entry);
    return () => {
      set!.delete(entry);
      if (set!.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  /**
   * Subscribes to every event regardless of type.
   * Useful for debugging, logging, and the event inspector.
   *
   * @param handler - Callback invoked for every emitted event
   * @param options - Subscription options (once, priority)
   * @returns Unsubscribe function — call to remove this subscription
   */
  subscribeAll(handler: BusHandler, options?: SubscribeOptions): Unsubscribe {
    const entry: HandlerEntry = {
      handler,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    };
    this.allHandlers.add(entry);
    return () => {
      this.allHandlers.delete(entry);
    };
  }

  /**
   * Removes all subscriptions — exact, wildcard, and catch-all.
   * Primarily used in test teardown.
   */
  unsubscribeAll(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    this.allHandlers.clear();
  }

  /**
   * Returns recent events from the ring buffer history.
   *
   * @param count - Number of most recent events to return. Omit for all history.
   * @returns Readonly array of BusEvents, oldest first
   */
  getHistory(count?: number): ReadonlyArray<BusEvent> {
    if (count === undefined) {
      return this.history.getAll();
    }
    return this.history.getLast(count);
  }

  /**
   * Returns recent events filtered by exact type match.
   *
   * @param type - Exact event type to filter by
   * @param count - Number of most recent matching events. Omit for all matches.
   * @returns Readonly array of matching BusEvents, oldest first
   */
  getHistoryByType(type: string, count?: number): ReadonlyArray<BusEvent> {
    const all = this.history.getAll().filter((e) => e.type === type);
    if (count === undefined) {
      return all;
    }
    return all.slice(-count);
  }

  /**
   * Runs a throughput benchmark to verify the < 1ms latency contract.
   *
   * Benchmark events (`__bench__` type) are automatically cleaned from
   * the ring buffer history after the run. This is a diagnostic tool —
   * do not call in production code paths.
   *
   * @param iterations - Number of emit/handle cycles (default: 10,000)
   * @returns BenchResult with latency statistics and throughput
   */
  bench(iterations: number = 10000): BenchResult {
    const latencies: number[] = [];
    let handlerCalledAt = 0;

    const unsub = this.subscribe('__bench__', () => {
      handlerCalledAt = performance.now();
    });

    for (let i = 0; i < iterations; i++) {
      const emitAt = performance.now();
      this.emit('__bench__', { i });
      latencies.push((handlerCalledAt - emitAt) * 1000); // ms -> us
    }

    unsub();

    // Remove bench events from history by clearing and re-adding non-bench events
    // (bench is a diagnostic tool, not a production operation)
    const nonBenchHistory = this.history
      .getAll()
      .filter((e) => e.type !== '__bench__');
    this.history.clear();
    for (const event of nonBenchHistory) {
      this.history.push(event);
    }

    // Compute statistics
    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    const avgLatencyUs = sum / latencies.length;
    const medianLatencyUs = latencies[Math.floor(latencies.length / 2)];
    const p99LatencyUs = latencies[Math.floor(latencies.length * 0.99)];
    const totalTimeMs = sum / 1000;
    const eventsPerSecond =
      totalTimeMs > 0 ? Math.round((iterations / totalTimeMs) * 1000) : Infinity;

    return {
      avgLatencyUs,
      medianLatencyUs,
      p99LatencyUs,
      eventsPerSecond,
      sampleSize: iterations,
    };
  }

  private dispatch(handlers: Set<HandlerEntry>, event: BusEvent): void {
    // Sort by priority (higher first) only when there are multiple handlers
    const sorted =
      handlers.size > 1
        ? [...handlers].sort((a, b) => b.priority - a.priority)
        : handlers;

    const toRemove: HandlerEntry[] = [];

    for (const entry of sorted) {
      try {
        entry.handler(event);
      } catch (err) {
        console.error(`[EventBus] Handler error for "${event.type}":`, err);
      }
      if (entry.once) {
        toRemove.push(entry);
      }
    }

    for (const entry of toRemove) {
      handlers.delete(entry);
    }
  }
}

/** Singleton event bus instance */
export const bus: IEventBus = new EventBus();
