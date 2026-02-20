/**
 * Event Bus — Barrel Export
 * @module kernel/bus
 */

export { bus } from './bus';
export type {
  BenchResult,
  BusHandler,
  IEventBus,
  SubscribeOptions,
  Unsubscribe,
} from './types';
export { createRingBuffer, type RingBuffer } from './ring-buffer';
