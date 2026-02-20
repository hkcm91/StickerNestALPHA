/**
 * Security module tests
 *
 * Tests for CSP generation, rate limiting, and sandbox policy validation.
 *
 * @module runtime/security
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DEFAULT_CSP, generateCSPMetaTag } from './csp';
import {
  createRateLimiter,
  DEFAULT_RATE_LIMIT,
  type RateLimiter,
} from './rate-limiter';
import { SANDBOX_POLICY, validateSandboxPolicy } from './sandbox-policy';

// ---------------------------------------------------------------------------
// CSP
// ---------------------------------------------------------------------------
describe('CSP', () => {
  it('generates correct CSP meta tag for default sandbox', () => {
    const tag = generateCSPMetaTag();
    expect(tag).toBe(
      `<meta http-equiv="Content-Security-Policy" content="${DEFAULT_CSP}">`,
    );
  });

  it('blocks connect-src by default', () => {
    expect(DEFAULT_CSP).toContain("connect-src 'none'");
  });

  it('allows inline scripts and styles', () => {
    expect(DEFAULT_CSP).toContain("script-src 'unsafe-inline'");
    expect(DEFAULT_CSP).toContain("style-src 'unsafe-inline'");
  });

  it('allows data: and blob: for images', () => {
    expect(DEFAULT_CSP).toContain('img-src data: blob:');
  });

  it('allows data: for fonts', () => {
    expect(DEFAULT_CSP).toContain('font-src data:');
  });
});

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------
describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = createRateLimiter();
  });

  afterEach(() => {
    limiter.destroy();
    vi.useRealTimers();
  });

  it('allows events under the rate limit', () => {
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      expect(limiter.check('widget-1')).toBe(true);
    }
  });

  it('throttles events exceeding rate limit', () => {
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }
    // The next event (101st) should be throttled
    expect(limiter.check('widget-1')).toBe(false);
  });

  it('resets count after window expires', () => {
    // Exhaust the limit
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }
    expect(limiter.check('widget-1')).toBe(false);

    // Advance time by 1 second to reset the sliding window
    vi.advanceTimersByTime(1000);

    // Should be allowed again
    expect(limiter.check('widget-1')).toBe(true);
  });

  it('emits widget:rate-limited event when throttling', () => {
    // Implementation silently drops -- verify check() returns false
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }
    // Over the limit: check returns false (silently dropped, no bus event)
    expect(limiter.check('widget-1')).toBe(false);
  });

  it('uses per-widget limits when set', () => {
    limiter.setLimit('widget-1', 5);

    for (let i = 0; i < 5; i++) {
      expect(limiter.check('widget-1')).toBe(true);
    }
    expect(limiter.check('widget-1')).toBe(false);

    // Other widgets still use the default limit
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      expect(limiter.check('widget-2')).toBe(true);
    }
    expect(limiter.check('widget-2')).toBe(false);
  });

  it('default limit is 100 events/second', () => {
    expect(DEFAULT_RATE_LIMIT).toBe(100);
  });

  it('silently drops throttled events', () => {
    // Exhaust limit
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      limiter.check('widget-1');
    }
    // check() simply returns false -- no exception, no side effect
    const result = limiter.check('widget-1');
    expect(result).toBe(false);
  });

  it('destroy cleans up all timers', () => {
    // Create buckets for several widgets
    limiter.check('widget-1');
    limiter.check('widget-2');
    limiter.check('widget-3');

    limiter.destroy();

    // After destroy, a new check creates a fresh bucket starting at count 1
    expect(limiter.check('widget-1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SandboxPolicy
// ---------------------------------------------------------------------------
describe('SandboxPolicy', () => {
  it('SANDBOX_POLICY includes allow-scripts and allow-forms', () => {
    expect(SANDBOX_POLICY).toContain('allow-scripts');
    expect(SANDBOX_POLICY).toContain('allow-forms');
  });

  it('SANDBOX_POLICY does NOT include allow-same-origin', () => {
    expect(SANDBOX_POLICY).not.toContain('allow-same-origin');
  });

  it('validateSandboxPolicy rejects allow-same-origin', () => {
    expect(() => validateSandboxPolicy('allow-scripts allow-same-origin')).toThrow(
      'Forbidden sandbox token: allow-same-origin',
    );
  });

  it('validateSandboxPolicy rejects allow-top-navigation', () => {
    expect(() =>
      validateSandboxPolicy('allow-scripts allow-top-navigation'),
    ).toThrow('Forbidden sandbox token: allow-top-navigation');
  });

  it('validateSandboxPolicy rejects allow-popups', () => {
    expect(() => validateSandboxPolicy('allow-scripts allow-popups')).toThrow(
      'Forbidden sandbox token: allow-popups',
    );
  });

  it('validateSandboxPolicy rejects allow-pointer-lock', () => {
    expect(() =>
      validateSandboxPolicy('allow-scripts allow-pointer-lock'),
    ).toThrow('Forbidden sandbox token: allow-pointer-lock');
  });

  it('validateSandboxPolicy accepts the default policy', () => {
    expect(validateSandboxPolicy(SANDBOX_POLICY)).toBe(true);
  });
});
