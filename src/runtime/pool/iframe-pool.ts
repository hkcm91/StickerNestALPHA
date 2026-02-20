/**
 * iframe Pool
 *
 * Reuses iframe elements instead of creating/destroying them.
 * Pool maintains warm iframes for fast widget initialization.
 *
 * @module runtime/pool
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { SANDBOX_POLICY } from '../security/sandbox-policy';

/** Default maximum pool size */
export const DEFAULT_POOL_MAX_SIZE = 20;

/** Default warm-up count on startup */
export const DEFAULT_WARMUP_COUNT = 5;

/**
 * iframe pool for widget performance.
 */
export interface IframePool {
  /** Get a warm iframe from the pool (or create new) */
  acquire(): HTMLIFrameElement;
  /** Return an iframe to the pool (clears srcdoc) */
  release(iframe: HTMLIFrameElement): void;
  /** Pre-create iframes on app startup */
  warmUp(count?: number): void;
  /** Current pool size */
  size(): number;
  /** Maximum pool size */
  readonly maxSize: number;
  /** Destroy all iframes and clean up */
  destroy(): void;
}

/**
 * Creates a fresh iframe element with sandbox attributes.
 */
function createIframe(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', SANDBOX_POLICY);
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  return iframe;
}

/**
 * Creates an iframe pool.
 *
 * @param max - Maximum pool size (default: 20)
 * @returns An IframePool instance
 */
export function createIframePool(max?: number): IframePool {
  const poolMaxSize = max ?? DEFAULT_POOL_MAX_SIZE;
  const pool: HTMLIFrameElement[] = [];

  return {
    acquire(): HTMLIFrameElement {
      if (pool.length > 0) {
        return pool.pop()!;
      }
      return createIframe();
    },

    release(iframe: HTMLIFrameElement): void {
      // Clear content
      iframe.srcdoc = '';
      iframe.removeAttribute('src');

      if (pool.length < poolMaxSize) {
        pool.push(iframe);
      } else {
        // Pool full — remove from DOM if attached
        iframe.parentNode?.removeChild(iframe);
      }
    },

    warmUp(count?: number): void {
      const target = count ?? DEFAULT_WARMUP_COUNT;
      for (let i = 0; i < target && pool.length < poolMaxSize; i++) {
        pool.push(createIframe());
      }
    },

    size(): number {
      return pool.length;
    },

    get maxSize(): number {
      return poolMaxSize;
    },

    destroy(): void {
      for (const iframe of pool) {
        iframe.parentNode?.removeChild(iframe);
      }
      pool.length = 0;
    },
  };
}
