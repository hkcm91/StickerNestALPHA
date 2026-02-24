/**
 * Notion Integration Handler Tests
 *
 * @module runtime/integrations
 * @layer L3
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Supabase client before imports
vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

import { supabase } from '../../kernel/supabase/client';

import {
  createNotionHandler,
  checkNotionConnection,
  getWidgetNotionPermissions,
} from './notion-handler';

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

describe('Notion Integration Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotionHandler()', () => {
    describe('query()', () => {
      it('throws when user is not authenticated', async () => {
        const handler = createNotionHandler(() => ({
          userId: null,
        }));

        await expect(
          handler.query({
            type: 'database.query',
            database_id: 'db-123',
          }),
        ).rejects.toThrow('Authentication required');
      });

      it('validates query params and rejects invalid ones', async () => {
        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.query({
            type: 'invalid.type',
            database_id: 'db-123',
          }),
        ).rejects.toThrow('Invalid Notion query params');
      });

      it('calls the notion-proxy Edge Function for database.query', async () => {
        const mockResponse = {
          success: true,
          data: {
            object: 'list',
            results: [
              {
                object: 'page',
                id: 'page-1',
                properties: {},
              },
            ],
            next_cursor: null,
            has_more: false,
          },
        };
        mockInvoke.mockResolvedValue({ data: mockResponse, error: null });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
          widgetId: 'widget-abc',
          instanceId: 'instance-xyz',
        }));

        const result = await handler.query({
          type: 'database.query',
          database_id: 'db-123',
          filter: {
            property: 'Status',
            select: { equals: 'Active' },
          },
        });

        expect(result).toEqual(mockResponse.data);
        expect(mockInvoke).toHaveBeenCalledWith('notion-proxy', {
          body: {
            operation: 'query',
            type: 'database.query',
            params: {
              database_id: 'db-123',
              filter: {
                property: 'Status',
                select: { equals: 'Active' },
              },
            },
            widgetId: 'widget-abc',
            instanceId: 'instance-xyz',
          },
        });
      });

      it('calls the notion-proxy Edge Function for search', async () => {
        const mockResponse = {
          success: true,
          data: {
            object: 'list',
            results: [],
            next_cursor: null,
            has_more: false,
          },
        };
        mockInvoke.mockResolvedValue({ data: mockResponse, error: null });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        const result = await handler.query({
          type: 'search',
          query: 'test query',
          filter: { property: 'object', value: 'page' },
        });

        expect(result).toEqual(mockResponse.data);
        expect(mockInvoke).toHaveBeenCalledWith('notion-proxy', {
          body: {
            operation: 'query',
            type: 'search',
            params: {
              query: 'test query',
              filter: { property: 'object', value: 'page' },
            },
            widgetId: undefined,
            instanceId: undefined,
          },
        });
      });

      it('handles database.retrieve query type', async () => {
        const mockResponse = {
          success: true,
          data: {
            object: 'database',
            id: 'db-123',
            title: [{ text: { content: 'My Database' } }],
            properties: {},
          },
        };
        mockInvoke.mockResolvedValue({ data: mockResponse, error: null });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        const result = await handler.query({
          type: 'database.retrieve',
          database_id: 'db-123',
        });

        expect(result).toEqual(mockResponse.data);
      });

      it('handles page.retrieve query type', async () => {
        const mockResponse = {
          success: true,
          data: {
            object: 'page',
            id: 'page-123',
            properties: {},
          },
        };
        mockInvoke.mockResolvedValue({ data: mockResponse, error: null });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        const result = await handler.query({
          type: 'page.retrieve',
          page_id: 'page-123',
        });

        expect(result).toEqual(mockResponse.data);
      });

      it('throws on Supabase invoke error', async () => {
        mockInvoke.mockResolvedValue({
          data: null,
          error: { message: 'Edge function not found' },
        });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.query({
            type: 'database.query',
            database_id: 'db-123',
          }),
        ).rejects.toThrow('Notion query failed: Edge function not found');
      });

      it('throws on empty response', async () => {
        mockInvoke.mockResolvedValue({
          data: null,
          error: null,
        });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.query({
            type: 'database.query',
            database_id: 'db-123',
          }),
        ).rejects.toThrow('Notion query returned empty response');
      });

      it('maps unauthorized error to user-friendly message', async () => {
        mockInvoke.mockResolvedValue({
          data: {
            success: false,
            error: 'Token expired',
            code: 'unauthorized',
          },
          error: null,
        });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.query({
            type: 'database.query',
            database_id: 'db-123',
          }),
        ).rejects.toThrow('Notion connection expired');
      });

      it('maps not_connected error correctly', async () => {
        mockInvoke.mockResolvedValue({
          data: {
            success: false,
            code: 'not_connected',
          },
          error: null,
        });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.query({
            type: 'database.query',
            database_id: 'db-123',
          }),
        ).rejects.toThrow('not connected');
      });

      it('maps rate_limited error correctly', async () => {
        mockInvoke.mockResolvedValue({
          data: {
            success: false,
            code: 'rate_limited',
          },
          error: null,
        });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.query({
            type: 'database.query',
            database_id: 'db-123',
          }),
        ).rejects.toThrow('Too many Notion requests');
      });
    });

    describe('mutate()', () => {
      it('throws when user is not authenticated', async () => {
        const handler = createNotionHandler(() => ({
          userId: null,
        }));

        await expect(
          handler.mutate({
            type: 'page.create',
            parent: { database_id: 'db-123' },
            properties: {},
          }),
        ).rejects.toThrow('Authentication required');
      });

      it('validates mutation params and rejects invalid ones', async () => {
        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.mutate({
            type: 'invalid.mutation',
          }),
        ).rejects.toThrow('Invalid Notion mutation params');
      });

      it('calls the notion-proxy Edge Function for page.create', async () => {
        const mockResponse = {
          success: true,
          data: {
            object: 'page',
            id: 'new-page-id',
            properties: {},
          },
        };
        mockInvoke.mockResolvedValue({ data: mockResponse, error: null });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
          widgetId: 'widget-abc',
          instanceId: 'instance-xyz',
        }));

        const result = await handler.mutate({
          type: 'page.create',
          parent: { database_id: 'db-123' },
          properties: {
            Name: {
              title: [{ text: { content: 'New Page' } }],
            },
          },
        });

        expect(result).toEqual(mockResponse.data);
        expect(mockInvoke).toHaveBeenCalledWith('notion-proxy', {
          body: {
            operation: 'mutate',
            type: 'page.create',
            params: {
              parent: { database_id: 'db-123' },
              properties: {
                Name: {
                  title: [{ text: { content: 'New Page' } }],
                },
              },
            },
            widgetId: 'widget-abc',
            instanceId: 'instance-xyz',
          },
        });
      });

      it('calls the notion-proxy Edge Function for page.update', async () => {
        const mockResponse = {
          success: true,
          data: {
            object: 'page',
            id: 'page-123',
            properties: {},
          },
        };
        mockInvoke.mockResolvedValue({ data: mockResponse, error: null });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        const result = await handler.mutate({
          type: 'page.update',
          page_id: 'page-123',
          properties: {
            Status: { select: { name: 'Done' } },
          },
        });

        expect(result).toEqual(mockResponse.data);
      });

      it('calls the notion-proxy Edge Function for page.archive', async () => {
        const mockResponse = {
          success: true,
          data: {
            object: 'page',
            id: 'page-123',
            archived: true,
          },
        };
        mockInvoke.mockResolvedValue({ data: mockResponse, error: null });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        const result = await handler.mutate({
          type: 'page.archive',
          page_id: 'page-123',
          archived: true,
        });

        expect(result).toEqual(mockResponse.data);
      });

      it('maps forbidden error to permission message', async () => {
        mockInvoke.mockResolvedValue({
          data: {
            success: false,
            error: 'Access denied',
            code: 'forbidden',
          },
          error: null,
        });

        const handler = createNotionHandler(() => ({
          userId: 'user-123',
        }));

        await expect(
          handler.mutate({
            type: 'page.create',
            parent: { database_id: 'db-123' },
            properties: {},
          }),
        ).rejects.toThrow('does not have permission');
      });
    });
  });

  describe('checkNotionConnection()', () => {
    it('returns connected: false when no integration exists', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await checkNotionConnection('user-123');

      expect(result).toEqual({ connected: false });
    });

    it('returns connected: true with workspace info when integration exists', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          provider_data: {
            workspace_name: 'My Workspace',
            workspace_icon: 'https://example.com/icon.png',
          },
          status: 'active',
        },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await checkNotionConnection('user-123');

      expect(result).toEqual({
        connected: true,
        workspaceName: 'My Workspace',
        workspaceIcon: 'https://example.com/icon.png',
      });
    });

    it('returns connected: false when status is not active', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          provider_data: { workspace_name: 'Test' },
          status: 'expired',
        },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await checkNotionConnection('user-123');

      expect(result).toEqual({ connected: false });
    });
  });

  describe('getWidgetNotionPermissions()', () => {
    it('returns hasAccess: false when no permissions exist', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockSingle,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getWidgetNotionPermissions('user-123', 'widget-abc');

      expect(result).toEqual({
        hasAccess: false,
        canWrite: false,
        allowedDatabases: [],
      });
    });

    it('returns permissions when they exist', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          can_read: true,
          can_write: true,
          allowed_resources: {
            databases: ['db-1', 'db-2'],
          },
        },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockSingle,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getWidgetNotionPermissions('user-123', 'widget-abc');

      expect(result).toEqual({
        hasAccess: true,
        canWrite: true,
        allowedDatabases: ['db-1', 'db-2'],
      });
    });
  });
});
