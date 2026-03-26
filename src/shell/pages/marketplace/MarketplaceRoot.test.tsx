/**
 * MarketplaceRoot routing tests
 * @vitest-environment happy-dom
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'user-1' } }),
  ),
}));

vi.mock('../../../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ registry: {} }),
  ),
}));

vi.mock('../../../../marketplace/api/marketplace-api', () => ({
  createMarketplaceAPI: () => ({
    search: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasMore: false }),
    getFeatured: vi.fn().mockResolvedValue([]),
    getWidget: vi.fn().mockResolvedValue(null),
    getInstalledWidgets: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock('../../../../marketplace/install/install-flow', () => ({
  createInstallFlowService: () => ({
    install: vi.fn(),
    uninstall: vi.fn(),
    isInstalled: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock('../../../../marketplace/publisher/publisher-dashboard', () => ({
  createPublisherDashboard: () => ({
    getMyWidgets: vi.fn().mockResolvedValue([]),
    getVersionHistory: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock('../../../../marketplace/reviews/review-manager', () => ({
  createReviewManager: () => ({
    getReviews: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasMore: false }),
    getUserReview: vi.fn().mockResolvedValue(null),
  }),
}));

import { MarketplaceRoot } from './MarketplaceRoot';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MarketplaceRoot />
    </MemoryRouter>,
  );
}

describe('MarketplaceRoot', () => {
  it('renders BrowsePage at /marketplace', async () => {
    renderAt('/');
    expect(await screen.findByTestId('page-marketplace')).toBeTruthy();
  });

  it('renders LibraryPage at /marketplace/library', async () => {
    renderAt('/library');
    expect(await screen.findByTestId('page-marketplace-library')).toBeTruthy();
  });

  it('renders PublisherPage at /marketplace/publisher', async () => {
    renderAt('/publisher');
    expect(await screen.findByTestId('page-marketplace-publisher')).toBeTruthy();
  });
});
