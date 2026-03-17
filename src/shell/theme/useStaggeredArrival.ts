/**
 * useStaggeredArrival — assigns --sn-stagger-index to container children.
 *
 * Consumers pair with CSS that uses the arrival animation:
 * ```css
 * .list > * {
 *   animation: sn-arrive var(--sn-duration-normal) var(--sn-ease-spring) both;
 *   animation-delay: calc(var(--sn-stagger-index, 0) * var(--sn-stagger-gap, 50ms));
 * }
 * ```
 *
 * The hook only sets the index — it does not apply animation styles,
 * keeping separation between indexing and visual presentation.
 *
 * @module shell/theme
 * @layer L6
 */

import { useEffect, useRef } from 'react';

function assignIndices(container: HTMLElement): void {
  const children = container.children;
  for (let i = 0; i < children.length; i++) {
    (children[i] as HTMLElement).style.setProperty('--sn-stagger-index', String(i));
  }
}

/**
 * Returns a ref to attach to a container element. On mount and when
 * children change, sets `--sn-stagger-index` on each direct child.
 */
export function useStaggeredArrival<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial assignment
    assignIndices(el);

    // Watch for child additions/removals
    const observer = new MutationObserver(() => {
      assignIndices(el);
    });

    observer.observe(el, { childList: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return ref;
}
