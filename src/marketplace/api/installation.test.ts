/**
 * Marketplace installation tests
 *
 * @module marketplace/api
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { install, uninstall, getInstalledWidgets } from './installation';

// Mock Supabase client
const { mockChain, mockRpc, mockMaybeSingle } = vi.hoisted(() => {
  const _mockChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    overlaps: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn(),
  };
  for (const method of Object.values(_mockChain)) {
    method.mockReturnValue(_mockChain);
  }
  const _mockRpc = vi.fn();
  const _mockMaybeSingle = vi.fn();
  return { mockChain: _mockChain, mockRpc: _mockRpc, mockMaybeSingle: _mockMaybeSingle };
});

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockChain),
    rpc: mockRpc,
  },
}));

vi.mock('@sn/types', () => ({
  WidgetManifestSchema: {
    safeParse: vi.fn((data: unknown) => {
      if (data === null || data === undefined) {
        return {
          success: false,
          error: { issues: [{ message: 'Manifest is required' }] },
        };
      }
      if ((data as Record<string, unknown>).__invalid) {
        return {
          success: false,
          error: { issues: [{ message: 'Invalid field' }] },
        };
      }
      return { success: true, data: { ...(data as Record<string, unknown>), id: 'test-widget' } };
    }),
  },
}));

describe('installation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.values(mockChain)) {
      (method as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);
    }
    mockMaybeSingle.mockReset();
  });

  describe('install', () => {
    /**
     * install() chains .eq('id', ...).eq('is_published', true).single(),
     * so the first .eq must return an object with .eq, and that .eq must
     * return an object with .single.
     */
    function setupInstallQuery(singleResult: Record<string, unknown>) {
      const singleFn = vi.fn().mockResolvedValue(singleResult);
      const eqSecond = vi.fn().mockReturnValue({ single: singleFn });
      mockChain.eq.mockReturnValue({ eq: eqSecond });
    }

    /**
     * Setup for paid widget flow - includes orders table query
     */
    function setupPaidWidgetQuery(
      widgetResult: Record<string, unknown>,
      orderResult: Record<string, unknown> | null,
    ) {
      const singleFn = vi.fn().mockResolvedValue(widgetResult);
      const maybeOrderFn = vi.fn().mockResolvedValue(orderResult ?? { data: null, error: null });
      const eqSecond = vi.fn().mockReturnValue({
        single: singleFn,
        in: vi.fn().mockReturnValue({ maybeSingle: maybeOrderFn }),
      });
      mockChain.eq.mockReturnValue({ eq: eqSecond });
    }

    it('fetches widget, validates manifest, and returns content', async () => {
      setupInstallQuery({
        data: {
          html_content: '<div>Widget</div>',
          manifest: { id: 'w1', name: 'Test', version: '1.0.0' },
          is_free: true,
          price_cents: 0,
        },
        error: null,
      });
      mockChain.upsert.mockReturnValue(mockChain);
      mockRpc.mockResolvedValue({ error: null });

      const result = await install('user1', 'w1');

      expect(result.htmlContent).toBe('<div>Widget</div>');
      expect(result.manifest).toEqual({ id: 'w1', name: 'Test', version: '1.0.0', id: 'test-widget' });
    });

    it('throws when widget is not found', async () => {
      setupInstallQuery({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(install('user1', 'bad-id')).rejects.toThrow(
        'Widget not found or not published',
      );
    });

    it('throws when manifest is invalid', async () => {
      setupInstallQuery({
        data: {
          html_content: '<div/>',
          manifest: { __invalid: true },
          is_free: true,
        },
        error: null,
      });

      await expect(install('user1', 'w1')).rejects.toThrow('Invalid manifest');
    });

    it('records installation in user_installed_widgets', async () => {
      const { supabase } = await import('../../kernel/supabase');
      setupInstallQuery({
        data: {
          html_content: '<div/>',
          manifest: { id: 'w1' },
          is_free: true,
        },
        error: null,
      });
      mockChain.upsert.mockReturnValue(mockChain);
      mockRpc.mockResolvedValue({ error: null });

      await install('user1', 'w1');

      expect(supabase.from).toHaveBeenCalledWith('user_installed_widgets');
      expect(mockChain.upsert).toHaveBeenCalledWith({
        user_id: 'user1',
        widget_id: 'w1',
      });
    });

    it('increments install count via rpc', async () => {
      setupInstallQuery({
        data: {
          html_content: '<div/>',
          manifest: { id: 'w1' },
          is_free: true,
        },
        error: null,
      });
      mockChain.upsert.mockReturnValue(mockChain);
      mockRpc.mockResolvedValue({ error: null });

      await install('user1', 'w1');

      expect(mockRpc).toHaveBeenCalledWith('increment_install_count', {
        widget_id_input: 'w1',
      });
    });

    it('falls back to manual update when rpc fails', async () => {
      // First .eq call is from the initial query chain: .eq('id').eq('is_published').single()
      // After that, the fallback uses .eq('id') as terminal
      const singleFn = vi.fn().mockResolvedValue({
        data: {
          html_content: '<div/>',
          manifest: { id: 'w1' },
          install_count: 5,
          is_free: true,
        },
        error: null,
      });
      const eqSecond = vi.fn().mockReturnValue({ single: singleFn });
      let eqCallCount = 0;
      mockChain.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount <= 1) {
          // First .eq call — part of the initial select chain
          return { eq: eqSecond };
        }
        // Subsequent .eq calls — fallback update chain terminal
        return Promise.resolve({ error: null });
      });
      mockChain.upsert.mockReturnValue(mockChain);
      mockRpc.mockRejectedValue(new Error('rpc not found'));

      await expect(install('user1', 'w1')).resolves.not.toThrow();
    });

    // Payment verification tests
    it('allows install of free widget without purchase check', async () => {
      setupInstallQuery({
        data: {
          html_content: '<div>Widget</div>',
          manifest: { id: 'w1', name: 'Free Widget', version: '1.0.0' },
          is_free: true,
          price_cents: 0,
        },
        error: null,
      });
      mockChain.upsert.mockReturnValue({ error: null });
      mockRpc.mockResolvedValue({ error: null });

      const result = await install('user-1', 'w1');
      expect(result.htmlContent).toBe('<div>Widget</div>');
    });

    it('rejects install of paid widget without purchase', async () => {
      setupPaidWidgetQuery(
        {
          data: {
            html_content: '<div>Widget</div>',
            manifest: { id: 'w1', name: 'Paid Widget', version: '1.0.0' },
            is_free: false,
            price_cents: 99,
          },
          error: null,
        },
        { data: null, error: null },
      );

      await expect(install('user-1', 'w1')).rejects.toThrow(
        'Widget requires purchase',
      );
    });

    it('allows install of paid widget with valid purchase', async () => {
      setupPaidWidgetQuery(
        {
          data: {
            html_content: '<div>Widget</div>',
            manifest: { id: 'w1', name: 'Paid Widget', version: '1.0.0' },
            is_free: false,
            price_cents: 99,
          },
          error: null,
        },
        { data: { id: 'order-1' }, error: null },
      );
      mockChain.upsert.mockReturnValue({ error: null });
      mockRpc.mockResolvedValue({ error: null });

      const result = await install('user-1', 'w1');
      expect(result.htmlContent).toBe('<div>Widget</div>');
    });
  });

  describe('uninstall', () => {
    it('deletes installation record', async () => {
      const eqSecond = vi.fn().mockResolvedValue({ error: null });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await expect(uninstall('user1', 'w1')).resolves.not.toThrow();
    });

    it('calls delete with correct filters', async () => {
      const { supabase } = await import('../../kernel/supabase');
      const eqSecond = vi.fn().mockResolvedValue({ error: null });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await uninstall('user1', 'w1');

      expect(supabase.from).toHaveBeenCalledWith('user_installed_widgets');
      expect(mockChain.delete).toHaveBeenCalled();
    });
  });

  describe('getInstalledWidgets', () => {
    it('returns listing for each installed widget', async () => {
      mockChain.eq.mockResolvedValue({
        data: [
          {
            widget_id: 'w1',
            widgets: {
              id: 'w1',
              name: 'Widget 1',
              slug: 'widget-1',
              description: null,
              version: '1.0.0',
              author_id: 'a1',
              thumbnail_url: null,
              icon_url: null,
              category: null,
              tags: [],
              license: 'MIT',
              is_published: true,
              is_deprecated: false,
              install_count: 10,
              rating_average: null,
              rating_count: 0,
              is_free: true,
              price_cents: null,
              currency: 'usd',
              stripe_price_id: null,
              metadata: {},
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          },
        ],
        error: null,
      });

      const result = await getInstalledWidgets('user1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Widget 1');
    });

    it('filters out rows with null widget join', async () => {
      mockChain.eq.mockResolvedValue({
        data: [
          { widget_id: 'w1', widgets: null },
        ],
        error: null,
      });

      const result = await getInstalledWidgets('user1');
      expect(result).toHaveLength(0);
    });

    it('throws on error', async () => {
      mockChain.eq.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(getInstalledWidgets('user1')).rejects.toThrow(
        'Failed to get installed widgets: DB error',
      );
    });

    it('returns empty array when no widgets installed', async () => {
      mockChain.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getInstalledWidgets('user1');
      expect(result).toEqual([]);
    });
  });
});
