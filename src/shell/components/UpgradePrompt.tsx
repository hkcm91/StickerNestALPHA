/**
 * Upgrade Prompt — reusable modal shown when a user hits a tier limit.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import { createCheckoutSession } from '../../kernel/billing';

interface UpgradePromptProps {
  /** What resource was the user trying to use? */
  resource: string;
  /** Current usage count */
  current: number;
  /** Tier limit */
  limit: number;
  /** Tier name to suggest upgrading to */
  upgradeTier: 'creator' | 'pro' | 'enterprise' | null;
  /** Called when the user dismisses the prompt */
  onClose: () => void;
}

const TIER_PRICES: Record<string, string> = {
  creator: '$9/mo',
  pro: '$29/mo',
  enterprise: 'Custom',
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  resource,
  current,
  limit,
  upgradeTier,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = useCallback(async () => {
    if (!upgradeTier || upgradeTier === 'enterprise') {
      window.location.href = '/pricing';
      return;
    }
    setLoading(true);
    try {
      const result = await createCheckoutSession(upgradeTier);
      window.location.href = result.url;
    } catch {
      window.location.href = '/pricing';
    }
  }, [upgradeTier]);

  return (
    <div
      data-testid="upgrade-prompt"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 9999,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--sn-surface, #fff)',
          borderRadius: 'var(--sn-radius, 12px)',
          padding: 32,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Limit Reached</h2>
        <p style={{ color: 'var(--sn-text-muted, #7A7784)', margin: '0 0 20px', fontSize: 14 }}>
          You've used {current} of {limit} {resource}.
        </p>

        {upgradeTier && (
          <>
            <p style={{ fontSize: 14, margin: '0 0 20px' }}>
              Upgrade to <strong>{upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1)}</strong>{' '}
              ({TIER_PRICES[upgradeTier]}) to unlock more.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: 'var(--sn-radius, 8px)',
                background: 'var(--sn-accent, #6366f1)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                marginRight: 8,
              }}
            >
              {loading ? 'Loading...' : 'Upgrade'}
            </button>
          </>
        )}
        <button
          onClick={onClose}
          style={{
            padding: '10px 24px',
            border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
            borderRadius: 'var(--sn-radius, 8px)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};
