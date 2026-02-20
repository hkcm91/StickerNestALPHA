/**
 * DataSource ACL — Test Suite
 * L0 Gate Test: ACL enforcement — viewer gets PERMISSION_DENIED on write
 * @module kernel/datasource/acl
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();

function createChain() {
  mockSelect.mockReturnThis();
  mockEq.mockReturnThis();
  mockUpsert.mockReturnThis();
  mockDelete.mockReturnThis();
  mockSingle.mockResolvedValue({ data: null, error: null });

  return {
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    upsert: mockUpsert,
    delete: mockDelete,
  };
}

vi.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return createChain();
    },
  },
}));

const { getEffectiveRole, canWrite, canDelete, canManageACL, grantAccess, revokeAccess } =
  await import('./acl');

describe('ACL Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canWrite', () => {
    it('should allow owner to write', () => {
      expect(canWrite('owner')).toBe(true);
    });

    it('should allow editor to write', () => {
      expect(canWrite('editor')).toBe(true);
    });

    it('should deny commenter from writing', () => {
      expect(canWrite('commenter')).toBe(false);
    });

    it('should deny viewer from writing', () => {
      expect(canWrite('viewer')).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should allow only owner to delete', () => {
      expect(canDelete('owner')).toBe(true);
      expect(canDelete('editor')).toBe(false);
      expect(canDelete('commenter')).toBe(false);
      expect(canDelete('viewer')).toBe(false);
    });
  });

  describe('canManageACL', () => {
    it('should allow only owner to manage ACL', () => {
      expect(canManageACL('owner')).toBe(true);
      expect(canManageACL('editor')).toBe(false);
      expect(canManageACL('commenter')).toBe(false);
      expect(canManageACL('viewer')).toBe(false);
    });
  });

  describe('getEffectiveRole', () => {
    it('should return owner for DataSource owner', async () => {
      // First call: data_sources lookup
      mockSingle.mockResolvedValueOnce({
        data: { owner_id: 'user-1' },
        error: null,
      });

      const role = await getEffectiveRole('ds-1', 'user-1');
      expect(role).toBe('owner');
    });

    it('should return ACL role for non-owner', async () => {
      // First call: data_sources lookup (not owner)
      mockSingle
        .mockResolvedValueOnce({
          data: { owner_id: 'user-other' },
          error: null,
        })
        // Second call: ACL lookup
        .mockResolvedValueOnce({
          data: { role: 'editor' },
          error: null,
        });

      const role = await getEffectiveRole('ds-1', 'user-2');
      expect(role).toBe('editor');
    });

    it('should return null for user with no access', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { owner_id: 'user-other' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'No rows' },
        });

      const role = await getEffectiveRole('ds-1', 'user-no-access');
      expect(role).toBeNull();
    });

    it('should return null for non-existent DataSource', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const role = await getEffectiveRole('ds-nonexistent', 'user-1');
      expect(role).toBeNull();
    });
  });

  describe('grantAccess', () => {
    it('should allow owner to grant access', async () => {
      // getEffectiveRole: owner check
      mockSingle
        .mockResolvedValueOnce({ data: { owner_id: 'owner-1' }, error: null })
        // upsert result
        .mockResolvedValueOnce({
          data: {
            user_id: 'target-1',
            role: 'editor',
            created_at: '2026-01-01T00:00:00Z',
            granted_by: 'owner-1',
          },
          error: null,
        });

      const result = await grantAccess('ds-1', 'target-1', 'editor', 'owner-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('editor');
        expect(result.data.userId).toBe('target-1');
      }
    });

    it('should deny non-owner from granting access', async () => {
      // getEffectiveRole: not owner
      mockSingle
        .mockResolvedValueOnce({ data: { owner_id: 'real-owner' }, error: null })
        .mockResolvedValueOnce({ data: { role: 'editor' }, error: null });

      const result = await grantAccess('ds-1', 'target-1', 'viewer', 'editor-user');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('revokeAccess', () => {
    it('should allow owner to revoke access', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { owner_id: 'owner-1' },
        error: null,
      });

      // delete succeeds (no error from chain)
      mockEq.mockReturnThis();
      // The final delete call returns no error
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await revokeAccess('ds-1', 'target-1', 'owner-1');

      expect(result.success).toBe(true);
    });

    it('should deny non-owner from revoking access', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { owner_id: 'real-owner' }, error: null })
        .mockResolvedValueOnce({ data: { role: 'viewer' }, error: null });

      const result = await revokeAccess('ds-1', 'target-1', 'viewer-user');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });
});
