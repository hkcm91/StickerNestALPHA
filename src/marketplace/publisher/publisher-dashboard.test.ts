/**
 * Publisher Dashboard Tests
 *
 * @module marketplace/publisher
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createPublisherDashboard } from './publisher-dashboard';

const mockEmit = vi.fn();
vi.mock('../../kernel/bus', () => ({
  bus: { emit: (...args: unknown[]) => mockEmit(...args) },
}));

const mockPublish = vi.fn();
const mockUpdateWidget = vi.fn();
const mockDeprecateWidget = vi.fn();
const mockDeleteWidget = vi.fn();
const mockGetPublishedByAuthor = vi.fn();
const mockGetVersionHistory = vi.fn();

vi.mock('../api/marketplace-api', () => ({
  createMarketplaceAPI: () => ({
    publish: mockPublish,
    updateWidget: mockUpdateWidget,
    deprecateWidget: mockDeprecateWidget,
    deleteWidget: mockDeleteWidget,
    getPublishedByAuthor: mockGetPublishedByAuthor,
    getVersionHistory: mockGetVersionHistory,
  }),
}));

vi.mock('@sn/types', () => ({
  MarketplaceEvents: {
    WIDGET_PUBLISHED: 'marketplace.widget.published',
    WIDGET_UPDATED: 'marketplace.widget.updated',
    WIDGET_DEPRECATED: 'marketplace.widget.deprecated',
  },
}));

describe('PublisherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publish', () => {
    it('publishes a widget and emits bus event', async () => {
      mockPublish.mockResolvedValue({ widgetId: 'new-w1' });

      const dashboard = createPublisherDashboard('author1');
      const manifest = { id: 'test', name: 'Test', version: '1.0.0' } as any;

      const result = await dashboard.publish('<div/>', manifest, null);

      expect(result.success).toBe(true);
      expect(result.widgetId).toBe('new-w1');
      expect(mockEmit).toHaveBeenCalledWith(
        'marketplace.widget.published',
        expect.objectContaining({ widgetId: 'new-w1' }),
      );
    });

    it('returns error on failure', async () => {
      mockPublish.mockRejectedValue(new Error('Slug conflict'));

      const dashboard = createPublisherDashboard('author1');
      const result = await dashboard.publish('<div/>', {} as any, null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slug conflict');
    });
  });

  describe('update', () => {
    it('updates widget and creates version', async () => {
      mockUpdateWidget.mockResolvedValue(undefined);

      const dashboard = createPublisherDashboard('author1');
      const result = await dashboard.update('w1', '<div>v2</div>', { version: '2.0.0' } as any, 'Bug fixes');

      expect(result.success).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith(
        'marketplace.widget.updated',
        expect.objectContaining({ widgetId: 'w1', version: '2.0.0' }),
      );
    });
  });

  describe('deprecate', () => {
    it('deprecates widget and emits event', async () => {
      mockDeprecateWidget.mockResolvedValue(undefined);

      const dashboard = createPublisherDashboard('author1');
      await dashboard.deprecate('w1');

      expect(mockDeprecateWidget).toHaveBeenCalledWith('w1');
      expect(mockEmit).toHaveBeenCalledWith(
        'marketplace.widget.deprecated',
        { widgetId: 'w1' },
      );
    });
  });

  describe('deleteWidget', () => {
    it('deletes the widget listing', async () => {
      mockDeleteWidget.mockResolvedValue(undefined);

      const dashboard = createPublisherDashboard('author1');
      await dashboard.deleteWidget('w1');

      expect(mockDeleteWidget).toHaveBeenCalledWith('w1');
    });
  });

  describe('getMyWidgets', () => {
    it('returns author widgets', async () => {
      mockGetPublishedByAuthor.mockResolvedValue([{ id: 'w1' }]);

      const dashboard = createPublisherDashboard('author1');
      const result = await dashboard.getMyWidgets();

      expect(result).toHaveLength(1);
      expect(mockGetPublishedByAuthor).toHaveBeenCalledWith('author1');
    });
  });
});
