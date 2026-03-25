/**
 * Quota Enforcement Tests
 *
 * @module kernel/quota
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
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../supabase/client';

import { checkQuota, checkFeature } from './quota';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockRpc = (supabase as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc;

// Simpler approach: mock `from` per table name
function setupMocks(opts: {
  userTier?: string;
  tierQuota?: Record<string, unknown> | null;
  canvasCount?: number;
  widgetCount?: number;
  collabCount?: number;
}) {
  const {
    userTier = 'free',
    canvasCount = 0,
    widgetCount = 0,
    collabCount = 0,
  } = opts;

  // Free tier quota defaults
  const defaultFreeQuota = {
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
  const creatorQuota = {
    tier: 'creator',
    max_canvases: 10,
    max_storage_mb: 1000,
    max_widgets_per_canvas: 50,
    max_collaborators_per_canvas: 10,
    can_use_custom_domain: false,
    can_use_integrations: true,
    can_publish_widgets: true,
    can_sell: true,
  };
  const proQuota = {
    tier: 'pro',
    max_canvases: 50,
    max_storage_mb: 5000,
    max_widgets_per_canvas: 200,
    max_collaborators_per_canvas: 50,
    can_use_custom_domain: true,
    can_use_integrations: true,
    can_publish_widgets: true,
    can_sell: true,
  };
  const enterpriseQuota = {
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

  const quotaByTier: Record<string, Record<string, unknown>> = {
    free: defaultFreeQuota,
    creator: creatorQuota,
    pro: proQuota,
    enterprise: enterpriseQuota,
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tier: userTier },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'tier_quotas') {
      // Return the correct quota based on the tier being queried
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col: string, tierValue: string) => ({
            single: vi.fn().mockResolvedValue({
              data: opts.tierQuota !== undefined && tierValue === userTier
                ? opts.tierQuota
                : quotaByTier[tierValue] ?? null,
              error: opts.tierQuota === null && tierValue === userTier
                ? { message: 'Not found' }
                : null,
            }),
          })),
        }),
      };
    }
    if (table === 'canvases') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: canvasCount,
            error: null,
          }),
        }),
      };
    }
    if (table === 'entities') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: widgetCount,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'canvas_members') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: collabCount,
            error: null,
          }),
        }),
      };
    }
    return { select: vi.fn() };
  });
}

describe('Quota Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkQuota', () => {
    it('allows canvas creation when under limit', async () => {
      setupMocks({ userTier: 'free', canvasCount: 1 });

      const result = await checkQuota('user-1', 'canvas_count');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.tier).toBe('free');
    });

    it('denies canvas creation when at limit', async () => {
      setupMocks({ userTier: 'free', canvasCount: 3 });

      const result = await checkQuota('user-1', 'canvas_count');
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(3);
    });

    it('suggests upgrade tier when limit is reached', async () => {
      setupMocks({ userTier: 'free', canvasCount: 3 });

      const result = await checkQuota('user-1', 'canvas_count');
      expect(result.allowed).toBe(false);
      expect(result.upgradeTier).toBe('creator');
    });

    it('allows unlimited resources for enterprise tier', async () => {
      setupMocks({ userTier: 'enterprise', canvasCount: 999 });

      const result = await checkQuota('user-1', 'canvas_count');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('checks widgets per canvas correctly', async () => {
      setupMocks({ userTier: 'free', widgetCount: 5 });

      const result = await checkQuota('user-1', 'widgets_per_canvas', 'canvas-1');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(10);
    });

    it('denies widgets when canvas widget limit is reached', async () => {
      setupMocks({ userTier: 'free', widgetCount: 10 });

      const result = await checkQuota('user-1', 'widgets_per_canvas', 'canvas-1');
      expect(result.allowed).toBe(false);
    });

    it('checks collaborators per canvas', async () => {
      setupMocks({ userTier: 'free', collabCount: 2 });

      const result = await checkQuota('user-1', 'collaborators_per_canvas', 'canvas-1');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(3);
    });

    it('returns 0 for per-canvas resources when no canvasId provided', async () => {
      setupMocks({ userTier: 'free' });

      const result = await checkQuota('user-1', 'widgets_per_canvas');
      expect(result.current).toBe(0);
    });

    it('handles missing tier quota gracefully', async () => {
      setupMocks({ userTier: 'free', tierQuota: null });

      const result = await checkQuota('user-1', 'canvas_count');
      expect(result.allowed).toBe(false);
      expect(result.upgradeTier).toBe('creator');
    });

    it('queries storage via get_user_storage_bytes RPC', async () => {
      setupMocks({ userTier: 'free' });
      // 50 MB in bytes
      mockRpc.mockResolvedValue({ data: 52428800, error: null });

      const result = await checkQuota('user-1', 'storage_mb');
      expect(result.current).toBe(50);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(mockRpc).toHaveBeenCalledWith('get_user_storage_bytes', { target_user_id: 'user-1' });
    });

    it('returns 0 storage when RPC returns null', async () => {
      setupMocks({ userTier: 'free' });
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not found' } });

      const result = await checkQuota('user-1', 'storage_mb');
      expect(result.current).toBe(0);
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkFeature', () => {
    it('denies custom domain for free tier', async () => {
      setupMocks({ userTier: 'free' });

      const result = await checkFeature('user-1', 'canUseCustomDomain');
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
    });

    it('suggests pro tier for custom domain upgrade', async () => {
      setupMocks({ userTier: 'free' });

      const result = await checkFeature('user-1', 'canUseCustomDomain');
      expect(result.allowed).toBe(false);
      expect(result.upgradeTier).toBe('pro');
    });

    it('allows integrations for creator tier', async () => {
      setupMocks({ userTier: 'creator' });

      const result = await checkFeature('user-1', 'canUseIntegrations');
      expect(result.allowed).toBe(true);
    });

    it('allows publishing for creator tier', async () => {
      setupMocks({ userTier: 'creator' });

      const result = await checkFeature('user-1', 'canPublishWidgets');
      expect(result.allowed).toBe(true);
    });

    it('denies publishing for free tier with creator as upgrade', async () => {
      setupMocks({ userTier: 'free' });

      const result = await checkFeature('user-1', 'canPublishWidgets');
      expect(result.allowed).toBe(false);
      expect(result.upgradeTier).toBe('creator');
    });

    it('allows selling for creator tier', async () => {
      setupMocks({ userTier: 'creator' });

      const result = await checkFeature('user-1', 'canSell');
      expect(result.allowed).toBe(true);
    });

    it('denies selling for free tier', async () => {
      setupMocks({ userTier: 'free' });

      const result = await checkFeature('user-1', 'canSell');
      expect(result.allowed).toBe(false);
      expect(result.upgradeTier).toBe('creator');
    });

    it('handles missing tier quota gracefully', async () => {
      setupMocks({ userTier: 'free', tierQuota: null });

      const result = await checkFeature('user-1', 'canSell');
      expect(result.allowed).toBe(false);
      expect(result.upgradeTier).toBe('creator');
    });
  });
});
