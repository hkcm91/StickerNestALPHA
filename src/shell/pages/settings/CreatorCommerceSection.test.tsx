/**
 * CreatorCommerceSection tests
 * @module shell/pages/settings
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

const mockFrom = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock('../../../kernel/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

import { CreatorCommerceSection } from './CreatorCommerceSection';

const MOCK_USER_FREE = {
  id: 'user-1',
  email: 'a@b.c',
  displayName: 'Test',
  avatarUrl: null,
  tier: 'free' as const,
};

const MOCK_USER_CREATOR = {
  ...MOCK_USER_FREE,
  tier: 'creator' as const,
};

function setupSupabaseMock(account: unknown = null, tiers: unknown[] = [], items: unknown[] = [], refunds: unknown[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'creator_accounts') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: account, error: null }),
          }),
        }),
      };
    }
    if (table === 'canvas_subscription_tiers') {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: tiers, error: null }),
        }),
      };
    }
    if (table === 'shop_items') {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: items, error: null }),
        }),
      };
    }
    if (table === 'orders') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: refunds, error: null }),
            }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
  });
}

describe('CreatorCommerceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it('shows upgrade prompt for free tier users', () => {
    useAuthStore.setState({ user: MOCK_USER_FREE });
    render(<CreatorCommerceSection />);
    expect(screen.getByTestId('creator-commerce-section')).toBeTruthy();
    expect(screen.getByText(/Upgrade to Creator tier/)).toBeTruthy();
    expect(screen.getByText('View Plans')).toBeTruthy();
  });

  it('shows loading state for creator tier users', () => {
    useAuthStore.setState({ user: MOCK_USER_CREATOR });
    setupSupabaseMock();
    // Mock never resolves
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => new Promise(() => {}),
          eq: () => ({
            order: () => new Promise(() => {}),
          }),
        }),
        order: () => new Promise(() => {}),
      }),
    });
    render(<CreatorCommerceSection />);
    expect(screen.getByTestId('creator-commerce-loading')).toBeTruthy();
  });

  it('shows Stripe Connect section for creator users after loading', async () => {
    useAuthStore.setState({ user: MOCK_USER_CREATOR });
    setupSupabaseMock(null, [], [], []);
    render(<CreatorCommerceSection />);
    await waitFor(() => {
      expect(screen.getByTestId('creator-commerce-section')).toBeTruthy();
    });
    expect(screen.getByText('Stripe Connect')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect with Stripe/ })).toBeTruthy();
  });

  it('shows connected status when Stripe is onboarded', async () => {
    useAuthStore.setState({ user: MOCK_USER_CREATOR });
    setupSupabaseMock(
      {
        id: 'acc-1',
        stripe_connect_account_id: 'acct_123',
        charges_enabled: true,
        payouts_enabled: true,
        onboarding_complete: true,
      },
      [],
      [],
      [],
    );
    render(<CreatorCommerceSection />);
    await waitFor(() => {
      expect(screen.getByText(/payments enabled/)).toBeTruthy();
    });
    expect(screen.getByText(/Open Stripe Dashboard/)).toBeTruthy();
  });

  it('displays subscription tiers when present', async () => {
    useAuthStore.setState({ user: MOCK_USER_CREATOR });
    setupSupabaseMock(
      null,
      [{ id: 't1', canvas_id: 'c1', name: 'Basic', price_cents: 500, currency: 'usd', interval: 'month', description: null, benefits: [], is_active: true, sort_order: 0 }],
      [],
      [],
    );
    render(<CreatorCommerceSection />);
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeTruthy();
    });
    expect(screen.getByText('1 tier')).toBeTruthy();
  });

  it('shows empty state when no tiers, items, or refunds', async () => {
    useAuthStore.setState({ user: MOCK_USER_CREATOR });
    setupSupabaseMock(null, [], [], []);
    render(<CreatorCommerceSection />);
    await waitFor(() => {
      expect(screen.getByText(/No subscription tiers created/)).toBeTruthy();
    });
    expect(screen.getByText(/No shop items yet/)).toBeTruthy();
    expect(screen.getByText(/No pending refund requests/)).toBeTruthy();
  });
});
