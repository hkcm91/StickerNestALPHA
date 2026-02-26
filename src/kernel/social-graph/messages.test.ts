/**
 * Messages API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { sendMessage, canMessage } from './messages';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('./blocks', () => ({
  isBlockedEitherWay: vi.fn(),
}));

import { isBlockedEitherWay } from './blocks';

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect.mockReturnThis(),
      single: mockSingle,
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Messages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  describe('sendMessage', () => {
    it('rejects messaging yourself', async () => {
      const result = await sendMessage('user-1', 'Hello', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SELF_ACTION');
      }
    });

    it('rejects empty content', async () => {
      const result = await sendMessage('user-2', '', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects content over 2000 characters', async () => {
      const result = await sendMessage('user-2', 'a'.repeat(2001), 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects when blocked', async () => {
      (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const result = await sendMessage('user-2', 'Hello', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BLOCKED');
      }
    });

    it('sends message successfully when not blocked', async () => {
      const msgRow = {
        id: 'msg-1',
        sender_id: 'user-1',
        recipient_id: 'user-2',
        content: 'Hello',
        is_read: false,
        created_at: '2024-06-01T00:00:00Z',
      };

      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: msgRow, error: null }),
        }),
      });

      const result = await sendMessage('user-2', 'Hello', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.senderId).toBe('user-1');
        expect(result.data.recipientId).toBe('user-2');
        expect(result.data.content).toBe('Hello');
      }
    });
  });

  describe('canMessage', () => {
    it('returns false for self-messaging', async () => {
      const result = await canMessage('user-1', 'user-1');
      expect(result).toBe(false);
    });

    it('returns true when not blocked', async () => {
      const result = await canMessage('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns false when blocked', async () => {
      (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const result = await canMessage('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });
});
