/**
 * MarketplacePageFull tests
 * @module shell/pages
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

const mockSearch = vi.fn();
const mockGetWidget = vi.fn();
const mockInstall = vi.fn();
const mockUninstall = vi.fn();

vi.mock('../../marketplace/api/marketplace-api', () => ({
  createMarketplaceAPI: () => ({
    search: mockSearch,
    getWidget: mockGetWidget,
  }),
}));

vi.mock('../../marketplace/install/install-flow', () => ({
  createInstallFlowService: () => ({
    install: mockInstall,
    uninstall: mockUninstall,
  }),
}));

import { MarketplacePageFull } from './MarketplacePageFull';

const MOCK_WIDGET = {
  id: 'widget-1',
  name: 'Test Widget',
  description: 'A test widget',
  thumbnailUrl: null,
  ratingAverage: 4.5,
  ratingCount: 10,
  installCount: 100,
  isFree: true,
  priceCents: 0,
  metadata: {},
};

describe('MarketplacePageFull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'a@b.c', displayName: 'Test', avatarUrl: null, tier: 'free' },
    });
    // Reset widget registry
    useWidgetStore.setState({ registry: {} });
    mockSearch.mockResolvedValue({
      items: [MOCK_WIDGET],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
  });

  it('renders the marketplace page with search and grid', async () => {
    render(<MarketplacePageFull />);
    await waitFor(() => {
      expect(screen.getByTestId('page-marketplace')).toBeTruthy();
    });
    expect(screen.getByTestId('marketplace-search')).toBeTruthy();
    expect(screen.getByTestId('marketplace-category')).toBeTruthy();
    expect(screen.getByTestId('marketplace-sort')).toBeTruthy();
  });

  it('displays widget cards after loading', async () => {
    render(<MarketplacePageFull />);
    await waitFor(() => {
      expect(screen.getByTestId('marketplace-grid')).toBeTruthy();
    });
    const cards = screen.getAllByTestId('marketplace-widget-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Test Widget');
    expect(cards[0].textContent).toContain('4.5');
  });

  it('shows empty state when no widgets found', async () => {
    mockSearch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    render(<MarketplacePageFull />);
    await waitFor(() => {
      expect(screen.getByText(/No widgets found/)).toBeTruthy();
    });
  });

  it('shows loading state while fetching', () => {
    // Make search never resolve
    mockSearch.mockReturnValue(new Promise(() => {}));
    render(<MarketplacePageFull />);
    expect(screen.getByText(/Loading widgets/)).toBeTruthy();
  });

  it('shows "Installed" label for already-installed widgets', async () => {
    useWidgetStore.setState({
      registry: {
        'widget-1': {
          widgetId: 'widget-1',
          manifest: {} as never,
          htmlContent: '',
          isBuiltIn: false,
          installedAt: new Date().toISOString(),
        },
      },
    });
    render(<MarketplacePageFull />);
    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeTruthy();
    });
  });
});
