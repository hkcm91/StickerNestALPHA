/**
 * DataSource Bridge Handler Tests
 *
 * @module runtime/bridge
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import type { WidgetBridge } from './bridge';
import { handleDataSourceMessage } from './datasource-handler';
import type { WidgetMessage } from './message-types';
import { validateWidgetMessage } from './message-validator';

// Mock the kernel datasource module
vi.mock('../../kernel/datasource', () => ({
  createDataSource: vi.fn().mockResolvedValue({ success: true, data: { id: 'ds-1', type: 'table' } }),
  readDataSource: vi.fn().mockResolvedValue({ success: true, data: { id: 'ds-1', type: 'table' } }),
  updateDataSource: vi.fn().mockResolvedValue({ success: true, data: { id: 'ds-1', type: 'table' } }),
  deleteDataSource: vi.fn().mockResolvedValue({ success: true, data: null }),
  listDataSources: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'ds-1' }] }),
  queryTableRows: vi.fn().mockResolvedValue({ success: true, data: { rows: [], total: 0 } }),
  addRow: vi.fn().mockResolvedValue({ success: true, data: { id: 'row-1' } }),
  updateRow: vi.fn().mockResolvedValue({ success: true, data: { id: 'row-1' } }),
  deleteRow: vi.fn().mockResolvedValue({ success: true, data: null }),
}));

// Mock auth store
vi.mock('../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'test-user-id' } }),
  },
}));

function createMockBridge(): WidgetBridge & { sentMessages: unknown[] } {
  const sentMessages: unknown[] = [];
  return {
    send(message: unknown) {
      sentMessages.push(message);
    },
    onMessage: vi.fn(),
    isReady: () => true,
    destroy: vi.fn(),
    sentMessages,
  };
}

function registerWidgetWithPermissions(widgetId: string, permissions: string[]) {
  const ws = useWidgetStore.getState();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ws.registerWidget({
    widgetId,
    manifest: {
      id: widgetId,
      name: widgetId,
      version: '1.0.0',
      license: 'MIT',
      tags: [],
      category: 'utilities',
      permissions,
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
      entry: 'index.html',
      crossCanvasChannels: [],
      spatialSupport: false,
    } as any,
    htmlContent: '<html></html>',
    isBuiltIn: false,
    installedAt: new Date().toISOString(),
  });
}

describe('DataSource Bridge Handler', () => {
  beforeEach(() => {
    const ws = useWidgetStore.getState();
    // Clear widget registry
    for (const key of Object.keys(ws.registry)) {
      ws.unregisterWidget(key);
    }
  });

  describe('permission enforcement', () => {
    it('rejects DS_READ without datasource permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', []);

      const handled = handleDataSourceMessage(
        { type: 'DS_READ', requestId: 'r1', dataSourceId: 'ds-1' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      expect(handled).toBe(true);
      expect(bridge.sentMessages).toHaveLength(1);
      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'DS_RESPONSE',
        requestId: 'r1',
        error: expect.stringContaining('datasource permission'),
      });
    });

    it('allows DS_READ with datasource permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource']);

      handleDataSourceMessage(
        { type: 'DS_READ', requestId: 'r1', dataSourceId: 'ds-1' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      // Wait for async operation
      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
        expect(bridge.sentMessages[0]).toMatchObject({
          type: 'DS_RESPONSE',
          requestId: 'r1',
          result: { id: 'ds-1', type: 'table' },
        });
      });
    });

    it('rejects DS_CREATE without datasource-write permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource']);

      handleDataSourceMessage(
        { type: 'DS_CREATE', requestId: 'r1', dsType: 'table', scope: 'canvas' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'DS_RESPONSE',
        requestId: 'r1',
        error: expect.stringContaining('datasource-write'),
      });
    });

    it('allows DS_CREATE with both datasource and datasource-write permissions', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource', 'datasource-write']);

      handleDataSourceMessage(
        { type: 'DS_CREATE', requestId: 'r1', dsType: 'table', scope: 'canvas' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
        expect(bridge.sentMessages[0]).toMatchObject({
          type: 'DS_RESPONSE',
          requestId: 'r1',
          result: { id: 'ds-1' },
        });
      });
    });

    it('rejects DS_DELETE without datasource-write permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource']);

      handleDataSourceMessage(
        { type: 'DS_DELETE', requestId: 'r1', dataSourceId: 'ds-1' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'DS_RESPONSE',
        error: expect.stringContaining('datasource-write'),
      });
    });
  });

  describe('table operations', () => {
    it('handles DS_TABLE_GET_ROWS with datasource permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource']);

      handleDataSourceMessage(
        { type: 'DS_TABLE_GET_ROWS', requestId: 'r1', dataSourceId: 'ds-1' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
        expect(bridge.sentMessages[0]).toMatchObject({
          type: 'DS_RESPONSE',
          requestId: 'r1',
          result: { rows: [], total: 0 },
        });
      });
    });

    it('rejects DS_TABLE_ADD_ROW without datasource-write permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource']);

      handleDataSourceMessage(
        { type: 'DS_TABLE_ADD_ROW', requestId: 'r1', dataSourceId: 'ds-1', row: { name: 'test' } } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'DS_RESPONSE',
        error: expect.stringContaining('datasource-write'),
      });
    });

    it('allows DS_TABLE_ADD_ROW with datasource-write permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource', 'datasource-write']);

      handleDataSourceMessage(
        { type: 'DS_TABLE_ADD_ROW', requestId: 'r1', dataSourceId: 'ds-1', row: { name: 'test' } } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
        expect(bridge.sentMessages[0]).toMatchObject({
          type: 'DS_RESPONSE',
          requestId: 'r1',
          result: { id: 'row-1' },
        });
      });
    });
  });

  describe('message returns false for non-DS messages', () => {
    it('returns false for EMIT message', () => {
      const bridge = createMockBridge();
      const handled = handleDataSourceMessage(
        { type: 'EMIT', eventType: 'test', payload: {} } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );
      expect(handled).toBe(false);
    });

    it('returns false for READY message', () => {
      const bridge = createMockBridge();
      const handled = handleDataSourceMessage(
        { type: 'READY' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );
      expect(handled).toBe(false);
    });
  });

  describe('message validation', () => {
    it('validates DS_CREATE message shape', () => {
      const msg = validateWidgetMessage({
        type: 'DS_CREATE',
        requestId: 'r1',
        dsType: 'table',
        scope: 'canvas',
      });
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('DS_CREATE');
    });

    it('validates DS_READ message shape', () => {
      const msg = validateWidgetMessage({
        type: 'DS_READ',
        requestId: 'r1',
        dataSourceId: 'ds-123',
      });
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('DS_READ');
    });

    it('validates DS_TABLE_ADD_ROW message shape', () => {
      const msg = validateWidgetMessage({
        type: 'DS_TABLE_ADD_ROW',
        requestId: 'r1',
        dataSourceId: 'ds-1',
        row: { name: 'test', value: 42 },
      });
      expect(msg).not.toBeNull();
    });

    it('rejects DS_READ without requestId', () => {
      const msg = validateWidgetMessage({
        type: 'DS_READ',
        dataSourceId: 'ds-1',
      });
      expect(msg).toBeNull();
    });

    it('rejects malformed DS message', () => {
      const msg = validateWidgetMessage({
        type: 'DS_CREATE',
        // missing requestId and dsType
      });
      expect(msg).toBeNull();
    });
  });

  describe('DS_LIST operation', () => {
    it('lists datasources with datasource permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource']);

      handleDataSourceMessage(
        { type: 'DS_LIST', requestId: 'r1' } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
        expect(bridge.sentMessages[0]).toMatchObject({
          type: 'DS_RESPONSE',
          requestId: 'r1',
          result: [{ id: 'ds-1' }],
        });
      });
    });
  });

  describe('DS_UPDATE operation', () => {
    it('rejects update without datasource-write', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['datasource']);

      handleDataSourceMessage(
        {
          type: 'DS_UPDATE',
          requestId: 'r1',
          dataSourceId: 'ds-1',
          updates: { metadata: { name: 'updated' } },
        } as WidgetMessage,
        { widgetId: 'test-widget', bridge },
      );

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'DS_RESPONSE',
        error: expect.stringContaining('datasource-write'),
      });
    });
  });
});
