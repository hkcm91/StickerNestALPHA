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
  const entries = new Map<string, { element: HTMLElement; callback: () => void }>();
  const elementToId = new Map<Element, string>();

  const observer = new IntersectionObserver(
    (intersections) => {
      for (const entry of intersections) {
        if (entry.isIntersecting) {
          const instanceId = elementToId.get(entry.target);
          if (instanceId) {
            const record = entries.get(instanceId);
            if (record) {
              record.callback();
            }
            // Clean up after triggering
            observer.unobserve(entry.target);
            entries.delete(instanceId);
            elementToId.delete(entry.target);
          }
        }
      }
    },
    {
      rootMargin: `${LAZY_LOAD_MARGIN}px`,
      threshold: 0,
    },
  );

  return {
    observe(instanceId: string, element: HTMLElement, onVisible: () => void): void {
      // Clean up any existing observation for this instance
      const existing = entries.get(instanceId);
      if (existing) {
        observer.unobserve(existing.element);
        elementToId.delete(existing.element);
      }

      entries.set(instanceId, { element, callback: onVisible });
      elementToId.set(element, instanceId);
      observer.observe(element);
    },

    unobserve(instanceId: string): void {
      const record = entries.get(instanceId);
      if (record) {
        observer.unobserve(record.element);
        elementToId.delete(record.element);
        entries.delete(instanceId);
      }
    },

    destroy(): void {
      observer.disconnect();
      entries.clear();
      elementToId.clear();
    },
  };
}
