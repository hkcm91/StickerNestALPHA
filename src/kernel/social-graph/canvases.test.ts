/**
 * Social Graph Canvases API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  getUserPublicCanvases,
  addCanvasMember,
  removeCanvasMember,
  updateCanvasMemberRole,
  getCanvasMembers,
  getCanvasRole,
  getSharedCanvases,
  getUserCanvases,
  updateCanvasTags,
  updateCanvasThumbnail,
  deriveCanvasCategory,
} from './canvases';
import type { PublicCanvas } from './canvases';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('../bus', () => ({
  bus: { emit: vi.fn() },
}));

import { bus } from '../bus';

// Chainable Supabase mock (vi.hoisted pattern)
const mockChain = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    lt: vi.fn(),
    single: vi.fn(),
  };
  for (const key of Object.keys(chain)) {
    chain[key].mockReturnThis();
  }
  return chain;
});

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => mockChain),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OWNER = 'owner-uuid';
const MEMBER_A = 'member-a-uuid';
const MEMBER_B = 'member-b-uuid';
const CANVAS_ID = 'canvas-uuid';

const fakeCanvasRow = {
  id: CANVAS_ID,
  name: 'Test Canvas',
  slug: 'test-canvas',
  description: 'A test canvas',
  thumbnail_url: null,
  owner_id: OWNER,
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
};

const fakeMemberRow = {
  canvas_id: CANVAS_ID,
  user_id: MEMBER_A,
  role: 'editor',
  invited_by: OWNER,
  created_at: '2026-03-21T00:00:00Z',
  updated_at: '2026-03-21T00:00:00Z',
};

/**
 * Setup a mock chain where the first .eq().single() call returns ownerData
 * (used by getCanvasOwnerId) and subsequent calls can be customized.
 */
function setupOwnerLookup(ownerId: string | null) {
  // getCanvasOwnerId calls: from('canvases').select('owner_id').eq('id', x).single()
  // We need .single() to resolve with the owner
  if (ownerId) {
    mockChain.single.mockResolvedValueOnce({ data: { owner_id: ownerId }, error: null });
  } else {
    mockChain.single.mockResolvedValueOnce({ data: null, error: null });
  }
}

// ---------------------------------------------------------------------------
// Tests: getUserPublicCanvases (existing functionality)
// ---------------------------------------------------------------------------

describe('getUserPublicCanvases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
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

  it('returns mapped canvas rows', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: [fakeCanvasRow], error: null });

    const result = await getUserPublicCanvases(OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].name).toBe('Test Canvas');
      expect(result.data.items[0].ownerId).toBe(OWNER);
      expect(result.data.items[0].slug).toBe('test-canvas');
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
    const rows = Array.from({ length: 21 }, (_, i) => ({
      ...fakeCanvasRow,
      id: `canvas-${i}`,
      updated_at: `2026-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));
    mockChain.limit.mockResolvedValueOnce({ data: rows, error: null });

    const result = await getUserPublicCanvases(OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(20);
      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: addCanvasMember
// ---------------------------------------------------------------------------

describe('addCanvasMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('rejects self-add', async () => {
    const result = await addCanvasMember(CANVAS_ID, OWNER, 'editor', OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SELF_ACTION');
  });

  it('rejects owner role assignment', async () => {
    const result = await addCanvasMember(CANVAS_ID, MEMBER_A, 'owner', OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects when canvas not found', async () => {
    setupOwnerLookup(null);
    const result = await addCanvasMember(CANVAS_ID, MEMBER_A, 'editor', OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('rejects when caller is not owner', async () => {
    setupOwnerLookup(OWNER);
    const result = await addCanvasMember(CANVAS_ID, MEMBER_B, 'editor', MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('adds member and emits event on success', async () => {
    setupOwnerLookup(OWNER);
    // insert().select().single() chain
    mockChain.insert.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: fakeMemberRow, error: null }),
      }),
    });

    const result = await addCanvasMember(CANVAS_ID, MEMBER_A, 'editor', OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(MEMBER_A);
      expect(result.data.role).toBe('editor');
      expect(result.data.invitedBy).toBe(OWNER);
    }
    expect(bus.emit).toHaveBeenCalledWith(
      'kernel.socialgraph.canvasMember.added',
      expect.objectContaining({ canvasId: CANVAS_ID, userId: MEMBER_A, role: 'editor' }),
    );
  });

  it('rejects duplicate member', async () => {
    setupOwnerLookup(OWNER);
    mockChain.insert.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' },
        }),
      }),
    });

    const result = await addCanvasMember(CANVAS_ID, MEMBER_A, 'editor', OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ALREADY_EXISTS');
  });
});

// ---------------------------------------------------------------------------
// Tests: removeCanvasMember
// ---------------------------------------------------------------------------

describe('removeCanvasMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('rejects when canvas not found', async () => {
    setupOwnerLookup(null);
    const result = await removeCanvasMember(CANVAS_ID, MEMBER_A, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('rejects when caller is not owner', async () => {
    setupOwnerLookup(OWNER);
    const result = await removeCanvasMember(CANVAS_ID, MEMBER_B, MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('rejects removing the canvas owner', async () => {
    setupOwnerLookup(OWNER);
    const result = await removeCanvasMember(CANVAS_ID, OWNER, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('removes member and emits event on success', async () => {
    setupOwnerLookup(OWNER);
    // delete().eq().eq().select() chain
    mockChain.delete.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ user_id: MEMBER_A }], error: null }),
        }),
      }),
    });

    const result = await removeCanvasMember(CANVAS_ID, MEMBER_A, OWNER);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.removed).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      'kernel.socialgraph.canvasMember.removed',
      expect.objectContaining({ canvasId: CANVAS_ID, userId: MEMBER_A }),
    );
  });

  it('returns NOT_FOUND when user is not a member', async () => {
    setupOwnerLookup(OWNER);
    mockChain.delete.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const result = await removeCanvasMember(CANVAS_ID, MEMBER_A, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Tests: updateCanvasMemberRole
// ---------------------------------------------------------------------------

describe('updateCanvasMemberRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('rejects owner role assignment', async () => {
    const result = await updateCanvasMemberRole(CANVAS_ID, MEMBER_A, 'owner', OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects when canvas not found', async () => {
    setupOwnerLookup(null);
    const result = await updateCanvasMemberRole(CANVAS_ID, MEMBER_A, 'viewer', OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('rejects when caller is not owner', async () => {
    setupOwnerLookup(OWNER);
    const result = await updateCanvasMemberRole(CANVAS_ID, MEMBER_B, 'viewer', MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('updates role and emits event on success', async () => {
    setupOwnerLookup(OWNER);
    const updatedRow = { ...fakeMemberRow, role: 'commenter' };
    mockChain.update.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
          }),
        }),
      }),
    });

    const result = await updateCanvasMemberRole(CANVAS_ID, MEMBER_A, 'commenter', OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('commenter');
    }
    expect(bus.emit).toHaveBeenCalledWith(
      'kernel.socialgraph.canvasMember.roleChanged',
      expect.objectContaining({ canvasId: CANVAS_ID, userId: MEMBER_A, role: 'commenter' }),
    );
  });

  it('returns NOT_FOUND when member does not exist', async () => {
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const result = await updateCanvasMemberRole(CANVAS_ID, MEMBER_A, 'viewer', OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Tests: getCanvasMembers
// ---------------------------------------------------------------------------

describe('getCanvasMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('rejects when canvas not found', async () => {
    setupOwnerLookup(null);
    const result = await getCanvasMembers(CANVAS_ID, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('rejects when caller is not owner or member', async () => {
    setupOwnerLookup(OWNER);
    // membership check: single() returns null
    mockChain.single.mockResolvedValueOnce({ data: null, error: null });
    const result = await getCanvasMembers(CANVAS_ID, 'stranger-uuid');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('returns members when caller is owner', async () => {
    setupOwnerLookup(OWNER);
    // order() resolves with data
    mockChain.order.mockResolvedValueOnce({
      data: [fakeMemberRow],
      error: null,
    });

    const result = await getCanvasMembers(CANVAS_ID, OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(MEMBER_A);
    }
  });

  it('returns members when caller is a member', async () => {
    setupOwnerLookup(OWNER);
    // membership check passes
    mockChain.single.mockResolvedValueOnce({ data: { user_id: MEMBER_A }, error: null });
    // then fetch all members
    mockChain.order.mockResolvedValueOnce({
      data: [fakeMemberRow],
      error: null,
    });

    const result = await getCanvasMembers(CANVAS_ID, MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: getCanvasRole
// ---------------------------------------------------------------------------

describe('getCanvasRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('returns NOT_FOUND for non-existent canvas', async () => {
    setupOwnerLookup(null);
    const result = await getCanvasRole(CANVAS_ID, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns owner for canvas owner', async () => {
    setupOwnerLookup(OWNER);
    const result = await getCanvasRole(CANVAS_ID, OWNER);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('owner');
  });

  it('returns member role from canvas_members', async () => {
    setupOwnerLookup(OWNER);
    mockChain.single.mockResolvedValueOnce({ data: { role: 'editor' }, error: null });

    const result = await getCanvasRole(CANVAS_ID, MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('editor');
  });

  it('returns null for non-member', async () => {
    setupOwnerLookup(OWNER);
    mockChain.single.mockResolvedValueOnce({ data: null, error: null });

    const result = await getCanvasRole(CANVAS_ID, 'stranger-uuid');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: getSharedCanvases
// ---------------------------------------------------------------------------

describe('getSharedCanvases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('returns empty list when no shared canvases', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

    const result = await getSharedCanvases(MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('returns shared canvas memberships as PublicCanvas items', async () => {
    const joinedRow = {
      ...fakeMemberRow,
      canvases: {
        id: CANVAS_ID,
        name: 'Test Canvas',
        slug: 'test-canvas',
        description: 'A test canvas',
        thumbnail_url: null,
        owner_id: OWNER,
        tags: [],
        is_public: false,
        created_at: '2026-03-20T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      },
    };
    mockChain.limit.mockResolvedValueOnce({ data: [joinedRow], error: null });

    const result = await getSharedCanvases(MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      // Returns PublicCanvas, not CanvasMember — check PublicCanvas fields
      expect(result.data.items[0].id).toBe(CANVAS_ID);
      expect(result.data.items[0].name).toBe('Test Canvas');
      expect(result.data.items[0].ownerId).toBe(OWNER);
    }
  });

  it('supports pagination', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      ...fakeMemberRow,
      canvas_id: `canvas-${i}`,
      created_at: `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      canvases: {
        id: `canvas-${i}`,
        name: `Canvas ${i}`,
        slug: `canvas-${i}`,
        description: null,
        thumbnail_url: null,
        owner_id: OWNER,
        tags: [],
        is_public: false,
        created_at: '2026-03-20T00:00:00Z',
        updated_at: `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      },
    }));
    mockChain.limit.mockResolvedValueOnce({ data: rows, error: null });

    const result = await getSharedCanvases(MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(20);
      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBeDefined();
    }
  });

  it('handles DB errors', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: null, error: { message: 'connection error' } });

    const result = await getSharedCanvases(MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe('connection error');
  });

  it('returns PublicCanvas items (with canvas metadata joined)', async () => {
    const joinedRow = {
      canvas_id: CANVAS_ID,
      role: 'viewer',
      created_at: '2026-03-21T00:00:00Z',
      canvases: {
        id: CANVAS_ID,
        name: 'Shared Canvas',
        slug: 'shared-canvas',
        description: 'desc',
        thumbnail_url: 'https://example.com/thumb.png',
        owner_id: OWNER,
        tags: ['design'],
        is_public: false,
        created_at: '2026-03-20T00:00:00Z',
        updated_at: '2026-03-21T00:00:00Z',
      },
    };
    mockChain.limit.mockResolvedValueOnce({ data: [joinedRow], error: null });

    const result = await getSharedCanvases(MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      const item = result.data.items[0];
      // Result is PublicCanvas, not CanvasMember
      expect(item).toHaveProperty('id', CANVAS_ID);
      expect(item).toHaveProperty('name', 'Shared Canvas');
      expect(item).toHaveProperty('slug', 'shared-canvas');
      expect(item).toHaveProperty('ownerId', OWNER);
      expect(item).toHaveProperty('thumbnailUrl', 'https://example.com/thumb.png');
      expect(item).toHaveProperty('tags');
      expect(item).toHaveProperty('isPublic');
      // These are PublicCanvas fields, not CanvasMember fields
      expect(item).not.toHaveProperty('canvasId');
      expect(item).not.toHaveProperty('userId');
    }
  });

  it('filters out rows where canvases join is null', async () => {
    const rowWithNullCanvas = {
      canvas_id: CANVAS_ID,
      role: 'editor',
      created_at: '2026-03-21T00:00:00Z',
      canvases: null,
    };
    mockChain.limit.mockResolvedValueOnce({ data: [rowWithNullCanvas], error: null });

    const result = await getSharedCanvases(MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: getUserCanvases
// ---------------------------------------------------------------------------

describe('getUserCanvases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('rejects when callerId !== userId (PERMISSION_DENIED)', async () => {
    const result = await getUserCanvases(OWNER, MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });

  it('returns empty list when owner has no canvases', async () => {
    // getUserCanvases calls limit() for the canvas list; no member count query when empty
    mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

    const result = await getUserCanvases(OWNER, OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('returns all canvases (public and private) for owner', async () => {
    const privateCanvas = {
      ...fakeCanvasRow,
      is_public: false,
      tags: ['work'],
      member_count: 0,
    };
    const publicCanvas = {
      ...fakeCanvasRow,
      id: 'canvas-public',
      is_public: true,
      tags: [],
      member_count: 0,
    };
    mockChain.limit.mockResolvedValueOnce({ data: [privateCanvas, publicCanvas], error: null });
    // member count sub-query: .from('canvas_members').select('canvas_id').in(...)
    mockChain.in = vi.fn().mockResolvedValueOnce({ data: [], error: null });

    const result = await getUserCanvases(OWNER, OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
    }
  });

  it('populates memberCount from canvas_members sub-query', async () => {
    const canvasRow = { ...fakeCanvasRow, is_public: false, tags: [], member_count: 0 };
    mockChain.limit.mockResolvedValueOnce({ data: [canvasRow], error: null });
    // Member count sub-query returns two rows for this canvas
    mockChain.in = vi.fn().mockResolvedValueOnce({
      data: [
        { canvas_id: CANVAS_ID },
        { canvas_id: CANVAS_ID },
      ],
      error: null,
    });

    const result = await getUserCanvases(OWNER, OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].memberCount).toBe(2);
    }
  });

  it('supports pagination with hasMore and nextCursor', async () => {
    // Return limit+1 (default limit=50, so 51 rows)
    const rows = Array.from({ length: 51 }, (_, i) => ({
      ...fakeCanvasRow,
      id: `canvas-${i}`,
      is_public: false,
      tags: [],
      member_count: 0,
      updated_at: `2026-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));
    mockChain.limit.mockResolvedValueOnce({ data: rows, error: null });
    mockChain.in = vi.fn().mockResolvedValueOnce({ data: [], error: null });

    const result = await getUserCanvases(OWNER, OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(50);
      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBeDefined();
    }
  });

  it('handles Supabase errors', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: null, error: { message: 'query failed' } });

    const result = await getUserCanvases(OWNER, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('query failed');
    }
  });

  it('respects custom limit option', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

    const result = await getUserCanvases(OWNER, OWNER, { limit: 10 });
    expect(result.success).toBe(true);
    // Confirm limit was passed through (indirectly: no error, empty list)
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: updateCanvasTags
// ---------------------------------------------------------------------------

describe('updateCanvasTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  it('rejects when tags array exceeds 20 items', async () => {
    const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);
    const result = await updateCanvasTags(CANVAS_ID, tooManyTags, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toMatch(/20/);
    }
  });

  it('rejects when any tag exceeds 50 characters', async () => {
    const longTag = 'a'.repeat(51);
    const result = await updateCanvasTags(CANVAS_ID, ['valid-tag', longTag], OWNER);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toMatch(/50/);
    }
  });

  it('accepts a tag of exactly 50 characters', async () => {
    const exactTag = 'a'.repeat(50);
    setupOwnerLookup(OWNER);
    // update({tags}).eq('id', canvasId) — override update chain so eq() resolves
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

    const result = await updateCanvasTags(CANVAS_ID, [exactTag], OWNER);
    expect(result.success).toBe(true);
  });

  it('rejects when canvas not found', async () => {
    setupOwnerLookup(null);
    const result = await updateCanvasTags(CANVAS_ID, ['tag1'], OWNER);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('rejects when caller is not owner (PERMISSION_DENIED)', async () => {
    setupOwnerLookup(OWNER);
    const result = await updateCanvasTags(CANVAS_ID, ['tag1'], MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });

  it('updates tags and emits bus event on success', async () => {
    const tags = ['design', 'ui', 'mockup'];
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

    const result = await updateCanvasTags(CANVAS_ID, tags, OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(tags);
    }
    expect(bus.emit).toHaveBeenCalledWith(
      'kernel.socialgraph.canvas.tagsUpdated',
      expect.objectContaining({ canvasId: CANVAS_ID, tags, updatedBy: OWNER }),
    );
  });

  it('handles DB error on update', async () => {
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: { message: 'update failed' } }) });

    const result = await updateCanvasTags(CANVAS_ID, ['tag1'], OWNER);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('update failed');
    }
  });

  it('accepts an empty tags array (clearing all tags)', async () => {
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

    const result = await updateCanvasTags(CANVAS_ID, [], OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('rejects exactly 21 tags', async () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    const result = await updateCanvasTags(CANVAS_ID, tags, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts exactly 20 tags', async () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

    const result = await updateCanvasTags(CANVAS_ID, tags, OWNER);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: updateCanvasThumbnail
// ---------------------------------------------------------------------------

describe('updateCanvasThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  const THUMBNAIL_URL = 'https://example.com/thumb.png';

  it('rejects when canvas not found', async () => {
    setupOwnerLookup(null);
    const result = await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('allows owner to update thumbnail', async () => {
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

    const result = await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, OWNER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thumbnailUrl).toBe(THUMBNAIL_URL);
    }
    expect(bus.emit).toHaveBeenCalledWith(
      'kernel.socialgraph.canvas.thumbnailUpdated',
      expect.objectContaining({ canvasId: CANVAS_ID, thumbnailUrl: THUMBNAIL_URL, updatedBy: OWNER }),
    );
  });

  it('allows editor member to update thumbnail', async () => {
    setupOwnerLookup(OWNER);
    // membership check: single() returns editor role
    mockChain.single.mockResolvedValueOnce({ data: { role: 'editor' }, error: null });
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

    const result = await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thumbnailUrl).toBe(THUMBNAIL_URL);
    }
    expect(bus.emit).toHaveBeenCalledWith(
      'kernel.socialgraph.canvas.thumbnailUpdated',
      expect.objectContaining({ canvasId: CANVAS_ID, updatedBy: MEMBER_A }),
    );
  });

  it('rejects viewer member with PERMISSION_DENIED', async () => {
    setupOwnerLookup(OWNER);
    mockChain.single.mockResolvedValueOnce({ data: { role: 'viewer' }, error: null });

    const result = await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });

  it('rejects commenter member with PERMISSION_DENIED', async () => {
    setupOwnerLookup(OWNER);
    mockChain.single.mockResolvedValueOnce({ data: { role: 'commenter' }, error: null });

    const result = await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, MEMBER_A);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });

  it('rejects non-member with PERMISSION_DENIED', async () => {
    setupOwnerLookup(OWNER);
    // membership check returns null (not a member)
    mockChain.single.mockResolvedValueOnce({ data: null, error: null });

    const result = await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, MEMBER_B);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });

  it('handles DB error on update', async () => {
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: { message: 'storage error' } }) });

    const result = await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, OWNER);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('storage error');
    }
  });

  it('does not emit bus event when update fails', async () => {
    setupOwnerLookup(OWNER);
    mockChain.update.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: { message: 'write error' } }) });

    await updateCanvasThumbnail(CANVAS_ID, THUMBNAIL_URL, OWNER);
    expect(bus.emit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: deriveCanvasCategory (pure function — no Supabase calls)
// ---------------------------------------------------------------------------

describe('deriveCanvasCategory', () => {
  const baseCanvas: PublicCanvas = {
    id: CANVAS_ID,
    name: 'Test Canvas',
    slug: 'test-canvas',
    description: null,
    thumbnailUrl: null,
    ownerId: OWNER,
    tags: [],
    memberCount: 0,
    isPublic: false,
    createdAt: '2026-03-20T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
  };

  it('returns "public" when isPublic is true regardless of memberCount', () => {
    const canvas = { ...baseCanvas, isPublic: true, memberCount: 0 };
    expect(deriveCanvasCategory(canvas)).toBe('public');
  });

  it('returns "public" when isPublic is true and memberCount > 0', () => {
    const canvas = { ...baseCanvas, isPublic: true, memberCount: 5 };
    expect(deriveCanvasCategory(canvas)).toBe('public');
  });

  it('returns "collaborative" when isPublic is false and memberCount > 0', () => {
    const canvas = { ...baseCanvas, isPublic: false, memberCount: 1 };
    expect(deriveCanvasCategory(canvas)).toBe('collaborative');
  });

  it('returns "collaborative" when memberCount is large', () => {
    const canvas = { ...baseCanvas, isPublic: false, memberCount: 100 };
    expect(deriveCanvasCategory(canvas)).toBe('collaborative');
  });

  it('returns "private" when isPublic is false and memberCount is 0', () => {
    const canvas = { ...baseCanvas, isPublic: false, memberCount: 0 };
    expect(deriveCanvasCategory(canvas)).toBe('private');
  });

  it('returns "private" for default (solo private canvas)', () => {
    expect(deriveCanvasCategory(baseCanvas)).toBe('private');
  });
});
