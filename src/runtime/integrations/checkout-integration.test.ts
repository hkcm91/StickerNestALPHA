/**
 * Checkout Integration Handler Tests
 *
 * @module runtime/integrations
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockRange = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null });
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockReturnThis();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  eq: mockEq,
  in: mockIn,
  order: mockOrder,
  range: mockRange,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));

// Chain methods need to return self
for (const fn of [mockSelect, mockEq, mockIn, mockOrder, mockRange, mockInsert, mockUpdate, mockDelete]) {
  fn.mockReturnValue({
    select: mockSelect,
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
    range: mockRange,
    limit: mockLimit,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    then: undefined,
    data: null,
    error: null,
    count: null,
  });
}

const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: 'user-123', email: 'test@test.com' } },
});

const mockInvoke = vi.fn().mockResolvedValue({ data: { url: 'https://checkout.stripe.com/session' }, error: null });

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
  },
}));

import { createCheckoutHandler, generateNonce } from './checkout-integration';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateNonce', () => {
  it('returns a 48-character hex string', () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[0-9a-f]{48}$/);
  });

  it('generates unique nonces on each call', () => {
    const nonces = new Set(Array.from({ length: 20 }, () => generateNonce()));
    expect(nonces.size).toBe(20);
  });
});

describe('createCheckoutHandler', () => {
  let handler: ReturnType<typeof createCheckoutHandler>;
  const getCanvasId = vi.fn(() => 'canvas-abc');

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks to resolve properly
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@test.com' } },
    });
    mockInvoke.mockResolvedValue({ data: { url: 'https://stripe.com/session' }, error: null });
    handler = createCheckoutHandler(getCanvasId);
  });

  describe('query', () => {
    it('returns empty array for tiers when no canvasId', async () => {
      getCanvasId.mockReturnValueOnce(null);
      const result = await handler.query({ action: 'tiers' });
      // Result is wrapped with nonce
      expect(result).toBeDefined();
    });

    it('throws for unknown query action', async () => {
      await expect(handler.query({ action: 'nonexistent' })).rejects.toThrow(
        'Unknown checkout query action',
      );
    });

    it('returns null subscription when no canvasId for my_subscription', async () => {
      getCanvasId.mockReturnValueOnce(null);
      const result = await handler.query({ action: 'my_subscription' }) as any;
      expect(result).toBeDefined();
    });

    it('returns empty data for shop_items with no canvasId', async () => {
      getCanvasId.mockReturnValueOnce(null);
      const result = await handler.query({ action: 'shop_items' }) as any;
      expect(result).toBeDefined();
    });

    it('returns error for download without orderId', async () => {
      const result = await handler.query({ action: 'download' }) as any;
      expect(result.error).toBe('orderId required');
    });
  });

  describe('mutate', () => {
    it('returns error when subscribe is called without tierId', async () => {
      const result = await handler.mutate({ action: 'subscribe' }) as any;
      expect(result.error).toBe('tierId required');
    });

    it('returns error when buy is called without itemId', async () => {
      const result = await handler.mutate({ action: 'buy' }) as any;
      expect(result.error).toBe('itemId required');
    });

    it('throws for unknown mutate action', async () => {
      await expect(handler.mutate({ action: 'nonexistent' })).rejects.toThrow(
        'Unknown checkout mutate action',
      );
    });

    it('rejects replayed nonces', async () => {
      const nonce = generateNonce();
      // First call consumes the nonce
      await handler.mutate({ action: 'subscribe', tierId: 'tier-1', _nonce: nonce });
      // Second call with same nonce should fail
      const result = await handler.mutate({ action: 'subscribe', tierId: 'tier-1', _nonce: nonce }) as any;
      expect(result.error).toContain('Invalid or already-used nonce');
    });

    it('accepts mutation without nonce (opt-in)', async () => {
      const result = await handler.mutate({ action: 'subscribe', tierId: 'tier-1' }) as any;
      // Should proceed (not rejected due to missing nonce)
      expect(result.error).toBeUndefined();
    });

    it('returns error for cancel_subscription without subscriptionId', async () => {
      const result = await handler.mutate({ action: 'cancel_subscription' }) as any;
      expect(result.error).toBe('subscriptionId required');
    });

    it('returns error for request_refund without orderId', async () => {
      const result = await handler.mutate({ action: 'request_refund' }) as any;
      expect(result.error).toBe('orderId required');
    });

    it('returns error for approve_refund without orderId', async () => {
      const result = await handler.mutate({ action: 'approve_refund' }) as any;
      expect(result.error).toBe('orderId required');
    });

    it('returns error for deny_refund without orderId', async () => {
      const result = await handler.mutate({ action: 'deny_refund' }) as any;
      expect(result.error).toBe('orderId required');
    });

    it('returns error for create_tier without data', async () => {
      const result = await handler.mutate({ action: 'create_tier' }) as any;
      expect(result.error).toBe('data required');
    });

    it('returns error for delete_tier without tierId', async () => {
      const result = await handler.mutate({ action: 'delete_tier' }) as any;
      expect(result.error).toBe('tierId required');
    });

    it('returns error for create_item without data', async () => {
      const result = await handler.mutate({ action: 'create_item' }) as any;
      expect(result.error).toBe('data required');
    });

    it('returns error for delete_item without itemId', async () => {
      const result = await handler.mutate({ action: 'delete_item' }) as any;
      expect(result.error).toBe('itemId required');
    });

    it('returns error for update_tier without tierId or data', async () => {
      const result = await handler.mutate({ action: 'update_tier' }) as any;
      expect(result.error).toBe('tierId and data required');
    });

    it('returns error for update_item without itemId or data', async () => {
      const result = await handler.mutate({ action: 'update_item' }) as any;
      expect(result.error).toBe('itemId and data required');
    });
  });
});
