/**
 * DataSource CRUD — Test Suite
 * L0 Gate Tests: Shared DataSource reactivity + revision conflict + ACL enforcement
 * @module kernel/datasource
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KernelEvents } from '@sn/types';

import { bus } from '../bus';

// UUID constants for test data (schemas require valid UUIDs)
const USER_1 = '00000000-0000-4000-a000-000000000001';
const USER_2 = '00000000-0000-4000-a000-000000000002';
const USER_EDITOR = '00000000-0000-4000-a000-000000000003';
const USER_VIEWER = '00000000-0000-4000-a000-000000000004';
const USER_COMMENTER = '00000000-0000-4000-a000-000000000005';
const USER_OTHER = '00000000-0000-4000-a000-000000000006';
const USER_NO_ACCESS = '00000000-0000-4000-a000-000000000007';
const USER_RANDOM = '00000000-0000-4000-a000-000000000008';
const CANVAS_1 = '00000000-0000-4000-a000-000000000010';
const DS_123 = 'ds-123';
const DS_456 = 'ds-456';

// Flexible Supabase mock that supports chaining and per-call response setup
function createQueryBuilder(defaultResponse: { data: unknown; error: unknown } = { data: null, error: null }) {
  let response = defaultResponse;
  const builder: Record<string, unknown> = {};

  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'range', 'upsert', 'order'];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }

  builder.single = vi.fn(() => Promise.resolve(response));

  // Allow tests to set specific response
  (builder as { _setResponse: (r: { data: unknown; error: unknown }) => void })._setResponse = (r) => {
    response = r;
  };

  return builder;
}

let queryResponses: Array<{ data: unknown; error: unknown }> = [];
let queryIndex = 0;

function createMockSupabase() {
  return {
    from: vi.fn(() => {
      const resp = queryResponses[queryIndex] ?? { data: null, error: null };
      queryIndex++;
      const builder = createQueryBuilder(resp);
      // Override order to also resolve with response (for list queries)
      (builder.order as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve(resp));
      return builder;
    }),
  };
}

const mockSupabase = createMockSupabase();

vi.mock('../supabase', () => ({
  supabase: mockSupabase,
}));

// Mock ACL
vi.mock('./acl', () => ({
  getEffectiveRole: vi.fn(),
  canWrite: vi.fn((role: string) => role === 'owner' || role === 'editor'),
  canDelete: vi.fn((role: string) => role === 'owner'),
}));

const aclModule = await import('./acl');
const mockGetEffectiveRole = vi.mocked(aclModule.getEffectiveRole);

const {
  createDataSource,
  readDataSource,
  updateDataSource,
  deleteDataSource,
  listDataSources,
} = await import('./datasource');

const mockDataSourceRow = {
  id: DS_123,
  type: 'table',
  owner_id: USER_1,
  scope: 'canvas',
  canvas_id: CANVAS_1,
  name: 'Test Source',
  schema: null,
  content: null,
  metadata: { name: 'Test Source' },
  revision: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('DataSource CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResponses = [];
    queryIndex = 0;
    bus.unsubscribeAll();
  });

  describe('createDataSource', () => {
    it('should create a DataSource and emit bus event', async () => {
      queryResponses = [
        { data: mockDataSourceRow, error: null }, // insert().select().single()
      ];

      const busHandler = vi.fn();
      bus.subscribe(KernelEvents.DATASOURCE_CREATED, busHandler);

      const result = await createDataSource(
        {
          type: 'table',
          ownerId: USER_1,
          scope: 'canvas',
          canvasId: CANVAS_1,
        },
        USER_1,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(DS_123);
        expect(result.data.type).toBe('table');
      }
      expect(busHandler).toHaveBeenCalledOnce();
    });

    it('should reject creation for another user', async () => {
      const result = await createDataSource(
        {
          type: 'table',
          ownerId: USER_2,
          scope: 'canvas',
        },
        USER_1, // caller is not the owner
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('readDataSource', () => {
    it('should allow owner to read', async () => {
      queryResponses = [
        { data: mockDataSourceRow, error: null },
      ];

      const result = await readDataSource(DS_123, USER_1);

      expect(result.success).toBe(true);
    });

    it('should allow public DataSource to be read by anyone', async () => {
      queryResponses = [
        { data: { ...mockDataSourceRow, scope: 'public', owner_id: USER_OTHER }, error: null },
      ];

      const result = await readDataSource(DS_123, USER_RANDOM);

      expect(result.success).toBe(true);
    });

    it('should check ACL for non-owner, non-public access', async () => {
      queryResponses = [
        { data: { ...mockDataSourceRow, owner_id: USER_OTHER, scope: 'shared' }, error: null },
      ];
      mockGetEffectiveRole.mockResolvedValueOnce('viewer');

      const result = await readDataSource(DS_123, USER_1);

      expect(result.success).toBe(true);
    });

    it('should deny access for user with no ACL entry', async () => {
      queryResponses = [
        { data: { ...mockDataSourceRow, owner_id: USER_OTHER, scope: 'shared' }, error: null },
      ];
      mockGetEffectiveRole.mockResolvedValueOnce(null);

      const result = await readDataSource(DS_123, USER_NO_ACCESS);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('should return NOT_FOUND for non-existent DataSource', async () => {
      queryResponses = [
        { data: null, error: { message: 'Not found' } },
      ];

      const result = await readDataSource('ds-nonexistent', USER_1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('updateDataSource', () => {
    it('should allow editor to update and emit bus event', async () => {
      mockGetEffectiveRole.mockResolvedValueOnce('editor');
      queryResponses = [
        // getEffectiveRole internal queries are mocked separately
        // revision check: select revision, type
        { data: { revision: 1, type: 'table' }, error: null },
        // second select for revision before update
        { data: { revision: 1, type: 'table' }, error: null },
        // update result
        { data: { ...mockDataSourceRow, revision: 2 }, error: null },
      ];

      const busHandler = vi.fn();
      bus.subscribe(KernelEvents.DATASOURCE_UPDATED, busHandler);

      const result = await updateDataSource(
        DS_123,
        { metadata: { name: 'Updated' }, lastSeenRevision: 1 },
        USER_EDITOR,
      );

      expect(result.success).toBe(true);
      expect(busHandler).toHaveBeenCalledOnce();
    });

    it('should deny viewer from updating — L0 gate test: ACL enforcement', async () => {
      mockGetEffectiveRole.mockResolvedValueOnce('viewer');

      const result = await updateDataSource(
        DS_123,
        { metadata: { name: 'Hacked' } },
        USER_VIEWER,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
        expect(result.error.message).toContain('viewer');
      }
    });

    it('should deny commenter from updating data', async () => {
      mockGetEffectiveRole.mockResolvedValueOnce('commenter');

      const result = await updateDataSource(
        DS_123,
        { metadata: { name: 'Annotated' } },
        USER_COMMENTER,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('should return CONFLICT for stale revision — revision conflict test', async () => {
      mockGetEffectiveRole.mockResolvedValueOnce('editor');
      queryResponses = [
        // revision check query — server is at revision 5
        { data: { revision: 5, type: 'table' }, error: null },
      ];

      const result = await updateDataSource(
        DS_123,
        { metadata: { name: 'Stale update' }, lastSeenRevision: 3 },
        USER_EDITOR,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT');
        expect(result.error.currentRevision).toBe(5);
      }
    });
  });

  describe('deleteDataSource', () => {
    it('should allow owner to delete and emit bus event', async () => {
      mockGetEffectiveRole.mockResolvedValueOnce('owner');
      queryResponses = [
        { data: null, error: null }, // delete resolves
      ];

      const busHandler = vi.fn();
      bus.subscribe(KernelEvents.DATASOURCE_DELETED, busHandler);

      const result = await deleteDataSource(DS_123, USER_1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(DS_123);
      }
      expect(busHandler).toHaveBeenCalledOnce();
    });

    it('should deny editor from deleting', async () => {
      mockGetEffectiveRole.mockResolvedValueOnce('editor');

      const result = await deleteDataSource(DS_123, USER_EDITOR);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('listDataSources', () => {
    it('should list DataSources', async () => {
      queryResponses = [
        {
          data: [mockDataSourceRow, { ...mockDataSourceRow, id: DS_456 }],
          error: null,
        },
      ];

      const result = await listDataSources(USER_1, { limit: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });

  describe('L0 Gate Test: Shared DataSource reactivity', () => {
    it('should notify multiple subscribers when DataSource is updated', async () => {
      mockGetEffectiveRole.mockResolvedValueOnce('owner');
      queryResponses = [
        // revision check
        { data: { revision: 0, type: 'note' }, error: null },
        // update result
        { data: { ...mockDataSourceRow, type: 'note', revision: 0 }, error: null },
      ];

      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      bus.subscribe(KernelEvents.DATASOURCE_UPDATED, subscriber1);
      bus.subscribe(KernelEvents.DATASOURCE_UPDATED, subscriber2);

      await updateDataSource(DS_123, { metadata: { name: 'Shared' } }, USER_1);

      expect(subscriber1).toHaveBeenCalledOnce();
      expect(subscriber2).toHaveBeenCalledOnce();
      // Both receive the same event
      expect(subscriber1.mock.calls[0][0].payload.dataSource.id).toBe(DS_123);
      expect(subscriber2.mock.calls[0][0].payload.dataSource.id).toBe(DS_123);
    });
  });
});
