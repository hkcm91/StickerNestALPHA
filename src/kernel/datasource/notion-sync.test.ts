/**
 * Notion Sync Tests
 *
 * @module kernel/datasource
 * @layer L0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataManagerEvents } from '@sn/types';

import { bus } from '../bus';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '../supabase';

import {
  listNotionDatabases,
  importNotionDatabase,
  resyncNotionDatabase,
} from './notion-sync';

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const USER_ID = 'user-1';

function mockNotionDatabase(overrides: Record<string, unknown> = {}) {
  return {
    object: 'database',
    id: 'notion-db-1',
    title: [{ plain_text: 'My Database' }],
    properties: {
      Name: { id: 'prop-1', type: 'title', title: {} },
      Status: {
        id: 'prop-2',
        type: 'select',
        select: {
          options: [
            { id: 'opt-1', name: 'Todo', color: 'default' },
            { id: 'opt-2', name: 'Done', color: 'green' },
          ],
        },
      },
      Count: { id: 'prop-3', type: 'number', number: { format: 'number' } },
    },
    icon: { emoji: '📋' },
    ...overrides,
  };
}

function mockNotionPage(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    created_time: '2026-01-01T00:00:00Z',
    last_edited_time: '2026-01-02T00:00:00Z',
    properties: {
      Name: { type: 'title', title: [{ plain_text: `Item ${id}`, text: { content: `Item ${id}` } }] },
      Status: { type: 'select', select: { name: 'Todo' } },
      Count: { type: 'number', number: 42 },
    },
    ...overrides,
  };
}

describe('Notion Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bus.unsubscribeAll();
  });

  describe('listNotionDatabases', () => {
    it('returns a list of database summaries', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          results: [
            mockNotionDatabase(),
            { object: 'page', id: 'page-1' }, // should be filtered out
          ],
        },
        error: null,
      });

      const result = await listNotionDatabases(USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe('My Database');
        expect(result.data[0].propertyCount).toBe(3);
        expect(result.data[0].icon).toBe('📋');
      }
    });

    it('returns error when proxy fails', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized' },
      });

      const result = await listNotionDatabases(USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Unauthorized');
      }
    });

    it('filters out non-database results', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          results: [
            { object: 'page', id: 'p1', title: [], properties: {} },
          ],
        },
        error: null,
      });

      const result = await listNotionDatabases(USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('handles empty results', async () => {
      mockInvoke.mockResolvedValue({
        data: { results: [] },
        error: null,
      });

      const result = await listNotionDatabases(USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('handles network error gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Network timeout'));

      const result = await listNotionDatabases(USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Network timeout');
      }
    });
  });

  describe('importNotionDatabase', () => {
    it('imports a Notion database and emits sync events', async () => {
      // Step 1: Retrieve DB schema
      const db = mockNotionDatabase();

      // Step 2 & 3: Query pages (single page, no pagination)
      const pages = [mockNotionPage('page-1'), mockNotionPage('page-2')];

      let invokeCallCount = 0;
      mockInvoke.mockImplementation(() => {
        invokeCallCount++;
        if (invokeCallCount === 1) {
          return Promise.resolve({ data: db, error: null });
        }
        return Promise.resolve({
          data: { results: pages, has_more: false, next_cursor: null },
          error: null,
        });
      });

      // Step 6: Insert DataSource
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'ds-new' }, error: null }),
          }),
        }),
      });

      const startedHandler = vi.fn();
      const completedHandler = vi.fn();
      bus.subscribe(DataManagerEvents.NOTION_SYNC_STARTED, startedHandler);
      bus.subscribe(DataManagerEvents.NOTION_SYNC_COMPLETED, completedHandler);

      const result = await importNotionDatabase('notion-db-1', USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dataSourceId).toBe('ds-new');
        expect(result.data.rowCount).toBe(2);
        expect(result.data.schema.columns.length).toBe(3);
        expect(result.data.syncConfig.syncDirection).toBe('import');
      }
      expect(startedHandler).toHaveBeenCalledOnce();
      expect(completedHandler).toHaveBeenCalledOnce();
    });

    it('emits SYNC_FAILED when schema retrieval fails', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const failHandler = vi.fn();
      bus.subscribe(DataManagerEvents.NOTION_SYNC_FAILED, failHandler);

      const result = await importNotionDatabase('bad-db', USER_ID);

      expect(result.success).toBe(false);
      expect(failHandler).toHaveBeenCalledOnce();
    });

    it('emits SYNC_FAILED when page query fails', async () => {
      let invokeCallCount = 0;
      mockInvoke.mockImplementation(() => {
        invokeCallCount++;
        if (invokeCallCount === 1) {
          return Promise.resolve({ data: mockNotionDatabase(), error: null });
        }
        return Promise.resolve({
          data: null,
          error: { message: 'Query failed' },
        });
      });

      const failHandler = vi.fn();
      bus.subscribe(DataManagerEvents.NOTION_SYNC_FAILED, failHandler);

      const result = await importNotionDatabase('notion-db-1', USER_ID);

      expect(result.success).toBe(false);
      expect(failHandler).toHaveBeenCalledOnce();
    });

    it('emits SYNC_FAILED when DataSource insert fails', async () => {
      let invokeCallCount = 0;
      mockInvoke.mockImplementation(() => {
        invokeCallCount++;
        if (invokeCallCount === 1) {
          return Promise.resolve({ data: mockNotionDatabase(), error: null });
        }
        return Promise.resolve({
          data: { results: [mockNotionPage('p1')], has_more: false },
          error: null,
        });
      });

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      });

      const failHandler = vi.fn();
      bus.subscribe(DataManagerEvents.NOTION_SYNC_FAILED, failHandler);

      const result = await importNotionDatabase('notion-db-1', USER_ID);

      expect(result.success).toBe(false);
      expect(failHandler).toHaveBeenCalledOnce();
    });

    it('handles pagination when has_more is true', async () => {
      let invokeCallCount = 0;
      mockInvoke.mockImplementation(() => {
        invokeCallCount++;
        if (invokeCallCount === 1) {
          return Promise.resolve({ data: mockNotionDatabase(), error: null });
        }
        if (invokeCallCount === 2) {
          return Promise.resolve({
            data: { results: [mockNotionPage('p1')], has_more: true, next_cursor: 'cursor-1' },
            error: null,
          });
        }
        return Promise.resolve({
          data: { results: [mockNotionPage('p2')], has_more: false, next_cursor: null },
          error: null,
        });
      });

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'ds-paged' }, error: null }),
          }),
        }),
      });

      const result = await importNotionDatabase('notion-db-1', USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rowCount).toBe(2);
      }
    });
  });

  describe('resyncNotionDatabase', () => {
    it('returns error when DataSource not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const result = await resyncNotionDatabase('ds-bad', USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
    });

    it('returns error when DataSource is not linked to Notion', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                metadata: { custom: {} },
                schema: { columns: [] },
                content: { rows: [] },
                revision: 0,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await resyncNotionDatabase('ds-1', USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('resyncs and reports added/updated counts', async () => {
      const existingRow = {
        id: 'page-1',
        cells: { 'col-1': 'Old value' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      // Mock the DataSource read
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                metadata: {
                  custom: {
                    notionSync: {
                      notionDatabaseId: 'notion-db-1',
                      columnMapping: { 'col-1': 'Name' },
                      lastSyncedAt: '2026-01-01T00:00:00Z',
                      syncDirection: 'import',
                      status: 'synced',
                    },
                  },
                },
                schema: {
                  columns: [{ id: 'col-1', name: 'Name', type: 'text', order: 0 }],
                },
                content: { rows: [existingRow] },
                revision: 5,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock notion query: page-1 (update) + page-2 (new)
      mockInvoke.mockResolvedValue({
        data: {
          results: [
            {
              id: 'page-1',
              created_time: '2026-01-01T00:00:00Z',
              last_edited_time: '2026-01-03T00:00:00Z',
              properties: {
                Name: { type: 'title', title: [{ plain_text: 'Updated', text: { content: 'Updated' } }] },
              },
            },
            {
              id: 'page-2',
              created_time: '2026-01-02T00:00:00Z',
              last_edited_time: '2026-01-03T00:00:00Z',
              properties: {
                Name: { type: 'title', title: [{ plain_text: 'New Item', text: { content: 'New Item' } }] },
              },
            },
          ],
          has_more: false,
        },
        error: null,
      });

      // Mock the DataSource update
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const completedHandler = vi.fn();
      bus.subscribe(DataManagerEvents.NOTION_SYNC_COMPLETED, completedHandler);

      const result = await resyncNotionDatabase('ds-1', USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updated).toBe(1);
        expect(result.data.added).toBe(1);
      }
      expect(completedHandler).toHaveBeenCalledOnce();
    });
  });
});
