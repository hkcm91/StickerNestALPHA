/**
 * Creator Commerce Section — Stripe Connect onboarding, subscription tier
 * management, and shop item management for creators.
 *
 * @module shell/pages/settings
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '../../../kernel/stores/auth';
import { supabase } from '../../../kernel/supabase';

// ── Types ────────────────────────────────────────────────────────────────

interface CreatorAccount {
  id: string;
  stripe_connect_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_complete: boolean;
}

interface SubscriptionTier {
  id: string;
  canvas_id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: string;
  description: string | null;
  benefits: string[];
  is_active: boolean;
  sort_order: number;
}

interface ShopItem {
  id: string;
  canvas_id: string;
  name: string;
  price_cents: number;
  currency: string;
  item_type: string;
  is_active: boolean;
  stock_count: number | null;
}

interface RefundRequest {
  id: string;
  buyer_id: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  item_id: string | null;
  metadata: Record<string, unknown> | null;
}

// ── Shared button style ──────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 'var(--sn-radius, 8px)',
  background: 'var(--sn-accent, #6366f1)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const btnOutlineStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  border: '1px solid var(--sn-border, #e5e7eb)',
  color: 'var(--sn-text, #1a1a2e)',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 12px)',
  padding: 20,
  marginBottom: 20,
  background: 'var(--sn-surface, #fff)',
};

// ── Component ────────────────────────────────────────────────────────────

export const CreatorCommerceSection: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tier = user?.tier ?? 'free';
  const canSell = tier === 'creator' || tier === 'pro' || tier === 'enterprise';

  const [account, setAccount] = useState<CreatorAccount | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);

  // Load creator account, tiers, and shop items
  useEffect(() => {
    if (!user || !canSell) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const [accountRes, tiersRes, itemsRes, refundsRes] = await Promise.all([
        supabase.from('creator_accounts').select('*').eq('user_id', user!.id).maybeSingle(),
        supabase
          .from('canvas_subscription_tiers')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('shop_items')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .eq('seller_id', user!.id)
          .eq('status', 'refund_requested')
          .order('created_at', { ascending: false }),
      ]);

      setAccount(accountRes.data as CreatorAccount | null);
      setTiers((tiersRes.data as SubscriptionTier[]) ?? []);
      setItems((itemsRes.data as ShopItem[]) ?? []);
      setRefundRequests((refundsRes.data as RefundRequest[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user, canSell]);

  const handleOnboard = useCallback(async () => {
    setOnboardLoading(true);
    try {
      const res = await supabase.functions.invoke('connect-onboard', {});
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch {
      // Fallback — show error
    } finally {
      setOnboardLoading(false);
    }
  }, []);

  const handleRefund = useCallback(async (orderId: string, action: 'approve' | 'deny') => {
    setProcessingRefund(orderId);
    try {
      const res = await supabase.functions.invoke('process-refund', {
        body: { orderId, action },
      });
      if (!res.error && !(res.data as Record<string, unknown>)?.error) {
        setRefundRequests((prev: RefundRequest[]) => prev.filter((r: RefundRequest) => r.id !== orderId));
      }
    } catch {
      // Error handling — toast would go here
    } finally {
      setProcessingRefund(null);
    }
  }, []);

  const handleDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await supabase.functions.invoke('connect-dashboard', {});
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      }
    } catch {
      // Fallback
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  if (!canSell) {
    return (
      <div data-testid="creator-commerce-section" style={{ maxWidth: 480 }}>
        <h2 style={{ marginBottom: 16 }}>Creator Commerce</h2>
        <div style={cardStyle}>
          <p style={{ fontSize: 14, color: 'var(--sn-text-muted, #6b7280)', margin: 0 }}>
            Upgrade to Creator tier or higher to sell subscriptions, digital goods, and
            physical items from your canvases.
          </p>
          <a href="/pricing" style={{ ...btnStyle, display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>
            View Plans
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div data-testid="creator-commerce-loading">Loading creator commerce...</div>;
  }

  const isConnected = account?.onboarding_complete && account?.charges_enabled;

  return (
    <div data-testid="creator-commerce-section" style={{ maxWidth: 560 }}>
      <h2 style={{ marginBottom: 16 }}>Creator Commerce</h2>

      {/* Stripe Connect Status */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Stripe Connect</h3>
        {!account?.stripe_connect_account_id ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', margin: '0 0 12px' }}>
              Connect your Stripe account to start receiving payments from your subscribers and buyers.
              Stripe handles payouts, tax reporting, and KYC.
            </p>
            <button onClick={handleOnboard} disabled={onboardLoading} style={btnStyle}>
              {onboardLoading ? 'Loading...' : 'Connect with Stripe'}
            </button>
          </>
        ) : !isConnected ? (
          <>
            <p style={{ fontSize: 13, color: '#f59e0b', margin: '0 0 12px' }}>
              Your Stripe onboarding is incomplete. Please finish setup to start receiving payments.
            </p>
            <button onClick={handleOnboard} disabled={onboardLoading} style={btnStyle}>
              {onboardLoading ? 'Loading...' : 'Continue Setup'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 13 }}>Connected — payments enabled</span>
            </div>
            <button onClick={handleDashboard} disabled={dashboardLoading} style={btnOutlineStyle}>
              {dashboardLoading ? 'Loading...' : 'Open Stripe Dashboard'}
            </button>
          </>
        )}
      </div>

      {/* Subscription Tiers */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Subscription Tiers</h3>
          <span style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>
            {tiers.length} tier{tiers.length !== 1 ? 's' : ''}
          </span>
        </div>
        {tiers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', margin: 0 }}>
            No subscription tiers created yet. Add tiers from your canvas settings to let
            visitors subscribe.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tiers.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: '1px solid var(--sn-border, #e5e7eb)',
                  borderRadius: 8,
                  fontSize: 13,
                  opacity: t.is_active ? 1 : 0.5,
                }}
              >
                <div>
                  <strong>{t.name}</strong>
                  <span style={{ marginLeft: 8, color: 'var(--sn-text-muted, #6b7280)' }}>
                    {(t.price_cents / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: t.currency || 'usd',
                    })}/{t.interval || 'month'}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: t.is_active ? '#22c55e' : 'var(--sn-text-muted, #6b7280)' }}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shop Items */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Shop Items</h3>
          <span style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {items.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', margin: 0 }}>
            No shop items yet. Add items from your canvas to sell digital or physical goods.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: '1px solid var(--sn-border, #e5e7eb)',
                  borderRadius: 8,
                  fontSize: 13,
                  opacity: item.is_active ? 1 : 0.5,
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span style={{ marginLeft: 8, color: 'var(--sn-text-muted, #6b7280)' }}>
                    {(item.price_cents / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: item.currency || 'usd',
                    })}
                  </span>
                  <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--sn-text-muted, #6b7280)' }}>
                    ({item.item_type})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  {item.stock_count !== null && (
                    <span style={{ color: item.stock_count > 0 ? 'var(--sn-text-muted, #6b7280)' : '#ef4444' }}>
                      {item.stock_count > 0 ? `${item.stock_count} in stock` : 'Sold out'}
                    </span>
                  )}
                  <span style={{ color: item.is_active ? '#22c55e' : 'var(--sn-text-muted, #6b7280)' }}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Refunds */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Pending Refunds</h3>
          <span style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>
            {refundRequests.length} request{refundRequests.length !== 1 ? 's' : ''}
          </span>
        </div>
        {refundRequests.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', margin: 0 }}>
            No pending refund requests.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {refundRequests.map((req) => (
              <div
                key={req.id}
                data-testid={`refund-request-${req.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: '1px solid var(--sn-border, #e5e7eb)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>
                    {(req.amount_cents / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: req.currency || 'usd',
                    })}
                  </span>
                  <span style={{ marginLeft: 8, color: 'var(--sn-text-muted, #6b7280)', fontSize: 11 }}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleRefund(req.id, 'approve')}
                    disabled={processingRefund === req.id}
                    style={{ ...btnStyle, fontSize: 12, padding: '4px 10px' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRefund(req.id, 'deny')}
                    disabled={processingRefund === req.id}
                    style={{ ...btnOutlineStyle, fontSize: 12, padding: '4px 10px' }}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
