/**
 * Marketplace Init Tests
 *
 * @module marketplace/init
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  initMarketplace,
  teardownMarketplace,
  isMarketplaceInitialized,
} from './init';

// Track subscriptions
const subscriptions = new Map<string, (event: unknown) => void>();
const mockSubscribe = vi.fn((type: string, handler: (event: unknown) => void) => {
  subscriptions.set(type, handler);
  return () => {
    subscriptions.delete(type);
  };
});
const mockEmit = vi.fn();

vi.mock('../kernel/bus', () => ({
  bus: {
    subscribe: (...args: unknown[]) => mockSubscribe(...(args as [string, (event: unknown) => void])),
    emit: (...args: unknown[]) => mockEmit(...args),
  },
}));

const mockPublish = vi.fn();

vi.mock('./publisher/publisher-dashboard', () => ({
  createPublisherDashboard: () => ({
    publish: mockPublish,
  }),
}));

vi.mock('@sn/types', () => ({
  MarketplaceEvents: {
    PUBLISH_REQUEST: 'marketplace.publish.request',
    PUBLISH_RESPONSE: 'marketplace.publish.response',
  },
}));

describe('Marketplace Init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptions.clear();
    teardownMarketplace();
  });

  it('initializes and subscribes to publish requests', () => {
    initMarketplace();

    expect(isMarketplaceInitialized()).toBe(true);
    expect(mockSubscribe).toHaveBeenCalledWith(
      'marketplace.publish.request',
      expect.any(Function),
    );
  });

  it('is idempotent', () => {
    initMarketplace();
    initMarketplace();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('handles publish request and emits response', async () => {
    mockPublish.mockResolvedValue({ success: true, widgetId: 'w1' });

    initMarketplace();

    const handler = subscriptions.get('marketplace.publish.request');
    expect(handler).toBeDefined();

    await handler!({
      type: 'marketplace.publish.request',
      payload: {
        html: '<div/>',
        manifest: { id: 'test', name: 'Test', version: '1.0.0' },
        thumbnail: null,
        authorId: 'author1',
      },
    });

    expect(mockEmit).toHaveBeenCalledWith(
      'marketplace.publish.response',
      expect.objectContaining({ success: true, listingId: 'w1' }),
    );
  });

  it('handles publish error gracefully', async () => {
    mockPublish.mockRejectedValue(new Error('DB error'));

    initMarketplace();

    const handler = subscriptions.get('marketplace.publish.request');
    await handler!({
      type: 'marketplace.publish.request',
      payload: {
        html: '<div/>',
        manifest: {},
        thumbnail: null,
        authorId: 'author1',
      },
    });

    expect(mockEmit).toHaveBeenCalledWith(
      'marketplace.publish.response',
      expect.objectContaining({ success: false, error: expect.any(String) }),
    );
  });

  it('tears down cleanly', () => {
    initMarketplace();
    expect(isMarketplaceInitialized()).toBe(true);

    teardownMarketplace();
    expect(isMarketplaceInitialized()).toBe(false);
  });
});
