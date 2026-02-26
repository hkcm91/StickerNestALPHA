/**
 * Social Graph Canvases API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getUserPublicCanvases } from './canvases';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
};

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => mockChain),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getUserPublicCanvases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire after clear
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.lt.mockReturnThis();
  });

  it('returns empty list when user has no public canvases', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

    const result = await getUserPublicCanvases('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('returns canvases when user has public canvases', async () => {
    const row = {
      id: 'canvas-1',
      name: 'My Canvas',
      slug: 'my-canvas',
      description: 'A test canvas',
      thumbnail_url: null,
      owner_id: 'user-1',
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
    };

    mockChain.limit.mockResolvedValueOnce({ data: [row], error: null });

    const result = await getUserPublicCanvases('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].name).toBe('My Canvas');
      expect(result.data.items[0].slug).toBe('my-canvas');
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('handles Supabase errors', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const result = await getUserPublicCanvases('user-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('DB error');
    }
  });

  it('supports pagination with hasMore', async () => {
    // Return limit+1 items to indicate hasMore
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `canvas-${i}`,
      name: `Canvas ${i}`,
      slug: null,
      description: null,
      thumbnail_url: null,
      owner_id: 'user-1',
      created_at: '2024-06-01T00:00:00Z',
      updated_at: `2024-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    mockChain.limit.mockResolvedValueOnce({ data: rows, error: null });

    const result = await getUserPublicCanvases('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(20);
      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBeDefined();
    }
  });
});
