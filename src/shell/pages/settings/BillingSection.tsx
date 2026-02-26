/**
 * Billing Section — current plan display, usage meters, manage subscription.
 * Rendered inside the Settings page.
 *
 * @module shell/pages/settings
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  getSubscription,
  getTierQuota,
  createPortalSession,
  type Subscription,
  type TierQuota,
} from '../../../kernel/billing';
import { useAuthStore } from '../../../kernel/stores/auth';

function UsageBar({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 10 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && pct >= 80;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span>
        <span>{current} / {isUnlimited ? '∞' : limit}</span>
      </div>
      <div
        style={{
          width: '100%',
          height: 6,
          background: 'var(--sn-border, #e5e7eb)',
          borderRadius: 3,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: isNearLimit ? '#ef4444' : 'var(--sn-accent, #6366f1)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

export const BillingSection: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [quota, setQuota] = useState<TierQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sub, q] = await Promise.all([
        getSubscription(),
        getTierQuota(user?.tier ?? 'free'),
      ]);
      setSubscription(sub);
      setQuota(q);
      setLoading(false);
    }
    load();
  }, [user?.tier]);

  const handleManage = useCallback(async () => {
    setPortalLoading(true);
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch {
      // User has no subscription — redirect to pricing
      window.location.href = '/pricing';
    } finally {
      setPortalLoading(false);
    }
  }, []);

  if (loading) {
    return <div data-testid="billing-loading">Loading billing info...</div>;
  }

  const tier = user?.tier ?? 'free';
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <div data-testid="billing-section" style={{ maxWidth: 480 }}>
      <h2 style={{ marginBottom: 16 }}>Billing</h2>

      <div
        style={{
          border: '1px solid var(--sn-border, #e5e7eb)',
          borderRadius: 'var(--sn-radius, 12px)',
          padding: 20,
          marginBottom: 20,
          background: 'var(--sn-surface, #fff)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{tierLabel} Plan</div>
            <div style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)' }}>
              {subscription
                ? `Status: ${subscription.status}`
                : 'Free tier — no payment on file'}
            </div>
          </div>
          {subscription?.currentPeriodEnd && (
            <div style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)', textAlign: 'right' }}>
              {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}:{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {tier !== 'free' && (
            <button
              onClick={handleManage}
              disabled={portalLoading}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--sn-border, #e5e7eb)',
                borderRadius: 'var(--sn-radius, 8px)',
                background: 'var(--sn-surface, #fff)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {portalLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}
          <a
            href="/pricing"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 'var(--sn-radius, 8px)',
              background: 'var(--sn-accent, #6366f1)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {tier === 'free' ? 'Upgrade' : 'Change Plan'}
          </a>
        </div>
      </div>

      {quota && (
        <div
          style={{
            border: '1px solid var(--sn-border, #e5e7eb)',
            borderRadius: 'var(--sn-radius, 12px)',
            padding: 20,
            background: 'var(--sn-surface, #fff)',
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Usage</h3>
          <UsageBar label="Canvases" current={0} limit={quota.maxCanvases} />
          <UsageBar label="Storage (MB)" current={0} limit={quota.maxStorageMb} />
        </div>
      )}
    </div>
  );
};
