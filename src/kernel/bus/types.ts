/**
 * Event Bus types
 * @module kernel/bus/types
 */

import type { BusEvent, SpatialContext } from '@sn/types';

/** Handler function for a specific event type */
export type BusHandler<T = unknown> = (event: BusEvent<T>) => void;

/** Return value from subscribe() — call to unsubscribe */
export type Unsubscribe = () => void;

/** Subscription options */
export interface SubscribeOptions {
  /** If true, handler is removed after first invocation */
  once?: boolean;
  /** Priority for ordering handlers (higher = earlier). Default 0. */
  priority?: number;
}

/** Bus benchmark result */
export interface BenchResult {
  /** Average emit-to-handler latency in microseconds */
  avgLatencyUs: number;
  /** Median latency in microseconds */
  medianLatencyUs: number;
  /** p99 latency in microseconds */
  p99LatencyUs: number;
  /** Events per second throughput */
  eventsPerSecond: number;
  /** Number of events in the benchmark run */
  sampleSize: number;
}

/** Event bus public interface */
export interface IEventBus {
  /** Emit a typed event to all matching subscribers */
  emit<T>(type: string, payload: T, spatial?: SpatialContext): void;
  /** Subscribe to events matching an exact type or wildcard pattern (e.g., 'social.*') */
  subscribe<T = unknown>(type: string, handler: BusHandler<T>, options?: SubscribeOptions): Unsubscribe;
  /** Subscribe to all events regardless of type */
  subscribeAll(handler: BusHandler, options?: SubscribeOptions): Unsubscribe;
  /** Remove all subscriptions */
  unsubscribeAll(): void;
  /** Get the last N events from the ring buffer history */
  getHistory(count?: number): ReadonlyArray<BusEvent>;
  /** Get the last N events of a specific type from history */
  getHistoryByType(type: string, count?: number): ReadonlyArray<BusEvent>;
  /** Run a throughput benchmark. Returns latency statistics. */
  bench(iterations?: number): BenchResult;
  /** Number of registered subscriptions */
  readonly subscriptionCount: number;
}
