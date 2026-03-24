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
} from './canvases';

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

  it('returns shared canvas memberships', async () => {
    mockChain.limit.mockResolvedValueOnce({ data: [fakeMemberRow], error: null });

    const result = await getSharedCanvases(MEMBER_A);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].canvasId).toBe(CANVAS_ID);
      expect(result.data.items[0].role).toBe('editor');
    }
  });

  it('supports pagination', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      ...fakeMemberRow,
      canvas_id: `canvas-${i}`,
      created_at: `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
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
});
