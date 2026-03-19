/**
 * BillingSection tests
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

vi.mock('../../../kernel/billing', () => ({
  getSubscription: vi.fn(),
  getTierQuota: vi.fn(),
  getUsageCounts: vi.fn(),
  createPortalSession: vi.fn(),
}));

import {
  getSubscription,
  getTierQuota,
  getUsageCounts,
  createPortalSession,
} from '../../../kernel/billing';

import { BillingSection } from './BillingSection';

const mockGetSubscription = getSubscription as ReturnType<typeof vi.fn>;
const mockGetTierQuota = getTierQuota as ReturnType<typeof vi.fn>;
const mockGetUsageCounts = getUsageCounts as ReturnType<typeof vi.fn>;
const mockCreatePortalSession = createPortalSession as ReturnType<typeof vi.fn>;

const FREE_USER = {
  id: 'user-1',
  email: 'a@b.c',
  displayName: 'Test',
  avatarUrl: null,
  tier: 'free' as const,
};

const CREATOR_USER = { ...FREE_USER, tier: 'creator' as const };

const FREE_QUOTA = {
  tier: 'free',
  maxCanvases: 3,
  maxStorageMb: 100,
  maxWidgetsPerCanvas: 10,
  maxCollaboratorsPerCanvas: 3,
  canUseCustomDomain: false,
  canUseIntegrations: false,
  canPublishWidgets: false,
  canSell: false,
};

describe('BillingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
    mockGetSubscription.mockResolvedValue(null);
    mockGetTierQuota.mockResolvedValue(FREE_QUOTA);
    mockGetUsageCounts.mockResolvedValue({ canvasCount: 0, storageMb: 0 });
  });

  it('shows loading state initially', () => {
    useAuthStore.getState().setUser(FREE_USER);
    render(<BillingSection />);
    expect(screen.getByTestId('billing-loading')).toBeTruthy();
  });

  it('displays free tier info for free users', async () => {
    useAuthStore.getState().setUser(FREE_USER);
    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByTestId('billing-section')).toBeTruthy();
    });

    expect(screen.getByText('Free Plan')).toBeTruthy();
    expect(screen.getByText('Free tier — no payment on file')).toBeTruthy();
  });

  it('shows "Upgrade" link for free tier users', async () => {
    useAuthStore.getState().setUser(FREE_USER);
    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByText('Upgrade')).toBeTruthy();
    });
  });

  it('shows "Manage Subscription" button for paid tier users', async () => {
    useAuthStore.getState().setUser(CREATOR_USER);
    mockGetSubscription.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_456',
      tier: 'creator',
      status: 'active',
      currentPeriodEnd: '2026-04-01T00:00:00Z',
      cancelAtPeriodEnd: false,
    });
    mockGetTierQuota.mockResolvedValue({
      ...FREE_QUOTA,
      tier: 'creator',
      maxCanvases: 10,
    });

    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByText('Manage Subscription')).toBeTruthy();
    });
  });

  it('shows usage bars with live data', async () => {
    useAuthStore.getState().setUser(FREE_USER);
    mockGetUsageCounts.mockResolvedValue({ canvasCount: 2, storageMb: 45 });

    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeTruthy();
      expect(screen.getByText('45 / 100')).toBeTruthy();
    });
  });

  it('shows renewal date for active subscription', async () => {
    useAuthStore.getState().setUser(CREATOR_USER);
    mockGetSubscription.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_456',
      tier: 'creator',
      status: 'active',
      currentPeriodEnd: '2026-04-01T00:00:00Z',
      cancelAtPeriodEnd: false,
    });
    mockGetTierQuota.mockResolvedValue({
      ...FREE_QUOTA,
      tier: 'creator',
      maxCanvases: 10,
    });

    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByTestId('billing-section').textContent).toContain('Renews');
    });
  });

  it('shows "Cancels" label when cancel_at_period_end is true', async () => {
    useAuthStore.getState().setUser(CREATOR_USER);
    mockGetSubscription.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_456',
      tier: 'creator',
      status: 'active',
      currentPeriodEnd: '2026-04-01T00:00:00Z',
      cancelAtPeriodEnd: true,
    });
    mockGetTierQuota.mockResolvedValue({
      ...FREE_QUOTA,
      tier: 'creator',
      maxCanvases: 10,
    });

    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByTestId('billing-section').textContent).toContain('Cancels');
    });
  });

  it('redirects to pricing when portal session fails', async () => {
    useAuthStore.getState().setUser(CREATOR_USER);
    mockGetSubscription.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      tier: 'creator',
      status: 'active',
    });
    mockGetTierQuota.mockResolvedValue({
      ...FREE_QUOTA,
      tier: 'creator',
    });
    mockCreatePortalSession.mockRejectedValue(new Error('No subscription'));

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByText('Manage Subscription')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Manage Subscription'));

    await waitFor(() => {
      expect(window.location.href).toBe('/pricing');
    });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });
});
