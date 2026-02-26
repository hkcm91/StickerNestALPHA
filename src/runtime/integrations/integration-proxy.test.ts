/**
 * Tests for Integration Proxy Registry
 *
 * @module runtime/integrations
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { describe, it, expect, vi } from 'vitest';

import { createIntegrationProxy } from './integration-proxy';
import type { IntegrationHandler } from './integration-proxy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockHandler(overrides?: Partial<IntegrationHandler>): IntegrationHandler {
  return {
    query: vi.fn().mockResolvedValue({ data: 'query-result' }),
    mutate: vi.fn().mockResolvedValue({ data: 'mutate-result' }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IntegrationProxy', () => {
  it('registers and checks existence of an integration', () => {
    const proxy = createIntegrationProxy();
    const handler = createMockHandler();

    expect(proxy.has('github')).toBe(false);

    proxy.register('github', handler);

    expect(proxy.has('github')).toBe(true);
  });

  it('query() calls the registered handler with params and returns the result', async () => {
    const proxy = createIntegrationProxy();
    const handler = createMockHandler({
      query: vi.fn().mockResolvedValue({ repos: ['repo-a', 'repo-b'] }),
    });

    proxy.register('github', handler);

    const result = await proxy.query('github', { org: 'my-org' });

    expect(handler.query).toHaveBeenCalledTimes(1);
    expect(handler.query).toHaveBeenCalledWith({ org: 'my-org' });
    expect(result).toEqual({ repos: ['repo-a', 'repo-b'] });
  });

  it('mutate() calls the registered handler with params and returns the result', async () => {
    const proxy = createIntegrationProxy();
    const handler = createMockHandler({
      mutate: vi.fn().mockResolvedValue({ id: 'issue-123' }),
    });

    proxy.register('github', handler);

    const result = await proxy.mutate('github', { action: 'create-issue', title: 'Bug' });

    expect(handler.mutate).toHaveBeenCalledTimes(1);
    expect(handler.mutate).toHaveBeenCalledWith({ action: 'create-issue', title: 'Bug' });
    expect(result).toEqual({ id: 'issue-123' });
  });

  it('query() throws when the integration is not registered', async () => {
    const proxy = createIntegrationProxy();

    await expect(proxy.query('unknown', {})).rejects.toThrow(
      'Integration "unknown" is not registered',
    );
  });

  it('mutate() throws when the integration is not registered', async () => {
    const proxy = createIntegrationProxy();

    await expect(proxy.mutate('unknown', {})).rejects.toThrow(
      'Integration "unknown" is not registered',
    );
  });

  it('unregister() removes a previously registered integration', async () => {
    const proxy = createIntegrationProxy();
    const handler = createMockHandler();

    proxy.register('github', handler);
    expect(proxy.has('github')).toBe(true);

    proxy.unregister('github');
    expect(proxy.has('github')).toBe(false);

    // query/mutate should now fail
    await expect(proxy.query('github', {})).rejects.toThrow(
      'Integration "github" is not registered',
    );
    await expect(proxy.mutate('github', {})).rejects.toThrow(
      'Integration "github" is not registered',
    );
  });

  it('supports multiple integrations registered simultaneously', async () => {
    const proxy = createIntegrationProxy();
    const githubHandler = createMockHandler({
      query: vi.fn().mockResolvedValue({ source: 'github' }),
    });
    const slackHandler = createMockHandler({
      query: vi.fn().mockResolvedValue({ source: 'slack' }),
    });

    proxy.register('github', githubHandler);
    proxy.register('slack', slackHandler);

    const githubResult = await proxy.query('github', {});
    const slackResult = await proxy.query('slack', {});

    expect(githubResult).toEqual({ source: 'github' });
    expect(slackResult).toEqual({ source: 'slack' });
    expect(githubHandler.query).toHaveBeenCalledTimes(1);
    expect(slackHandler.query).toHaveBeenCalledTimes(1);
  });

  it('re-registering an integration replaces the previous handler', async () => {
    const proxy = createIntegrationProxy();
    const handler1 = createMockHandler({
      query: vi.fn().mockResolvedValue('v1'),
    });
    const handler2 = createMockHandler({
      query: vi.fn().mockResolvedValue('v2'),
    });

    proxy.register('github', handler1);
    const result1 = await proxy.query('github', {});
    expect(result1).toBe('v1');

    proxy.register('github', handler2);
    const result2 = await proxy.query('github', {});
    expect(result2).toBe('v2');

    // Original handler should not have been called a second time
    expect(handler1.query).toHaveBeenCalledTimes(1);
    expect(handler2.query).toHaveBeenCalledTimes(1);
  });

  it('propagates errors thrown by the handler', async () => {
    const proxy = createIntegrationProxy();
    const handler = createMockHandler({
      query: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
      mutate: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    });

    proxy.register('github', handler);

    await expect(proxy.query('github', {})).rejects.toThrow('API rate limit exceeded');
    await expect(proxy.mutate('github', {})).rejects.toThrow('Unauthorized');
  });

  it('unregister() is a no-op for non-existent integrations', () => {
    const proxy = createIntegrationProxy();

    // Should not throw
    expect(() => proxy.unregister('nonexistent')).not.toThrow();
  });

  describe('integration() handle', () => {
    it('returns a handle that correctly routes query/mutate calls', async () => {
      const proxy = createIntegrationProxy();
      const handler = createMockHandler({
        query: vi.fn().mockResolvedValue('query-data'),
        mutate: vi.fn().mockResolvedValue('mutate-data'),
      });

      proxy.register('github', handler);
      const handle = proxy.integration('github');

      const queryResult = await handle.query({ repo: 'my-repo' });
      const mutateResult = await handle.mutate({ action: 'create' });

      expect(queryResult).toBe('query-data');
      expect(mutateResult).toBe('mutate-data');
      expect(handler.query).toHaveBeenCalledWith({ repo: 'my-repo' });
      expect(handler.mutate).toHaveBeenCalledWith({ action: 'create' });
    });

    it('handle query/mutate still fails if the integration is not registered', async () => {
      const proxy = createIntegrationProxy();
      const handle = proxy.integration('github');

      await expect(handle.query({})).rejects.toThrow(
        'Integration "github" is not registered',
      );
      await expect(handle.mutate({})).rejects.toThrow(
        'Integration "github" is not registered',
      );
    });

    it('handle reflects changes in the registry (register/unregister after handle creation)', async () => {
      const proxy = createIntegrationProxy();
      const handle = proxy.integration('github');

      const handler = createMockHandler({
        query: vi.fn().mockResolvedValue('success'),
      });

      // Register AFTER creating the handle
      proxy.register('github', handler);
      const result = await handle.query({});
      expect(result).toBe('success');

      // Unregister AFTER creating the handle
      proxy.unregister('github');
      await expect(handle.query({})).rejects.toThrow(
        'Integration "github" is not registered',
      );
    });
  });
});
