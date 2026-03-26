/**
 * InstallButton — stateful button handling Install / Buy / Uninstall flows.
 *
 * For free widgets: Install → Installing... → Installed
 * For paid widgets: Buy $X.XX → redirects to Stripe Checkout
 * For installed: Uninstall (2-step confirmation)
 * For built-in: shows "Built-in" label
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import { supabase } from '../../../../kernel/supabase';
import { btnDanger, btnPrimary, btnSecondary, labelBuiltIn } from '../styles';

export type InstallState = 'idle' | 'installing' | 'installed' | 'error';
export type UninstallState = 'idle' | 'uninstalling' | 'uninstalled' | 'error';

export interface InstallButtonProps {
  widgetId: string;
  isInstalled: boolean;
  isBuiltIn: boolean;
  isFree: boolean;
  priceCents?: number | null;
  currency?: string;
  stripePriceId?: string | null;
  installState?: InstallState;
  uninstallState?: UninstallState;
  onInstall: (widgetId: string) => Promise<void>;
  onUninstall: (widgetId: string) => Promise<void>;
  /** Compact mode for card views (smaller button). */
  compact?: boolean;
}

export const InstallButton: React.FC<InstallButtonProps> = ({
  widgetId,
  isInstalled,
  isBuiltIn,
  isFree,
  priceCents,
  currency = 'usd',
  stripePriceId,
  installState = 'idle',
  uninstallState = 'idle',
  onInstall,
  onUninstall,
  compact = false,
}) => {
  const [confirming, setConfirming] = useState(false);

  const handleBuy = useCallback(async () => {
    if (!stripePriceId) {
      // Fallback: treat as free install if no Stripe price configured
      await onInstall(widgetId);
      return;
    }
    try {
      const resp = await supabase.functions.invoke('creator-checkout', {
        body: { action: 'buy_widget', widgetId },
      });
      const data = resp.data as Record<string, unknown> | null;
      if (data?.url && typeof data.url === 'string') {
        window.location.href = data.url;
      } else if (data?.free) {
        // Free tier checkout — install directly
        await onInstall(widgetId);
      }
    } catch {
      // Purchase initiation failed — let parent handle via installState
      await onInstall(widgetId);
    }
  }, [widgetId, stripePriceId, onInstall]);

  const priceLabel = ((priceCents ?? 0) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency,
  });

  const compactPadding = compact ? { padding: '4px 12px', fontSize: '12px' } : {};

  // Built-in widgets
  if (isBuiltIn) {
    return <span data-testid="install-btn-builtin" style={labelBuiltIn}>Built-in</span>;
  }

  // Uninstalled state after action
  if (uninstallState === 'uninstalled') {
    return (
      <button
        type="button"
        data-testid="install-btn"
        onClick={() => onInstall(widgetId)}
        disabled={installState === 'installing'}
        style={{ ...btnPrimary, ...compactPadding, opacity: installState === 'installing' ? 0.6 : 1 }}
      >
        {installState === 'installing' ? 'Installing...' : 'Install'}
      </button>
    );
  }

  // Installed — show uninstall flow
  if (isInstalled) {
    if (confirming) {
      return (
        <div data-testid="uninstall-confirm">
          <div style={{ fontSize: '13px', marginBottom: '8px', color: '#ef4444' }}>
            This will remove the widget and delete all saved state. Are you sure?
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setConfirming(false)} style={btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onUninstall(widgetId); setConfirming(false); }}
              disabled={uninstallState === 'uninstalling'}
              style={{ ...btnDanger, opacity: uninstallState === 'uninstalling' ? 0.6 : 1 }}
            >
              {uninstallState === 'uninstalling' ? 'Uninstalling...' : 'Yes, Uninstall'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        data-testid="uninstall-btn"
        onClick={() => setConfirming(true)}
        style={{ ...btnDanger, ...compactPadding }}
      >
        Uninstall
      </button>
    );
  }

  // Not installed — Install or Buy
  if (!isFree) {
    return (
      <button
        type="button"
        data-testid="buy-btn"
        onClick={handleBuy}
        disabled={installState === 'installing'}
        style={{ ...btnPrimary, ...compactPadding, opacity: installState === 'installing' ? 0.6 : 1 }}
      >
        {installState === 'installing' ? 'Processing...' : `Buy ${priceLabel}`}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="install-btn"
      onClick={() => onInstall(widgetId)}
      disabled={installState === 'installing'}
      style={{ ...btnPrimary, ...compactPadding, opacity: installState === 'installing' ? 0.6 : 1 }}
    >
      {installState === 'installing' ? 'Installing...' : 'Install'}
    </button>
  );
};
