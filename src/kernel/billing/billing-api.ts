/**
 * Billing API — client-side helpers to invoke Stripe edge functions.
 * All Stripe secret operations happen server-side; this module only
 * calls the Supabase edge functions and reads public billing state.
 *
 * @module kernel/billing
 * @layer L0
 */

import { supabase } from '../supabase';
import type { Database } from '../supabase/types';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
type TierQuotaRow = Database['public']['Tables']['tier_quotas']['Row'];

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

export interface TierQuota {
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
  maxCanvases: number;
  maxStorageMb: number;
  maxWidgetsPerCanvas: number;
  maxCollaboratorsPerCanvas: number;
  canUseCustomDomain: boolean;
  canUseIntegrations: boolean;
  canPublishWidgets: boolean;
  canSell: boolean;
}

/**
 * Fetches the current user's subscription record.
 * Returns null if the user has no subscription (free tier, no Stripe customer).
 */
export async function getSubscription(): Promise<Subscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = (await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: SubscriptionRow | null; error: { message: string } | null };

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    tier: data.tier as Subscription['tier'],
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialEnd: data.trial_end,
  };
}

/**
 * Local fallback quotas used when the `tier_quotas` table is unavailable.
 * These ensure the app remains functional during development or when
 * the billing table has not been provisioned yet.
 */
const LOCAL_QUOTA_FALLBACKS: Record<string, TierQuota> = {
  free: {
    tier: 'free',
    maxCanvases: 5,
    maxStorageMb: 200,
    maxWidgetsPerCanvas: 20,
    maxCollaboratorsPerCanvas: 3,
    canUseCustomDomain: false,
    canUseIntegrations: true,
    canPublishWidgets: false,
    canSell: false,
  },
  creator: {
    tier: 'creator',
    maxCanvases: 25,
    maxStorageMb: 2000,
    maxWidgetsPerCanvas: 50,
    maxCollaboratorsPerCanvas: 10,
    canUseCustomDomain: true,
    canUseIntegrations: true,
    canPublishWidgets: true,
    canSell: false,
  },
  pro: {
    tier: 'pro',
    maxCanvases: -1,
    maxStorageMb: 10000,
    maxWidgetsPerCanvas: -1,
    maxCollaboratorsPerCanvas: 50,
    canUseCustomDomain: true,
    canUseIntegrations: true,
    canPublishWidgets: true,
    canSell: true,
  },
  enterprise: {
    tier: 'enterprise',
    maxCanvases: -1,
    maxStorageMb: -1,
    maxWidgetsPerCanvas: -1,
    maxCollaboratorsPerCanvas: -1,
    canUseCustomDomain: true,
    canUseIntegrations: true,
    canPublishWidgets: true,
    canSell: true,
  },
};

/**
 * Fetches the quota definition for a given tier.
 * Falls back to local defaults when the `tier_quotas` table is unavailable.
 */
export async function getTierQuota(
  tier: 'free' | 'creator' | 'pro' | 'enterprise',
): Promise<TierQuota | null> {
  const { data, error } = (await supabase
    .from('tier_quotas')
    .select('*')
    .eq('tier', tier)
    .single()) as { data: TierQuotaRow | null; error: { message: string } | null };

  if (error || !data) {
    // Use local fallback so the app works without the billing table
    return LOCAL_QUOTA_FALLBACKS[tier] ?? null;
  }

  return {
    tier: data.tier as TierQuota['tier'],
    maxCanvases: data.max_canvases,
    maxStorageMb: data.max_storage_mb,
    maxWidgetsPerCanvas: data.max_widgets_per_canvas,
    maxCollaboratorsPerCanvas: data.max_collaborators_per_canvas,
    canUseCustomDomain: data.can_use_custom_domain,
    canUseIntegrations: data.can_use_integrations,
    canPublishWidgets: data.can_publish_widgets,
    canSell: data.can_sell,
  };
}

export interface CheckoutResult {
  /** URL to redirect to (Stripe Checkout or success page) */
  url: string;
  /** True if tier was granted immediately (no payment required) */
  free?: boolean;
}

/**
 * Creates a Stripe Checkout session for a platform subscription.
 * For free tiers, grants the tier immediately and returns a success URL.
 * For paid tiers, returns the Stripe Checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  tier: 'creator' | 'pro' | 'enterprise',
): Promise<CheckoutResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('stripe-checkout', {
    body: { tier },
  });

  if (response.error) {
    throw new Error(response.error.message ?? 'Failed to create checkout session');
  }

  const url = response.data?.url;
  if (!url) throw new Error('No checkout URL returned');

  return {
    url,
    free: response.data?.free === true,
  };
}

/**
 * Creates a Stripe Customer Portal session.
 * Returns the Portal URL to redirect the user to.
 */
/**
 * Fetches current resource usage counts for the authenticated user.
 * Returns counts for canvases and storage (MB).
 */
export async function getUsageCounts(userId: string): Promise<{
  canvasCount: number;
  storageMb: number;
}> {
  const [canvasResult, storageResult] = await Promise.all([
    supabase
      .from('canvases')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    supabase.rpc('get_user_storage_bytes', { target_user_id: userId }),
  ]);

  const storageBytes = (storageResult.data as number) ?? 0;

  return {
    canvasCount: canvasResult.count ?? 0,
    storageMb: Math.round(storageBytes / (1024 * 1024)),
  };
}

export async function createPortalSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('stripe-portal', {});

  if (response.error) {
    throw new Error(response.error.message ?? 'Failed to create portal session');
  }

  const url = response.data?.url;
  if (!url) throw new Error('No portal URL returned');

  return url;
}
