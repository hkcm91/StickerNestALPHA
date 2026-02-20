/**
 * Event Inspector
 *
 * Ephemeral event log for the Lab preview session.
 * Shows events emitted and received by the preview widget.
 * Never persists to any store or DB.
 *
 * @module lab/inspector
 * @layer L2
 */

export type EventDirection = 'emitted' | 'received';

export interface InspectorEntry {
  id: string;
  timestamp: number;
  eventType: string;
  payload: unknown;
  direction: EventDirection;
}

export type InspectorSubscriber = (entries: InspectorEntry[]) => void;

export interface EventInspector {
  log(entry: Omit<InspectorEntry, 'id' | 'timestamp'>): void;
  getEntries(): InspectorEntry[];
  clear(): void;
  subscribe(cb: InspectorSubscriber): () => void;
  destroy(): void;
}

let nextId = 0;

/**
 * Creates an ephemeral event inspector for a Lab preview session.
 */
export function createEventInspector(): EventInspector {
  let entries: InspectorEntry[] = [];
  const subscribers = new Set<InspectorSubscriber>();

  function notify(): void {
    const snapshot = [...entries];
    for (const cb of subscribers) {
      cb(snapshot);
    }
  }

  return {
    log(partial) {
      const entry: InspectorEntry = {
        id: `insp-${++nextId}`,
        timestamp: Date.now(),
        eventType: partial.eventType,
        payload: partial.payload,
        direction: partial.direction,
      };
      entries.push(entry);
      notify();
    },

    getEntries() {
      return [...entries];
    },

    clear() {
      entries = [];
      notify();
    },

    subscribe(cb) {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },

    destroy() {
      entries = [];
      subscribers.clear();
    },
  };
}
