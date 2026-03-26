/**
 * LazyLoader Tests
 *
 * @module runtime/lifecycle
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createLazyLoader, LAZY_LOAD_MARGIN } from './lazy-loader';

describe('createLazyLoader', () => {
  let intersectionCallback: IntersectionObserverCallback;
  const mockObserve = vi.fn();
  const mockUnobserve = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    global.IntersectionObserver = vi.fn((callback, options) => {
      intersectionCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
        root: null,
        rootMargin: options?.rootMargin || '',
        thresholds: [options?.threshold ?? 0],
        takeRecords: () => [],
      };
    }) as unknown as typeof IntersectionObserver;
  });

  it('LAZY_LOAD_MARGIN is 200', () => {
    expect(LAZY_LOAD_MARGIN).toBe(200);
  });

  it('creates IntersectionObserver with 200px rootMargin', () => {
    createLazyLoader();
    expect(IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ rootMargin: '200px', threshold: 0 }),
    );
  });

  it('observe registers element with the IntersectionObserver', () => {
    const loader = createLazyLoader();
    const el = document.createElement('div');
    const cb = vi.fn();

    loader.observe('inst-1', el, cb);
    expect(mockObserve).toHaveBeenCalledWith(el);
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires callback when element intersects and auto-unobserves', () => {
    const loader = createLazyLoader();
    const el = document.createElement('div');
    const cb = vi.fn();

    loader.observe('inst-2', el, cb);

    intersectionCallback(
      [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(cb).toHaveBeenCalledTimes(1);
    expect(mockUnobserve).toHaveBeenCalledWith(el);
  });

  it('does not fire callback when element is not intersecting', () => {
    const loader = createLazyLoader();
    const el = document.createElement('div');
    const cb = vi.fn();

    loader.observe('inst-3', el, cb);

    intersectionCallback(
      [{ isIntersecting: false, target: el } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(cb).not.toHaveBeenCalled();
  });

  it('unobserve removes the element from observation', () => {
    const loader = createLazyLoader();
    const el = document.createElement('div');
    const cb = vi.fn();

    loader.observe('inst-4', el, cb);
    loader.unobserve('inst-4');

    expect(mockUnobserve).toHaveBeenCalledWith(el);

    // Intersection after unobserve should not trigger callback
    intersectionCallback(
      [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(cb).not.toHaveBeenCalled();
  });

  it('unobserve for unknown instanceId is a no-op', () => {
    const loader = createLazyLoader();
    loader.unobserve('does-not-exist');
    expect(mockUnobserve).not.toHaveBeenCalled();
  });

  it('observe replaces an existing observation for the same instanceId', () => {
    const loader = createLazyLoader();
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    loader.observe('inst-5', el1, cb1);
    loader.observe('inst-5', el2, cb2);

    // el1 should have been unobserved
    expect(mockUnobserve).toHaveBeenCalledWith(el1);
    // el2 should be observed
    expect(mockObserve).toHaveBeenCalledWith(el2);

    // Trigger intersection on el2
    intersectionCallback(
      [{ isIntersecting: true, target: el2 } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('destroy disconnects the observer and clears all state', () => {
    const loader = createLazyLoader();
    const el = document.createElement('div');
    loader.observe('inst-6', el, vi.fn());

    loader.destroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
