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
 * Creates an iframe pool.
 *
 * @param maxSize - Maximum pool size (default: 20)
 * @returns An IframePool instance
 */
export function createIframePool(_maxSize?: number): IframePool {
  // TODO: Implement — see runtime plan section 6.1
  throw new Error('Not implemented: createIframePool');
}
