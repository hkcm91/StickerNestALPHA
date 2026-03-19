/**
 * Billing API Tests
 *
 * @module kernel/billing
 * @layer L0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Supabase client before imports
vi.mock('../supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../supabase/client';

import {
  getSubscription,
  getTierQuota,
  createCheckoutSession,
  createPortalSession,
} from './billing-api';

const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>;
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

function mockQuery(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

describe('Billing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscription', () => {
    it('returns null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getSubscription();
      expect(result).toBeNull();
    });

    it('returns null when no subscription exists', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      mockFrom.mockReturnValue(mockQuery(null));

      const result = await getSubscription();
      expect(result).toBeNull();
    });

    it('returns mapped subscription data when subscription exists', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const row = {
        id: 'sub-1',
        user_id: 'user-1',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_456',
        stripe_price_id: 'price_789',
        tier: 'creator',
        status: 'active',
        current_period_start: '2026-03-01T00:00:00Z',
        current_period_end: '2026-04-01T00:00:00Z',
        cancel_at_period_end: false,
        trial_end: null,
      };
      mockFrom.mockReturnValue(mockQuery(row));

      const result = await getSubscription();
      expect(result).toEqual({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_456',
        stripePriceId: 'price_789',
        tier: 'creator',
        status: 'active',
        currentPeriodStart: '2026-03-01T00:00:00Z',
        currentPeriodEnd: '2026-04-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEnd: null,
      });
    });

    it('returns null on query error', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      mockFrom.mockReturnValue(mockQuery(null, { message: 'DB error' }));

      const result = await getSubscription();
      expect(result).toBeNull();
    });
  });

  describe('getTierQuota', () => {
    it('returns mapped quota data for a valid tier', async () => {
      const row = {
        tier: 'free',
        max_canvases: 3,
        max_storage_mb: 100,
        max_widgets_per_canvas: 10,
        max_collaborators_per_canvas: 3,
        can_use_custom_domain: false,
        can_use_integrations: false,
        can_publish_widgets: false,
        can_sell: false,
      };
      mockFrom.mockReturnValue(mockQuery(row));

      const result = await getTierQuota('free');
      expect(result).toEqual({
        tier: 'free',
        maxCanvases: 3,
        maxStorageMb: 100,
        maxWidgetsPerCanvas: 10,
        maxCollaboratorsPerCanvas: 3,
        canUseCustomDomain: false,
        canUseIntegrations: false,
        canPublishWidgets: false,
        canSell: false,
      });
    });

    it('returns enterprise unlimited values correctly', async () => {
      const row = {
        tier: 'enterprise',
        max_canvases: -1,
        max_storage_mb: 50000,
        max_widgets_per_canvas: -1,
        max_collaborators_per_canvas: -1,
        can_use_custom_domain: true,
        can_use_integrations: true,
        can_publish_widgets: true,
        can_sell: true,
      };
      mockFrom.mockReturnValue(mockQuery(row));

      const result = await getTierQuota('enterprise');
      expect(result).not.toBeNull();
      expect(result!.maxCanvases).toBe(-1);
      expect(result!.canSell).toBe(true);
    });

    it('returns null on query error', async () => {
      mockFrom.mockReturnValue(mockQuery(null, { message: 'Not found' }));
      const result = await getTierQuota('free');
      expect(result).toBeNull();
    });
  });

  describe('createCheckoutSession', () => {
    it('throws when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(createCheckoutSession('creator')).rejects.toThrow(
        'Not authenticated',
      );
    });

    it('returns checkout URL for paid tier', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      mockInvoke.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_123' },
        error: null,
      });

      const result = await createCheckoutSession('pro');
      expect(result.url).toBe('https://checkout.stripe.com/session_123');
      expect(result.free).toBeFalsy();
      expect(mockInvoke).toHaveBeenCalledWith('stripe-checkout', {
        body: { tier: 'pro' },
      });
    });

    it('returns free flag when tier is granted immediately', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      mockInvoke.mockResolvedValue({
        data: { url: '/settings?billing=success', free: true },
        error: null,
      });

      const result = await createCheckoutSession('creator');
      expect(result.free).toBe(true);
    });

    it('throws when edge function returns error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Stripe not configured' },
      });

      await expect(createCheckoutSession('pro')).rejects.toThrow(
        'Stripe not configured',
      );
    });

    it('throws when no URL is returned', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      mockInvoke.mockResolvedValue({
        data: {},
        error: null,
      });

      await expect(createCheckoutSession('creator')).rejects.toThrow(
        'No checkout URL returned',
      );
    });
  });

  describe('createPortalSession', () => {
    it('throws when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(createPortalSession()).rejects.toThrow('Not authenticated');
    });

    it('returns portal URL on success', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      mockInvoke.mockResolvedValue({
        data: { url: 'https://billing.stripe.com/portal_123' },
        error: null,
      });

      const result = await createPortalSession();
      expect(result).toBe('https://billing.stripe.com/portal_123');
      expect(mockInvoke).toHaveBeenCalledWith('stripe-portal', {});
    });

    it('throws when edge function returns error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'No subscription found' },
      });

      await expect(createPortalSession()).rejects.toThrow(
        'No subscription found',
      );
    });

    it('throws when no URL is returned', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      mockInvoke.mockResolvedValue({
        data: {},
        error: null,
      });

      await expect(createPortalSession()).rejects.toThrow(
        'No portal URL returned',
      );
    });
  });
});
