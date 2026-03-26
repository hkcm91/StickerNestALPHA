/**
 * Canvas Invites — unit tests
 * @module kernel/social-graph
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
vi.mock('../supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock canvases module
vi.mock('./canvases', () => ({
  addCanvasMember: vi.fn().mockResolvedValue(undefined),
}));

// Mock bus
vi.mock('../bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn() },
}));

import { supabase } from '../supabase/client';

import { createCanvasInvite, getInviteByToken, acceptInvite, revokeInvite } from './canvas-invites';
import { addCanvasMember } from './canvases';

function mockChain(data: unknown, error: unknown = null) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe('canvas-invites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCanvasInvite', () => {
    it('should create an invite and return mapped result', async () => {
      const row = {
        id: 'inv-1',
        canvas_id: 'c-1',
        invited_by: 'u-1',
        role: 'editor',
        token: 'tok-abc',
        expires_at: '2026-04-01T00:00:00Z',
        accepted_by: null,
        accepted_at: null,
        status: 'pending',
        created_at: '2026-03-26T00:00:00Z',
      };
      mockChain(row);

      const result = await createCanvasInvite('c-1', 'editor', 'u-1');
      expect(result.canvasId).toBe('c-1');
      expect(result.role).toBe('editor');
      expect(result.status).toBe('pending');
      expect(result.token).toBe('tok-abc');
    });

    it('should throw on error', async () => {
      mockChain(null, { message: 'DB error' });
      await expect(createCanvasInvite('c-1', 'editor', 'u-1')).rejects.toThrow('DB error');
    });
  });

  describe('getInviteByToken', () => {
    it('should return null when invite not found', async () => {
      mockChain(null, { message: 'not found' });
      const result = await getInviteByToken('bad-token');
      expect(result).toBeNull();
    });

    it('should return mapped invite when found', async () => {
      const row = {
        id: 'inv-1',
        canvas_id: 'c-1',
        invited_by: 'u-1',
        role: 'viewer',
        token: 'tok-abc',
        expires_at: '2026-04-01T00:00:00Z',
        accepted_by: null,
        accepted_at: null,
        status: 'pending',
        created_at: '2026-03-26T00:00:00Z',
        canvases: { name: 'My Canvas' },
        users: { raw_user_meta_data: { display_name: 'Alice' } },
      };
      mockChain(row);

      const result = await getInviteByToken('tok-abc');
      expect(result).not.toBeNull();
      expect(result!.canvasName).toBe('My Canvas');
      expect(result!.inviterName).toBe('Alice');
      expect(result!.role).toBe('viewer');
    });
  });

  describe('acceptInvite', () => {
    it('should throw when invite not found', async () => {
      mockChain(null, { message: 'not found' });
      await expect(acceptInvite('bad-token', 'u-2')).rejects.toThrow('Invite not found');
    });

    it('should call addCanvasMember on valid accept', async () => {
      const row = {
        id: 'inv-1',
        canvas_id: 'c-1',
        invited_by: 'u-1',
        role: 'editor',
        token: 'tok-abc',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        accepted_by: null,
        accepted_at: null,
        status: 'pending',
        created_at: '2026-03-26T00:00:00Z',
        canvases: null,
        users: null,
      };

      // First call: getInviteByToken → returns the invite
      // Subsequent calls: update → returns success
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: row, error: null }),
      };
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await acceptInvite('tok-abc', 'u-2');
      expect(result.canvasId).toBe('c-1');
      expect(addCanvasMember).toHaveBeenCalledWith('c-1', 'u-2', 'editor', 'u-1');
    });
  });

  describe('revokeInvite', () => {
    it('should update status to revoked', async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Last eq returns the resolved promise
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await revokeInvite('inv-1', 'u-1');
      expect(chain.update).toHaveBeenCalledWith({ status: 'revoked' });
    });
  });
});
