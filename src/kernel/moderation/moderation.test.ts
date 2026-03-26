/**
 * Content Moderation — unit tests
 * @module kernel/moderation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../supabase';

import { submitReport, reviewReport } from './moderation';

function mockChain(data: unknown, error: unknown = null) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  // For queries that return arrays (no .single())
  (chain.order as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const resolved = { data: Array.isArray(data) ? data : [data], error };
    return { ...chain, then: (fn: (v: unknown) => unknown) => Promise.resolve(fn(resolved)) };
  });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

const mockRow = {
  id: 'rpt-1',
  reporter_id: 'u-1',
  content_type: 'widget',
  content_id: 'w-1',
  reason: 'spam',
  details: 'Spammy widget',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-03-26T00:00:00Z',
};

describe('moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitReport', () => {
    it('should submit a report and return mapped result', async () => {
      mockChain(mockRow);
      const result = await submitReport({
        reporterId: 'u-1',
        contentType: 'widget',
        contentId: 'w-1',
        reason: 'spam',
        details: 'Spammy widget',
      });
      expect(result.id).toBe('rpt-1');
      expect(result.reason).toBe('spam');
      expect(result.status).toBe('pending');
    });

    it('should throw on error', async () => {
      mockChain(null, { message: 'DB error' });
      await expect(submitReport({
        reporterId: 'u-1',
        contentType: 'widget',
        contentId: 'w-1',
        reason: 'spam',
      })).rejects.toThrow('DB error');
    });
  });

  describe('reviewReport', () => {
    it('should update report status', async () => {
      const reviewed = { ...mockRow, status: 'action_taken', reviewed_by: 'admin-1' };
      mockChain(reviewed);
      const result = await reviewReport('rpt-1', 'action_taken', 'admin-1');
      expect(result.status).toBe('action_taken');
    });
  });
});
