/**
 * WidgetGrid tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { MarketplaceWidgetListing, PaginatedResult } from '../../../../marketplace/api/types';

import { WidgetGrid } from './WidgetGrid';

const mockWidget: MarketplaceWidgetListing = {
  id: 'w-1',
  name: 'Counter',
  slug: 'counter',
  description: 'A simple counter widget.',
  version: '1.0.0',
  authorId: 'a-1',
  thumbnailUrl: null,
  iconUrl: null,
  category: 'utilities',
  tags: ['counter'],
  license: 'MIT',
  isPublished: true,
  isDeprecated: false,
  installCount: 100,
  ratingAverage: 4.5,
  ratingCount: 10,
  isFree: true,
  priceCents: null,
  currency: 'usd',
  stripePriceId: null,
  metadata: {},
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const mockResults: PaginatedResult<MarketplaceWidgetListing> = {
  items: [mockWidget],
  total: 1,
  page: 1,
  pageSize: 20,
  hasMore: false,
};

describe('WidgetGrid', () => {
  it('shows loading state when loading and no results', () => {
    render(
      <WidgetGrid results={null} loading page={1} onPageChange={vi.fn()} onWidgetClick={vi.fn()} />,
    );
    expect(screen.getByText('Loading widgets...')).toBeTruthy();
  });

  it('shows empty state when no widgets found', () => {
    render(
      <WidgetGrid
        results={{ items: [], total: 0, page: 1, pageSize: 20, hasMore: false }}
        loading={false}
        page={1}
        onPageChange={vi.fn()}
        onWidgetClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/No widgets found/)).toBeTruthy();
  });

  it('renders widget cards in grid', () => {
    render(
      <WidgetGrid
        results={mockResults}
        loading={false}
        page={1}
        onPageChange={vi.fn()}
        onWidgetClick={vi.fn()}
      />,
    );
    expect(screen.getByTestId('marketplace-grid')).toBeTruthy();
    expect(screen.getAllByTestId('marketplace-widget-card')).toHaveLength(1);
  });

  it('shows pagination when total exceeds page size', () => {
    const manyResults: PaginatedResult<MarketplaceWidgetListing> = {
      items: [mockWidget],
      total: 40,
      page: 1,
      pageSize: 20,
      hasMore: true,
    };
    const onPageChange = vi.fn();
    render(
      <WidgetGrid
        results={manyResults}
        loading={false}
        page={1}
        onPageChange={onPageChange}
        onWidgetClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/Page 1 of 2/)).toBeTruthy();
    fireEvent.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables Previous on first page', () => {
    const manyResults: PaginatedResult<MarketplaceWidgetListing> = {
      items: [mockWidget],
      total: 40,
      page: 1,
      pageSize: 20,
      hasMore: true,
    };
    render(
      <WidgetGrid
        results={manyResults}
        loading={false}
        page={1}
        onPageChange={vi.fn()}
        onWidgetClick={vi.fn()}
      />,
    );
    const prevBtn = screen.getByText('Previous') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
  });
});
