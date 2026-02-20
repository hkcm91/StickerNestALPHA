import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../kernel/bus', () => {
  const subscribeFn = vi.fn(() => vi.fn());
  return {
    bus: {
      emit: vi.fn(),
      subscribe: subscribeFn,
    },
  };
});

import { bus } from '../kernel/bus';

import { initLab, teardownLab, isLabInitialized } from './init';

describe('initLab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (isLabInitialized()) teardownLab();
  });

  afterEach(() => {
    if (isLabInitialized()) teardownLab();
  });

  it('returns false before init', () => {
    expect(isLabInitialized()).toBe(false);
  });

  it('returns true after init', () => {
    initLab();
    expect(isLabInitialized()).toBe(true);
  });

  it('subscribes to shell.theme.changed', () => {
    initLab();
    expect(bus.subscribe).toHaveBeenCalledWith(
      'shell.theme.changed',
      expect.any(Function),
    );
  });

  it('is idempotent', () => {
    initLab();
    initLab();
    expect(bus.subscribe).toHaveBeenCalledTimes(1);
  });
});

describe('teardownLab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (isLabInitialized()) teardownLab();
  });

  it('returns false after teardown', () => {
    initLab();
    teardownLab();
    expect(isLabInitialized()).toBe(false);
  });

  it('calls unsubscribe functions', () => {
    initLab();
    const subscribeMock = bus.subscribe as ReturnType<typeof vi.fn>;
    const unsubFns = subscribeMock.mock.results.map((r: { value: unknown }) => r.value);

    teardownLab();

    for (const unsub of unsubFns) {
      expect(unsub).toHaveBeenCalled();
    }
  });
});
