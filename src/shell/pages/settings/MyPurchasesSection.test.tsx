/**
 * MyPurchasesSection tests
 * @module shell/pages/settings
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

const mockFrom = vi.fn();

vi.mock('../../../kernel/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { MyPurchasesSection } from './MyPurchasesSection';

const MOCK_USER = {
  id: 'user-1',
  email: 'a@b.c',
  displayName: 'Test',
  avatarUrl: null,
  tier: 'free' as const,
};

function setupMock(subscriptions: unknown[] = [], orders: unknown[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'canvas_subscriptions') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: subscriptions, error: null }),
          }),
        }),
      };
    }
    if (table === 'orders') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: orders, error: null }),
            }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
  });
}

describe('MyPurchasesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it('shows loading state initially for authenticated user', () => {
    useAuthStore.setState({ user: MOCK_USER });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => new Promise(() => {}),
        }),
      }),
    });
    render(<MyPurchasesSection />);
    expect(screen.getByTestId('purchases-loading')).toBeTruthy();
    expect(screen.getByText('Loading purchases...')).toBeTruthy();
  });

  it('renders section with empty state when no purchases', async () => {
    useAuthStore.setState({ user: MOCK_USER });
    setupMock([], []);
    render(<MyPurchasesSection />);
    await waitFor(() => {
      expect(screen.getByTestId('purchases-section')).toBeTruthy();
    });
    expect(screen.getByText('My Purchases')).toBeTruthy();
    expect(screen.getByText(/No active subscriptions/)).toBeTruthy();
    expect(screen.getByText(/No orders yet/)).toBeTruthy();
  });

  it('displays active subscriptions', async () => {
    useAuthStore.setState({ user: MOCK_USER });
    setupMock(
      [
        {
          id: 'sub-1',
          canvas_id: 'c1',
          tier_id: 't1',
          status: 'active',
          current_period_end: '2026-04-01T00:00:00Z',
          created_at: '2026-03-01T00:00:00Z',
          canvas_subscription_tiers: {
            name: 'Premium',
            price_cents: 999,
            currency: 'usd',
            interval: 'month',
          },
        },
      ],
      [],
    );
    render(<MyPurchasesSection />);
    await waitFor(() => {
      expect(screen.getByText('Premium')).toBeTruthy();
    });
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('displays order history', async () => {
    useAuthStore.setState({ user: MOCK_USER });
    setupMock(
      [],
      [
        {
          id: 'order-1',
          item_id: 'item-1',
          amount_cents: 1500,
          currency: 'usd',
          status: 'paid',
          created_at: '2026-03-15T00:00:00Z',
          shop_items: {
            name: 'Cool Sticker Pack',
            item_type: 'digital',
          },
        },
      ],
    );
    render(<MyPurchasesSection />);
    await waitFor(() => {
      expect(screen.getByText('Cool Sticker Pack')).toBeTruthy();
    });
    expect(screen.getByText('paid')).toBeTruthy();
  });

  it('shows empty section immediately when user is null', () => {
    useAuthStore.setState({ user: null });
    render(<MyPurchasesSection />);
    // Should skip loading and go straight to rendered (no user = loading false)
    expect(screen.getByTestId('purchases-section')).toBeTruthy();
  });
});
