/**
 * Canvas Event Stream Adapter
 *
 * Provides a filtered, buffered event stream from the bus for
 * AI consumers. Converts raw bus events into compact summaries
 * suitable for inclusion in AI prompts or real-time monitoring.
 *
 * @module kernel/ai
 */

import type { BusEvent } from '@sn/types';

import { bus } from '../bus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventStreamEntry {
  type: string;
  summary: string;
  timestamp: number;
  entityId?: string;
}

export interface EventStreamOptions {
  /** Event type patterns to include (supports wildcards like 'canvas.*') */
  patterns: string[];
  /** Max entries to buffer (default: 100) */
  maxBuffer?: number;
  /** Optional callback for real-time streaming */
  onEvent?: (entry: EventStreamEntry) => void;
}

export interface EventStream {
  /** Get all buffered events */
  getBuffer(): ReadonlyArray<EventStreamEntry>;
  /** Get a compact text summary of recent events */
  summarize(maxEntries?: number): string;
  /** Clear the buffer */
  clear(): void;
  /** Stop listening */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Event summarization
// ---------------------------------------------------------------------------

function summarizeEvent(event: BusEvent): EventStreamEntry {
  const payload = event.payload as Record<string, unknown> | undefined;

  const entry: EventStreamEntry = {
    type: event.type,
    summary: event.type,
    timestamp: Date.now(),
  };

  // Extract entity ID if present
  if (payload) {
    const entityId = (payload.entityId ?? payload.id) as string | undefined;
    if (entityId) entry.entityId = entityId;
  }

  // Build human-readable summary
  switch (event.type) {
    case 'canvas.entity.created':
      entry.summary = `Created ${payload?.type ?? 'entity'} "${payload?.name ?? payload?.id ?? '?'}"`;
      break;
    case 'canvas.entity.deleted':
      entry.summary = `Deleted entity ${(payload?.entityId as string)?.slice(0, 8) ?? '?'}`;
      break;
    case 'canvas.entity.moved':
      entry.summary = `Moved entity ${(payload?.entityId as string)?.slice(0, 8) ?? '?'} to (${(payload?.position as { x?: number })?.x ?? '?'},${(payload?.position as { y?: number })?.y ?? '?'})`;
      break;
    case 'canvas.entity.resized':
      entry.summary = `Resized entity ${(payload?.entityId as string)?.slice(0, 8) ?? '?'}`;
      break;
    case 'canvas.entity.updated':
      entry.summary = `Updated entity ${(payload?.entityId as string)?.slice(0, 8) ?? '?'}`;
      break;
    case 'canvas.entity.selected':
      entry.summary = `Selected entity ${(payload?.entityId as string)?.slice(0, 8) ?? '?'}`;
      break;
    case 'canvas.selection.cleared':
      entry.summary = 'Selection cleared';
      break;
    case 'canvas.mode.changed':
      entry.summary = `Mode changed to ${payload?.mode ?? '?'}`;
      break;
    case 'canvas.pipeline.ai.processing':
      entry.summary = `AI node ${payload?.nodeId ?? '?'} processing`;
      break;
    case 'canvas.pipeline.ai.completed':
      entry.summary = `AI node ${payload?.nodeId ?? '?'} completed`;
      break;
    case 'canvas.pipeline.ai.error':
      entry.summary = `AI node ${payload?.nodeId ?? '?'} error: ${payload?.error ?? '?'}`;
      break;
    default:
      entry.summary = event.type;
  }

  return entry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a filtered event stream from the bus.
 *
 * @example
 * const stream = createEventStream({
 *   patterns: ['canvas.*'],
 *   maxBuffer: 50,
 *   onEvent: (entry) => console.log(entry.summary),
 * });
 *
 * // Later: get compact summary for AI prompt
 * const summary = stream.summarize(20);
 */
export function createEventStream(options: EventStreamOptions): EventStream {
  const maxBuffer = options.maxBuffer ?? 100;
  const buffer: EventStreamEntry[] = [];
  const unsubscribes: (() => void)[] = [];

  function handleEvent(event: BusEvent) {
    const entry = summarizeEvent(event);
    buffer.push(entry);
    if (buffer.length > maxBuffer) {
      buffer.shift();
    }
    options.onEvent?.(entry);
  }

  // Subscribe to each pattern
  for (const pattern of options.patterns) {
    unsubscribes.push(bus.subscribe(pattern, handleEvent));
  }

  return {
    getBuffer() {
      return buffer;
    },

    summarize(maxEntries = 20) {
      const entries = buffer.slice(-maxEntries);
      if (entries.length === 0) return 'No recent canvas events.';

      return entries
        .map((e) => {
          const time = new Date(e.timestamp).toLocaleTimeString();
          return `[${time}] ${e.summary}`;
        })
        .join('\n');
    },

    clear() {
      buffer.length = 0;
    },

    destroy() {
      for (const unsub of unsubscribes) {
        unsub();
      }
      unsubscribes.length = 0;
      buffer.length = 0;
    },
  };
}
