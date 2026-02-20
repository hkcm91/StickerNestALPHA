/**
 * Widget Detail Service Tests
 *
 * @module marketplace/detail
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createWidgetDetailService } from './widget-detail';

const mockGetWidget = vi.fn();
const mockGetWidgetBySlug = vi.fn();

vi.mock('../api/marketplace-api', () => ({
  createMarketplaceAPI: () => ({
    getWidget: mockGetWidget,
    getWidgetBySlug: mockGetWidgetBySlug,
  }),
}));

describe('WidgetDetailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches widget by id', async () => {
    const detail = { id: 'w1', name: 'Test', htmlContent: '<div/>' };
    mockGetWidget.mockResolvedValue(detail);

    const service = createWidgetDetailService();
    const result = await service.getById('w1');

    expect(mockGetWidget).toHaveBeenCalledWith('w1');
    expect(result).toEqual(detail);
  });

  it('fetches widget by slug', async () => {
    const detail = { id: 'w1', slug: 'test-widget' };
    mockGetWidgetBySlug.mockResolvedValue(detail);

    const service = createWidgetDetailService();
    const result = await service.getBySlug('test-widget');

    expect(mockGetWidgetBySlug).toHaveBeenCalledWith('test-widget');
    expect(result).toEqual(detail);
  });

  it('returns null for missing widget', async () => {
    mockGetWidget.mockResolvedValue(null);

    const service = createWidgetDetailService();
    const result = await service.getById('nonexistent');

    expect(result).toBeNull();
  });
});
