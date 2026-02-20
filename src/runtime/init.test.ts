/**
 * Tests for Runtime Initialization
 *
 * @module runtime/init
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

// Mock the event bus
vi.mock('../kernel/bus', () => {
  const subscribeFn = vi.fn(() => vi.fn());
  return {
    bus: {
      emit: vi.fn(),
      subscribe: subscribeFn,
      subscribeAll: vi.fn(),
      getHistory: vi.fn(),
    },
  };
});

// Mock the widget store
vi.mock('../kernel/stores/widget/widget.store', () => {
  const registerWidget = vi.fn();
  const unregisterWidget = vi.fn();
  return {
    useWidgetStore: Object.assign(
      vi.fn(() => ({ registry: {}, instances: {} })),
      {
        getState: vi.fn(() => ({
          registry: {},
          instances: {},
          registerWidget,
          unregisterWidget,
        })),
      },
    ),
  };
});

// Mock iframe pool
const mockPool = {
  acquire: vi.fn(),
  release: vi.fn(),
  warmUp: vi.fn(),
  size: vi.fn(() => 5),
  maxSize: 20,
  destroy: vi.fn(),
};
vi.mock('./pool/iframe-pool', () => ({
  createIframePool: vi.fn(() => mockPool),
  DEFAULT_WARMUP_COUNT: 5,
}));

// Mock rate limiter
const mockRateLimiter = {
  check: vi.fn(() => true),
  reset: vi.fn(),
  setLimit: vi.fn(),
  destroy: vi.fn(),
};
vi.mock('./security/rate-limiter', () => ({
  createRateLimiter: vi.fn(() => mockRateLimiter),
}));

// --- Imports (after mocks) ---

import { bus } from '../kernel/bus';
import { useWidgetStore } from '../kernel/stores/widget/widget.store';

import {
  initRuntime,
  teardownRuntime,
  isRuntimeInitialized,
  getIframePool,
  getRateLimiter,
} from './init';
import { createIframePool } from './pool/iframe-pool';
import { createRateLimiter } from './security/rate-limiter';

// --- Tests ---

describe('initRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure clean state before each test
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  afterEach(() => {
    // Always tear down to reset module-level state
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  it('warms up iframe pool', () => {
    initRuntime();

    expect(createIframePool).toHaveBeenCalledOnce();
    expect(mockPool.warmUp).toHaveBeenCalledWith(5);
  });

  it('registers built-in widgets', () => {
    initRuntime();

    const store = useWidgetStore.getState();
    // 5 built-in widgets: sticky-note, clock, counter, image-viewer, markdown-note
    expect(store.registerWidget).toHaveBeenCalledTimes(5);
  });

  it('sets up bus subscriptions for widget events', () => {
    initRuntime();

    // Should subscribe to shell.theme.changed and marketplace.widget.uninstalled
    expect(bus.subscribe).toHaveBeenCalledWith(
      'shell.theme.changed',
      expect.any(Function),
    );
    expect(bus.subscribe).toHaveBeenCalledWith(
      'marketplace.widget.uninstalled',
      expect.any(Function),
    );
    expect(bus.subscribe).toHaveBeenCalledTimes(2);
  });

  it('is idempotent — safe to call multiple times', () => {
    initRuntime();
    initRuntime();

    // Pool should only be created once
    expect(createIframePool).toHaveBeenCalledOnce();
    expect(createRateLimiter).toHaveBeenCalledOnce();
    expect(mockPool.warmUp).toHaveBeenCalledOnce();

    // Built-in widgets should only be registered once
    const store = useWidgetStore.getState();
    expect(store.registerWidget).toHaveBeenCalledTimes(5);
  });
});

describe('teardownRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  afterEach(() => {
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  it('destroys iframe pool', () => {
    initRuntime();
    teardownRuntime();

    expect(mockPool.destroy).toHaveBeenCalledOnce();
    expect(getIframePool()).toBeNull();
  });

  it('destroys rate limiter', () => {
    initRuntime();
    teardownRuntime();

    expect(mockRateLimiter.destroy).toHaveBeenCalledOnce();
    expect(getRateLimiter()).toBeNull();
  });

  it('cleans up bus subscriptions', () => {
    initRuntime();

    // Collect the unsubscribe functions returned by bus.subscribe
    const subscribeMock = bus.subscribe as ReturnType<typeof vi.fn>;
    const unsubscribeFns = subscribeMock.mock.results.map(
      (result: { type: string; value: unknown }) => result.value,
    );

    // Both subscriptions should have returned unsubscribe functions
    expect(unsubscribeFns).toHaveLength(2);

    teardownRuntime();

    // Each unsubscribe function should have been called
    for (const unsub of unsubscribeFns) {
      expect(unsub).toHaveBeenCalledOnce();
    }
  });
});

describe('isRuntimeInitialized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  afterEach(() => {
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  it('returns false before init', () => {
    expect(isRuntimeInitialized()).toBe(false);
  });

  it('returns true after init', () => {
    initRuntime();
    expect(isRuntimeInitialized()).toBe(true);
  });

  it('returns false after teardown', () => {
    initRuntime();
    expect(isRuntimeInitialized()).toBe(true);

    teardownRuntime();
    expect(isRuntimeInitialized()).toBe(false);
  });
});

describe('getIframePool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  afterEach(() => {
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  it('returns null before init', () => {
    expect(getIframePool()).toBeNull();
  });

  it('returns pool after init', () => {
    initRuntime();
    expect(getIframePool()).toBe(mockPool);
  });

  it('returns null after teardown', () => {
    initRuntime();
    teardownRuntime();
    expect(getIframePool()).toBeNull();
  });
});

describe('getRateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  afterEach(() => {
    if (isRuntimeInitialized()) {
      teardownRuntime();
    }
  });

  it('returns null before init', () => {
    expect(getRateLimiter()).toBeNull();
  });

  it('returns rate limiter after init', () => {
    initRuntime();
    expect(getRateLimiter()).toBe(mockRateLimiter);
  });

  it('returns null after teardown', () => {
    initRuntime();
    teardownRuntime();
    expect(getRateLimiter()).toBeNull();
  });
});
