/**
 * useQuotaCheck — React hook for enforcing tier quota checks before actions.
 *
 * Returns a `gate` function that checks the quota and either allows the
 * action to proceed or shows the UpgradePrompt via a callback.
 *
 * @module kernel/quota
 * @layer L0
 */

import { useCallback, useState } from 'react';

import { useAuthStore } from '../stores/auth';

import { checkQuota, checkFeature, type QuotaResource, type QuotaCheckResult } from './quota';

export interface QuotaGateResult {
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
  upgradeTier: string | null;
  resource: string;
}

export interface UseQuotaCheckReturn {
  /** Check a resource quota. Returns the result and sets `blocked` state if denied. */
  gateResource: (resource: QuotaResource, canvasId?: string) => Promise<QuotaGateResult>;
  /** Check a boolean feature flag. Returns the result and sets `blocked` state if denied. */
  gateFeature: (feature: 'canUseCustomDomain' | 'canUseIntegrations' | 'canPublishWidgets' | 'canSell') => Promise<QuotaGateResult>;
  /** The most recent blocked result (null if last check was allowed). */
  blocked: QuotaGateResult | null;
  /** Clear the blocked state. */
  clearBlocked: () => void;
  /** Whether a check is currently in flight. */
  checking: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  canUseCustomDomain: 'custom domains',
  canUseIntegrations: 'integrations',
  canPublishWidgets: 'widget publishing',
  canSell: 'selling',
};

const RESOURCE_LABELS: Record<string, string> = {
  canvas_count: 'canvases',
  storage_mb: 'storage (MB)',
  widgets_per_canvas: 'widgets on this canvas',
  collaborators_per_canvas: 'collaborators on this canvas',
};

export function useQuotaCheck(): UseQuotaCheckReturn {
  const [blocked, setBlocked] = useState<QuotaGateResult | null>(null);
  const [checking, setChecking] = useState(false);

  const gateResource = useCallback(async (
    resource: QuotaResource,
    canvasId?: string,
  ): Promise<QuotaGateResult> => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      const result: QuotaGateResult = {
        allowed: false,
        current: 0,
        limit: 0,
        tier: 'free',
        upgradeTier: 'creator',
        resource: RESOURCE_LABELS[resource] ?? resource,
      };
      setBlocked(result);
      return result;
    }

    setChecking(true);
    try {
      const check: QuotaCheckResult = await checkQuota(userId, resource, canvasId);
      const result: QuotaGateResult = {
        ...check,
        resource: RESOURCE_LABELS[resource] ?? resource,
      };

      if (!check.allowed) {
        setBlocked(result);
      } else {
        setBlocked(null);
      }

      return result;
    } finally {
      setChecking(false);
    }
  }, []);

  const gateFeature = useCallback(async (
    feature: 'canUseCustomDomain' | 'canUseIntegrations' | 'canPublishWidgets' | 'canSell',
  ): Promise<QuotaGateResult> => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      const result: QuotaGateResult = {
        allowed: false,
        current: 0,
        limit: 0,
        tier: 'free',
        upgradeTier: 'creator',
        resource: FEATURE_LABELS[feature] ?? feature,
      };
      setBlocked(result);
      return result;
    }

    setChecking(true);
    try {
      const check = await checkFeature(userId, feature);
      const result: QuotaGateResult = {
        allowed: check.allowed,
        current: 0,
        limit: check.allowed ? 1 : 0,
        tier: check.tier,
        upgradeTier: check.upgradeTier,
        resource: FEATURE_LABELS[feature] ?? feature,
      };

      if (!check.allowed) {
        setBlocked(result);
      } else {
        setBlocked(null);
      }

      return result;
    } finally {
      setChecking(false);
    }
  }, []);

  const clearBlocked = useCallback(() => {
    setBlocked(null);
  }, []);

  return { gateResource, gateFeature, blocked, clearBlocked, checking };
}
