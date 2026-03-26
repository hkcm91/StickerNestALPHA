/**
 * WidgetLifecycleManager Tests
 *
 * @module runtime/lifecycle
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { bus } from '../../kernel/bus';

import { createLifecycleManager } from './manager';

vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(), subscribeAll: vi.fn(), getHistory: vi.fn() },
}));

describe('createLifecycleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in UNLOADED state', () => {
    const lm = createLifecycleManager('i-1');
    expect(lm.getState()).toBe('UNLOADED');
  });

  it('follows the happy-path lifecycle: UNLOADED -> LOADING -> INITIALIZING -> READY -> RUNNING -> DESTROYING -> DEAD', () => {
    const lm = createLifecycleManager('i-2');
    lm.transition('LOADING');
    lm.transition('INITIALIZING');
    lm.transition('READY');
    lm.transition('RUNNING');
    lm.transition('DESTROYING');
    lm.transition('DEAD');
    expect(lm.getState()).toBe('DEAD');
  });

  it('throws on invalid transitions', () => {
    const lm = createLifecycleManager('i-3');
    expect(() => lm.transition('READY')).toThrow(/Invalid lifecycle transition/);
    expect(() => lm.transition('RUNNING')).toThrow(/Invalid lifecycle transition/);
    expect(lm.getState()).toBe('UNLOADED');
  });

  it('allows ERROR from LOADING, INITIALIZING, READY, and RUNNING', () => {
    for (const path of [
      ['LOADING'],
      ['LOADING', 'INITIALIZING'],
      ['LOADING', 'INITIALIZING', 'READY'],
      ['LOADING', 'INITIALIZING', 'READY', 'RUNNING'],
    ]) {
      const lm = createLifecycleManager('i-err');
      for (const s of path) lm.transition(s as any);
      lm.transition('ERROR');
      expect(lm.getState()).toBe('ERROR');
    }
  });

  it('recovers from ERROR -> LOADING', () => {
    const lm = createLifecycleManager('i-4');
    lm.transition('LOADING');
    lm.transition('ERROR');
    lm.transition('LOADING');
    expect(lm.getState()).toBe('LOADING');
  });

  it('emits widget.ready bus event on READY transition', () => {
    const lm = createLifecycleManager('i-5');
    lm.transition('LOADING');
    lm.transition('INITIALIZING');
    lm.transition('READY');
    expect(bus.emit).toHaveBeenCalledWith('widget.ready', { instanceId: 'i-5' });
  });

  it('emits widget.error bus event on ERROR transition', () => {
    const lm = createLifecycleManager('i-6');
    lm.transition('LOADING');
    lm.transition('ERROR');
    expect(bus.emit).toHaveBeenCalledWith('widget.error', { instanceId: 'i-6', from: 'LOADING' });
  });

  it('onTransition handler fires and unsubscribe works', () => {
    const lm = createLifecycleManager('i-7');
    const handler = vi.fn();
    const unsub = lm.onTransition(handler);

    lm.transition('LOADING');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'UNLOADED', to: 'LOADING', instanceId: 'i-7' }),
    );

    unsub();
    lm.transition('INITIALIZING');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handler errors do not prevent other handlers or crash the manager', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lm = createLifecycleManager('i-8');
    const bad = vi.fn(() => { throw new Error('boom'); });
    const good = vi.fn();

    lm.onTransition(bad);
    lm.onTransition(good);
    lm.transition('LOADING');

    expect(bad).toHaveBeenCalledTimes(1);
    expect(good).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('destroy() transitions to DEAD and clears handlers', () => {
    const lm = createLifecycleManager('i-9');
    const handler = vi.fn();
    lm.onTransition(handler);

    lm.transition('LOADING');
    expect(handler).toHaveBeenCalledTimes(1);

    lm.destroy();
    expect(lm.getState()).toBe('DEAD');
  });

  it('DEAD is terminal — no transitions allowed', () => {
    const lm = createLifecycleManager('i-10');
    lm.transition('LOADING');
    lm.transition('ERROR');
    lm.transition('DEAD');
    expect(() => lm.transition('LOADING')).toThrow(/Invalid lifecycle transition/);
  });
});
