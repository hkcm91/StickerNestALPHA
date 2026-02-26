/**
 * Quota Enforcement — checks tier limits before resource creation.
 *
 * @module kernel/quota
 * @layer L0
 */

import { getTierQuota, type TierQuota } from '../billing';
import { supabase } from '../supabase';

export type QuotaResource =
  | 'canvas_count'
  | 'storage_mb'
  | 'widgets_per_canvas'
  | 'collaborators_per_canvas';

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
  /** If not allowed, the next tier that would unlock it (null if at max tier) */
  upgradeTier: string | null;
}

const TIER_ORDER = ['free', 'creator', 'pro', 'enterprise'] as const;

/**
 * Checks whether the user can consume a given resource based on their tier quota.
 */
export async function checkQuota(
  userId: string,
  resource: QuotaResource,
  /** For per-canvas limits, the canvas ID must be provided */
  canvasId?: string,
): Promise<QuotaCheckResult> {
  // Get user tier
  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single();

  const tier = userData?.tier ?? 'free';
  const quota = await getTierQuota(tier as TierQuota['tier']);
  if (!quota) {
    return { allowed: false, current: 0, limit: 0, tier, upgradeTier: 'creator' };
  }

  const current = await getCurrentUsage(userId, resource, canvasId);
  const limit = getLimit(quota, resource);

  // -1 means unlimited
  const allowed = limit === -1 || current < limit;

  // Find the next tier that would allow this
  let upgradeTier: string | null = null;
  if (!allowed) {
    const currentTierIndex = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
    for (let i = currentTierIndex + 1; i < TIER_ORDER.length; i++) {
      const candidateQuota = await getTierQuota(TIER_ORDER[i]);
      if (candidateQuota) {
        const candidateLimit = getLimit(candidateQuota, resource);
        if (candidateLimit === -1 || current < candidateLimit) {
          upgradeTier = TIER_ORDER[i];
          break;
        }
      }
    }
  }

  return { allowed, current, limit, tier, upgradeTier };
}

/**
 * Checks boolean feature flags (custom domain, integrations, publish, sell).
 */
export async function checkFeature(
  userId: string,
  feature: 'canUseCustomDomain' | 'canUseIntegrations' | 'canPublishWidgets' | 'canSell',
): Promise<{ allowed: boolean; tier: string; upgradeTier: string | null }> {
  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single();

  const tier = userData?.tier ?? 'free';
  const quota = await getTierQuota(tier as TierQuota['tier']);
  if (!quota) {
    return { allowed: false, tier, upgradeTier: 'creator' };
  }

  const allowed = quota[feature];

  let upgradeTier: string | null = null;
  if (!allowed) {
    const currentTierIndex = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
    for (let i = currentTierIndex + 1; i < TIER_ORDER.length; i++) {
      const candidateQuota = await getTierQuota(TIER_ORDER[i]);
      if (candidateQuota?.[feature]) {
        upgradeTier = TIER_ORDER[i];
        break;
      }
    }
  }

  return { allowed, tier, upgradeTier };
}

function getLimit(quota: TierQuota, resource: QuotaResource): number {
  switch (resource) {
    case 'canvas_count':
      return quota.maxCanvases;
    case 'storage_mb':
      return quota.maxStorageMb;
    case 'widgets_per_canvas':
      return quota.maxWidgetsPerCanvas;
    case 'collaborators_per_canvas':
      return quota.maxCollaboratorsPerCanvas;
  }
}

async function getCurrentUsage(
  userId: string,
  resource: QuotaResource,
  canvasId?: string,
): Promise<number> {
  switch (resource) {
    case 'canvas_count': {
      const { count } = await supabase
        .from('canvases')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId);
      return count ?? 0;
    }
    case 'storage_mb': {
      // Storage tracking would query a storage_usage aggregate
      // For now, return 0 — will be refined when storage tracking is implemented
      return 0;
    }
    case 'widgets_per_canvas': {
      if (!canvasId) return 0;
      const { count } = await supabase
        .from('entities')
        .select('id', { count: 'exact', head: true })
        .eq('canvas_id', canvasId)
        .eq('type', 'widget_container');
      return count ?? 0;
    }
    case 'collaborators_per_canvas': {
      if (!canvasId) return 0;
      const { count } = await supabase
        .from('canvas_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('canvas_id', canvasId);
      return count ?? 0;
    }
  }
}
