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
  // TODO: Implement — see runtime plan section 5.4
  throw new Error('Not implemented: createRateLimiter');
}
