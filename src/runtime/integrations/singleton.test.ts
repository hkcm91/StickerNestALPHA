/**
 * Integration Proxy Singleton Tests
 *
 * @module runtime/integrations
 * @layer L3
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { getIntegrationProxy, resetIntegrationProxy } from './singleton';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getIntegrationProxy', () => {
  beforeEach(() => {
    resetIntegrationProxy();
  });

  it('returns an IntegrationProxy object', () => {
    const proxy = getIntegrationProxy();
    expect(proxy).toBeDefined();
    expect(typeof proxy.register).toBe('function');
    expect(typeof proxy.unregister).toBe('function');
    expect(typeof proxy.query).toBe('function');
    expect(typeof proxy.mutate).toBe('function');
    expect(typeof proxy.has).toBe('function');
  });

  it('returns the same instance on subsequent calls', () => {
    const first = getIntegrationProxy();
    const second = getIntegrationProxy();
    expect(first).toBe(second);
  });

  it('returns a fresh instance after resetIntegrationProxy()', () => {
    const first = getIntegrationProxy();
    resetIntegrationProxy();
    const second = getIntegrationProxy();
    expect(first).not.toBe(second);
  });

  it('the new instance after reset does not share state with the old one', () => {
    const first = getIntegrationProxy();
    first.register('test-integration', {
      query: async () => 'q',
      mutate: async () => 'm',
    });
    expect(first.has('test-integration')).toBe(true);

    resetIntegrationProxy();
    const second = getIntegrationProxy();
    expect(second.has('test-integration')).toBe(false);
  });

  it('registrations on the singleton persist across calls', () => {
    const proxy = getIntegrationProxy();
    proxy.register('my-handler', {
      query: async () => 'data',
      mutate: async () => 'ok',
    });

    const same = getIntegrationProxy();
    expect(same.has('my-handler')).toBe(true);
  });
});

describe('resetIntegrationProxy', () => {
  it('can be called multiple times without error', () => {
    expect(() => {
      resetIntegrationProxy();
      resetIntegrationProxy();
      resetIntegrationProxy();
    }).not.toThrow();
  });

  it('resets even when no instance has been created', () => {
    resetIntegrationProxy(); // no prior getIntegrationProxy call
    const proxy = getIntegrationProxy();
    expect(proxy).toBeDefined();
  });
});
