/**
 * Lazy Loader
 *
 * Uses IntersectionObserver to defer widget iframe loading
 * until the widget's container enters the viewport.
 * Includes 200px rootMargin for pre-loading slightly before visible.
 *
 * @module runtime/lifecycle
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/** Pre-load margin in pixels */
export const LAZY_LOAD_MARGIN = 200;

/**
 * Lazy loader for viewport-based widget initialization.
 */
export interface LazyLoader {
  /** Start observing an element for viewport entry */
  observe(instanceId: string, element: HTMLElement, onVisible: () => void): void;
  /** Stop observing an element */
  unobserve(instanceId: string): void;
  /** Clean up all observers */
  destroy(): void;
}

/**
 * Creates a lazy loader using IntersectionObserver.
 *
 * @returns A LazyLoader instance
 */
export function createLazyLoader(): LazyLoader {
  // TODO: Implement — see runtime plan section 6.2
  throw new Error('Not implemented: createLazyLoader');
}
