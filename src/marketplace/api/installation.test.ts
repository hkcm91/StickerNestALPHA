/**
 * Installation payment verification tests
 *
 * @module marketplace/api
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...a: unknown[]) => {
          mockSelect(...a);
          return {
            eq: (...b: unknown[]) => {
              mockEq(...b);
              return {
                eq: (...c: unknown[]) => {
                  mockEq(...c);
                  return {
                    single: () => mockSingle(),
                    in: (...d: unknown[]) => {
                      mockIn(...d);
                      return { maybeSingle: () => mockMaybeSingle() };
                    },
                  };
                },
                single: () => mockSingle(),
              };
            },
          };
        },
        upsert: (...a: unknown[]) => {
          mockUpsert(...a);
          return { error: null };
        },
      };
    },
    rpc: (...args: unknown[]) => {
      mockRpc(...args);
      return { catch: (fn: (e: Error) => unknown) => fn(new Error('no rpc')) };
    },
  },
}));

vi.mock('@sn/types', () => ({
  WidgetManifestSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data: { ...(data as Record<string, unknown>), id: 'test-widget' },
    })),
  },
}));

import { install } from './installation';

describe('installation payment verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows install of free widget without purchase check', async () => {
    // Widget query returns free widget
    mockSingle.mockResolvedValueOnce({
      data: {
        html_content: '<div>Widget</div>',
        manifest: { id: 'w1', name: 'Free Widget', version: '1.0.0' },
        is_free: true,
        price_cents: 0,
      },
      error: null,
    });
    // Upsert into user_installed_widgets
    mockUpsert.mockReturnValue({ error: null });

    const result = await install('user-1', 'w1');
    expect(result.htmlContent).toBe('<div>Widget</div>');
    // Should NOT query orders table for free widget
    expect(mockFrom).not.toHaveBeenCalledWith('orders');
  });

  it('rejects install of paid widget without purchase', async () => {
    // Widget query returns paid widget
    mockSingle.mockResolvedValueOnce({
      data: {
        html_content: '<div>Widget</div>',
        manifest: { id: 'w1', name: 'Paid Widget', version: '1.0.0' },
        is_free: false,
        price_cents: 99,
      },
      error: null,
    });
    // Orders query returns no purchase
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(install('user-1', 'w1')).rejects.toThrow(
      'Widget requires purchase',
    );
  });

  it('allows install of paid widget with valid purchase', async () => {
    // Widget query returns paid widget
    mockSingle.mockResolvedValueOnce({
      data: {
        html_content: '<div>Widget</div>',
        manifest: { id: 'w1', name: 'Paid Widget', version: '1.0.0' },
        is_free: false,
        price_cents: 99,
      },
      error: null,
    });
    // Orders query returns fulfilled purchase
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'order-1' },
      error: null,
    });
    // Upsert into user_installed_widgets
    mockUpsert.mockReturnValue({ error: null });

    const result = await install('user-1', 'w1');
    expect(result.htmlContent).toBe('<div>Widget</div>');
  });
});
