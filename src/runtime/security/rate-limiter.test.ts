/**
 * Rate Limiter — Tests
 *
 * @module runtime/security
 * @layer L3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { createRateLimiter, DEFAULT_RATE_LIMIT } from './rate-limiter';

describe('createRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows events within the rate limit', () => {
    const limiter = createRateLimiter();

    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      expect(limiter.check('widget-1')).toBe(true);
    }

    limiter.destroy();
  });

  it('throttles events exceeding the limit', () => {
    const limiter = createRateLimiter();

    // Consume the full limit
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }

    // Next event should be throttled
    expect(limiter.check('widget-1')).toBe(false);

    limiter.destroy();
  });

  it('resets after 1-second window', () => {
    const limiter = createRateLimiter();

    // Use up the limit
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }
    expect(limiter.check('widget-1')).toBe(false);

    // Advance 1 second
    vi.advanceTimersByTime(1000);

    // Should be allowed again
    expect(limiter.check('widget-1')).toBe(true);

    limiter.destroy();
  });

  it('tracks separate limits per widget instance', () => {
    const limiter = createRateLimiter();

    // Max out widget-1
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }
    expect(limiter.check('widget-1')).toBe(false);

    // widget-2 should still be allowed
    expect(limiter.check('widget-2')).toBe(true);

    limiter.destroy();
  });

  it('supports custom per-widget limits', () => {
    const limiter = createRateLimiter();

    limiter.setLimit('widget-1', 5);

    for (let i = 0; i < 5; i++) {
      expect(limiter.check('widget-1')).toBe(true);
    }
    expect(limiter.check('widget-1')).toBe(false);

    limiter.destroy();
  });

  it('resets a specific widget', () => {
    const limiter = createRateLimiter();

    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }
    expect(limiter.check('widget-1')).toBe(false);

    limiter.reset('widget-1');
    expect(limiter.check('widget-1')).toBe(true);

    limiter.destroy();
  });

  it('destroy clears all state', () => {
    const limiter = createRateLimiter();

    limiter.check('widget-1');
    limiter.check('widget-2');
    limiter.destroy();

    // After destroy, limiter state is gone — new checks start fresh
    // (although destroy doesn't prevent reuse, the maps are cleared)
    expect(limiter.check('widget-1')).toBe(true);
  });

  it('default rate limit is 100 events per second', () => {
    expect(DEFAULT_RATE_LIMIT).toBe(100);
  });
});
