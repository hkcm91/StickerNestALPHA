/**
 * Rate Limiter
 *
 * Per-widget event emission rate limiting.
 * Default: 100 events/second per widget.
 * Throttled events are silently dropped.
 *
 * @module runtime/security
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/** Default rate limit: 100 events per second */
export const DEFAULT_RATE_LIMIT = 100;

interface RateBucket {
  count: number;
  windowStart: number;
  limit: number;
}

/**
 * Per-widget rate limiter.
 */
export interface RateLimiter {
  /** Check if an event is allowed (true = allowed, false = throttled) */
  check(instanceId: string): boolean;
  /** Reset the counter for a widget */
  reset(instanceId: string): void;
  /** Set a custom limit for a widget */
  setLimit(instanceId: string, eventsPerSecond: number): void;
  /** Clean up all state */
  destroy(): void;
}

/**
 * Creates a rate limiter for widget event emission.
 */
export function createRateLimiter(): RateLimiter {
  const buckets = new Map<string, RateBucket>();

  function getBucket(instanceId: string): RateBucket {
    let bucket = buckets.get(instanceId);
    if (!bucket) {
      bucket = { count: 0, windowStart: Date.now(), limit: DEFAULT_RATE_LIMIT };
      buckets.set(instanceId, bucket);
    }
    return bucket;
  }

  return {
    check(instanceId: string): boolean {
      const bucket = getBucket(instanceId);
      const now = Date.now();

      // Reset window if 1 second has elapsed
      if (now - bucket.windowStart >= 1000) {
        bucket.count = 0;
        bucket.windowStart = now;
      }

      bucket.count++;
      return bucket.count <= bucket.limit;
    },

    reset(instanceId: string): void {
      buckets.delete(instanceId);
    },

    setLimit(instanceId: string, eventsPerSecond: number): void {
      const bucket = getBucket(instanceId);
      bucket.limit = eventsPerSecond;
    },

    destroy(): void {
      buckets.clear();
    },
  };
}
