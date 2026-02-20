/**
 * Tests for IframePool
 *
 * @module runtime/pool
 * @layer L3
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { SANDBOX_POLICY } from '../security/sandbox-policy';

import {
  createIframePool,
  DEFAULT_WARMUP_COUNT,
  type IframePool,
} from './iframe-pool';

describe('IframePool', () => {
  let pool: IframePool;

  beforeEach(() => {
    pool = createIframePool();
  });

  it('warmUp creates requested number of iframes', () => {
    pool.warmUp(3);
    expect(pool.size()).toBe(3);

    // Using default count
    const pool2 = createIframePool();
    pool2.warmUp();
    expect(pool2.size()).toBe(DEFAULT_WARMUP_COUNT);
  });

  it('acquire returns iframe from pool when available', () => {
    pool.warmUp(3);
    expect(pool.size()).toBe(3);

    const iframe = pool.acquire();
    expect(iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(pool.size()).toBe(2);

    // The returned iframe should have the correct sandbox attribute
    expect(iframe.getAttribute('sandbox')).toBe(SANDBOX_POLICY);
  });

  it('acquire creates new iframe when pool is empty', () => {
    expect(pool.size()).toBe(0);

    const iframe = pool.acquire();
    expect(iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(iframe.getAttribute('sandbox')).toBe(SANDBOX_POLICY);
    // Pool is still empty since we created a new one, not popped from pool
    expect(pool.size()).toBe(0);
  });

  it('release returns iframe to pool after clearing srcdoc', () => {
    const iframe = pool.acquire();
    iframe.srcdoc = '<html><body>widget content</body></html>';

    pool.release(iframe);
    expect(pool.size()).toBe(1);
  });

  it('does not exceed maxSize', () => {
    const smallPool = createIframePool(3);
    smallPool.warmUp(10);
    expect(smallPool.size()).toBe(3);
    expect(smallPool.maxSize).toBe(3);
  });

  it('destroys excess iframes beyond maxSize', () => {
    const smallPool = createIframePool(2);

    // Create 3 iframes and attach them to the DOM
    const iframe1 = document.createElement('iframe');
    const iframe2 = document.createElement('iframe');
    const iframe3 = document.createElement('iframe');

    document.body.appendChild(iframe1);
    document.body.appendChild(iframe2);
    document.body.appendChild(iframe3);

    // Release all 3 into a pool with max=2
    smallPool.release(iframe1);
    smallPool.release(iframe2);
    smallPool.release(iframe3);

    // Pool should only hold 2
    expect(smallPool.size()).toBe(2);

    // The 3rd iframe (excess) should have been removed from the DOM
    expect(iframe3.parentNode).toBeNull();
  });

  it('released iframe has srcdoc cleared', () => {
    const iframe = pool.acquire();
    iframe.srcdoc = '<html><body>test</body></html>';
    iframe.setAttribute('src', 'about:blank');

    pool.release(iframe);

    // Acquire the same iframe back from the pool
    const reacquired = pool.acquire();
    expect(reacquired.srcdoc).toBe('');
    expect(reacquired.hasAttribute('src')).toBe(false);
  });

  it('size() returns current count', () => {
    expect(pool.size()).toBe(0);

    pool.warmUp(4);
    expect(pool.size()).toBe(4);

    pool.acquire();
    expect(pool.size()).toBe(3);

    pool.acquire();
    expect(pool.size()).toBe(2);

    const iframe = pool.acquire();
    expect(pool.size()).toBe(1);

    pool.release(iframe);
    expect(pool.size()).toBe(2);
  });

  it('destroy removes all iframes', () => {
    // Acquire iframes, attach to DOM, then release back into pool
    const iframes: HTMLIFrameElement[] = [];
    for (let i = 0; i < 5; i++) {
      const iframe = pool.acquire();
      document.body.appendChild(iframe);
      iframes.push(iframe);
    }

    // Release back into pool
    for (const iframe of iframes) {
      pool.release(iframe);
    }
    expect(pool.size()).toBe(5);

    // Destroy should remove all from DOM and clear the pool
    pool.destroy();
    expect(pool.size()).toBe(0);

    // All iframes that were in the DOM should be removed
    for (const iframe of iframes) {
      expect(iframe.parentNode).toBeNull();
    }
  });

  it('handles rapid acquire/release cycles', () => {
    const smallPool = createIframePool(5);
    smallPool.warmUp(3);

    // Rapid acquire/release cycles
    for (let i = 0; i < 50; i++) {
      const iframe = smallPool.acquire();
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
      expect(iframe.getAttribute('sandbox')).toBe(SANDBOX_POLICY);

      // Simulate setting content
      iframe.srcdoc = `<html><body>cycle ${i}</body></html>`;

      smallPool.release(iframe);
    }

    // Pool should still be valid and within max size
    expect(smallPool.size()).toBeLessThanOrEqual(5);
    expect(smallPool.size()).toBeGreaterThan(0);

    // Acquired iframe should have cleared srcdoc from release
    const final = smallPool.acquire();
    expect(final.srcdoc).toBe('');
  });
});
