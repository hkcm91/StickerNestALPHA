/**
 * Ring Buffer — fixed-capacity circular buffer
 * @module kernel/bus/ring-buffer
 */

/** Ring buffer interface */
export interface RingBuffer<T> {
  /** Push an item into the buffer. Overwrites oldest if at capacity. */
  push(item: T): void;
  /** Get all items in insertion order (oldest first). */
  getAll(): ReadonlyArray<T>;
  /** Get the last N items (most recent last). */
  getLast(count: number): ReadonlyArray<T>;
  /** Clear all items. */
  clear(): void;
  /** Current number of items in the buffer. */
  readonly size: number;
  /** Maximum capacity. */
  readonly capacity: number;
}

/**
 * Create a fixed-capacity ring buffer.
 * O(1) push, O(n) retrieval.
 */
export function createRingBuffer<T>(capacity: number): RingBuffer<T> {
  if (capacity < 1) {
    throw new Error('Ring buffer capacity must be at least 1');
  }

  const buffer: (T | undefined)[] = new Array(capacity);
  let head = 0;
  let count = 0;

  return {
    push(item: T): void {
      buffer[head] = item;
      head = (head + 1) % capacity;
      if (count < capacity) count++;
    },

    getAll(): ReadonlyArray<T> {
      if (count === 0) return [];
      const result: T[] = new Array(count);
      const start = count < capacity ? 0 : head;
      for (let i = 0; i < count; i++) {
        result[i] = buffer[(start + i) % capacity] as T;
      }
      return result;
    },

    getLast(n: number): ReadonlyArray<T> {
      const take = Math.min(n, count);
      if (take === 0) return [];
      const result: T[] = new Array(take);
      const start = (head - take + capacity) % capacity;
      for (let i = 0; i < take; i++) {
        result[i] = buffer[(start + i) % capacity] as T;
      }
      return result;
    },

    clear(): void {
      buffer.fill(undefined);
      head = 0;
      count = 0;
    },

    get size() {
      return count;
    },

    get capacity() {
      return capacity;
    },
  };
}
