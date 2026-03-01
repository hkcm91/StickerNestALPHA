/**
 * Pricing Page — displays the 4 platform tiers with features and CTAs.
 *
 * @module shell/pages
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import { createCheckoutSession } from '../../kernel/billing';
import { useAuthStore } from '../../kernel/stores/auth';

interface TierCard {
  name: string;
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const TIERS: TierCard[] = [
  {
    name: 'Free',
    tier: 'free',
    price: '$0',
    period: 'forever',
    features: [
      '3 canvases',
      '100 MB storage',
      '10 widgets per canvas',
      '3 collaborators per canvas',
      '1 public slug URL',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Creator',
    tier: 'creator',
    price: '$9',
    period: '/month',
    features: [
      '10 canvases',
      '1 GB storage',
      '50 widgets per canvas',
      '10 collaborators per canvas',
      '5 public slug URLs',
      'Widget Lab (IDE)',
      'Publish to Marketplace',
      'Sell widgets & canvas subscriptions',
      'External integrations',
    ],
    cta: 'Start Creating',
    highlighted: true,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$29',
    period: '/month',
    features: [
      '50 canvases',
      '5 GB storage',
      '200 widgets per canvas',
      '50 collaborators per canvas',
      'Unlimited public slug URLs',
      'Everything in Creator',
      'Canvas shop (physical items)',
      'Custom domains',
      'Canvas embeds',
      'Priority support',
      '8% platform fee (vs 12%)',
    ],
    cta: 'Go Pro',
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited everything',
      'SSO / SAML',
      'Dedicated instance',
      '5% platform fee (negotiable)',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
  },
];

export const PricingPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = useCallback(async (tier: TierCard['tier']) => {
    if (tier === 'free') return;
    if (tier === 'enterprise') {
      window.location.href = 'mailto:sales@stickernest.com?subject=Enterprise%20Plan';
      return;
    }

    setLoadingTier(tier);
    setError(null);
    try {
      const result = await createCheckoutSession(tier);
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  }, []);

  return (
    <div data-testid="page-pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: 40 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>Choose Your Plan</h1>
      <p style={{ textAlign: 'center', color: 'var(--sn-text-muted, #6b7280)', marginBottom: 40 }}>
        Start free. Upgrade when you need more.
      </p>

      {error && (
        <div style={{ textAlign: 'center', color: '#ef4444', marginBottom: 16 }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
        {TIERS.map((t) => {
          const isCurrent = user?.tier === t.tier;
          return (
            <div
              key={t.tier}
              data-testid={`tier-${t.tier}`}
              style={{
                border: t.highlighted
                  ? '2px solid var(--sn-accent, #6366f1)'
                  : '1px solid var(--sn-border, #e5e7eb)',
                borderRadius: 'var(--sn-radius, 12px)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--sn-surface, #fff)',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20 }}>{t.name}</h2>
              <div style={{ fontSize: 36, fontWeight: 700, margin: '12px 0 4px' }}>
                {t.price}
                <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--sn-text-muted, #6b7280)' }}>
                  {t.period}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0', flex: 1 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ padding: '4px 0', fontSize: 14 }}>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(t.tier)}
                disabled={isCurrent || loadingTier === t.tier}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 'var(--sn-radius, 8px)',
                  background: isCurrent
                    ? 'var(--sn-border, #d1d5db)'
                    : 'var(--sn-accent, #6366f1)',
                  color: isCurrent ? 'var(--sn-text-muted, #6b7280)' : '#fff',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {isCurrent ? 'Current Plan' : loadingTier === t.tier ? 'Loading...' : t.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
