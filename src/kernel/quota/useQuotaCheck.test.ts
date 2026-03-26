/**
 * useQuotaCheck Hook Tests
 *
 * @module kernel/quota
 * @layer L0
 *
 * @vitest-environment happy-dom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the auth store
vi.mock('../stores/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ user: { id: 'user-1' } })),
  },
}));

// Mock quota functions
vi.mock('./quota', () => ({
  checkQuota: vi.fn(),
  checkFeature: vi.fn(),
}));

import { useAuthStore } from '../stores/auth';

import { checkQuota, checkFeature } from './quota';
import { useQuotaCheck } from './useQuotaCheck';

const mockCheckQuota = vi.mocked(checkQuota);
const mockCheckFeature = vi.mocked(checkFeature);
const mockGetState = vi.mocked(useAuthStore.getState);

describe('useQuotaCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({ user: { id: 'user-1' } } as never);
  });

  describe('gateResource', () => {
    it('returns allowed result when quota check passes', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        current: 1,
        limit: 3,
        tier: 'free',
        upgradeTier: null,
      });

      const { result } = renderHook(() => useQuotaCheck());

      let gateResult: Awaited<ReturnType<typeof result.current.gateResource>>;
      await act(async () => {
        gateResult = await result.current.gateResource('canvas_count');
      });

      expect(gateResult!.allowed).toBe(true);
      expect(gateResult!.current).toBe(1);
      expect(gateResult!.limit).toBe(3);
      expect(gateResult!.resource).toBe('canvases');
      expect(result.current.blocked).toBeNull();
    });

    it('sets blocked state when quota check denies', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: false,
        current: 3,
        limit: 3,
        tier: 'free',
        upgradeTier: 'creator',
      });

      const { result } = renderHook(() => useQuotaCheck());

      await act(async () => {
        await result.current.gateResource('canvas_count');
      });

      expect(result.current.blocked).not.toBeNull();
      expect(result.current.blocked!.allowed).toBe(false);
      expect(result.current.blocked!.upgradeTier).toBe('creator');
    });

    it('returns blocked result when user is not authenticated', async () => {
      mockGetState.mockReturnValue({ user: null } as never);

      const { result } = renderHook(() => useQuotaCheck());

      let gateResult: Awaited<ReturnType<typeof result.current.gateResource>>;
      await act(async () => {
        gateResult = await result.current.gateResource('canvas_count');
      });

      expect(gateResult!.allowed).toBe(false);
      expect(gateResult!.tier).toBe('free');
      expect(gateResult!.upgradeTier).toBe('creator');
      expect(result.current.blocked).not.toBeNull();
    });

    it('passes canvasId to checkQuota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 10,
        tier: 'free',
        upgradeTier: null,
      });

      const { result } = renderHook(() => useQuotaCheck());

      await act(async () => {
        await result.current.gateResource('widgets_per_canvas', 'canvas-123');
      });

      expect(mockCheckQuota).toHaveBeenCalledWith('user-1', 'widgets_per_canvas', 'canvas-123');
    });

    it('uses resource label for known resources', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        current: 50,
        limit: 100,
        tier: 'free',
        upgradeTier: null,
      });

      const { result } = renderHook(() => useQuotaCheck());

      let gateResult: Awaited<ReturnType<typeof result.current.gateResource>>;
      await act(async () => {
        gateResult = await result.current.gateResource('storage_mb');
      });

      expect(gateResult!.resource).toBe('storage (MB)');
    });
  });

  describe('gateFeature', () => {
    it('returns allowed when feature is available', async () => {
      mockCheckFeature.mockResolvedValue({
        allowed: true,
        tier: 'creator',
        upgradeTier: null,
      });

      const { result } = renderHook(() => useQuotaCheck());

      let gateResult: Awaited<ReturnType<typeof result.current.gateFeature>>;
      await act(async () => {
        gateResult = await result.current.gateFeature('canPublishWidgets');
      });

      expect(gateResult!.allowed).toBe(true);
      expect(gateResult!.resource).toBe('widget publishing');
      expect(result.current.blocked).toBeNull();
    });

    it('sets blocked when feature is not available', async () => {
      mockCheckFeature.mockResolvedValue({
        allowed: false,
        tier: 'free',
        upgradeTier: 'pro',
      });

      const { result } = renderHook(() => useQuotaCheck());

      await act(async () => {
        await result.current.gateFeature('canUseCustomDomain');
      });

      expect(result.current.blocked).not.toBeNull();
      expect(result.current.blocked!.resource).toBe('custom domains');
    });

    it('returns blocked when user is not authenticated', async () => {
      mockGetState.mockReturnValue({ user: null } as never);

      const { result } = renderHook(() => useQuotaCheck());

      let gateResult: Awaited<ReturnType<typeof result.current.gateFeature>>;
      await act(async () => {
        gateResult = await result.current.gateFeature('canUseIntegrations');
      });

      expect(gateResult!.allowed).toBe(false);
      expect(gateResult!.resource).toBe('integrations');
    });
  });

  describe('clearBlocked', () => {
    it('clears the blocked state', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: false,
        current: 3,
        limit: 3,
        tier: 'free',
        upgradeTier: 'creator',
      });

      const { result } = renderHook(() => useQuotaCheck());

      await act(async () => {
        await result.current.gateResource('canvas_count');
      });

      expect(result.current.blocked).not.toBeNull();

      act(() => {
        result.current.clearBlocked();
      });

      expect(result.current.blocked).toBeNull();
    });
  });

  describe('checking state', () => {
    it('sets checking to true during a quota check', async () => {
      let resolvePromise: (v: unknown) => void;
      mockCheckQuota.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

      const { result } = renderHook(() => useQuotaCheck());

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.gateResource('canvas_count');
      });

      // checking should be true while the promise is pending
      expect(result.current.checking).toBe(true);

      await act(async () => {
        resolvePromise!({
          allowed: true,
          current: 0,
          limit: 3,
          tier: 'free',
          upgradeTier: null,
        });
        await promise;
      });

      expect(result.current.checking).toBe(false);
    });
  });
});
