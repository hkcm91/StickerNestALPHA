/**
 * MCP Proxy Handler Tests
 *
 * @module runtime/mcp
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import type { WidgetBridge } from '../bridge/bridge';
import type { WidgetMessage } from '../bridge/message-types';

import { handleMcpMessage } from './mcp-proxy';

// Mock the kernel bus
vi.mock('../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock fetch for MCP server requests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerWidgetWithPermissions(widgetId: string, permissions: string[], mcpServers?: any[]) {
  const ws = useWidgetStore.getState();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    htmlContent: '<html></html>',
    isBuiltIn: false,
    installedAt: new Date().toISOString(),
  });

  // Add widget instance with MCP server config
  if (mcpServers) {
    ws.addInstance({
      instanceId: 'inst-1',
      widgetId,
      canvasId: 'canvas-1',
      state: {},
      config: { mcpServers },
    });
  }
}

function jsonRpcResponse(result: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result }),
  };
}

function jsonRpcError(message: string) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, error: { message } }),
  };
}

describe('MCP Proxy Handler', () => {
  beforeEach(() => {
    const ws = useWidgetStore.getState();
    // Clear widget registry and instances
    for (const key of Object.keys(ws.registry)) {
      ws.unregisterWidget(key);
    }
    for (const key of Object.keys(ws.instances)) {
      ws.removeInstance(key);
    }
    mockFetch.mockReset();
  });

  describe('permission enforcement', () => {
    it('rejects MCP_TOOL_CALL without mcp permission', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', []);

      const handled = handleMcpMessage(
        { type: 'MCP_TOOL_CALL', requestId: 'r1', serverName: 'srv', toolName: 'ping', args: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(handled).toBe(true);
      expect(bridge.sentMessages).toHaveLength(1);
      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r1',
        result: null,
        error: expect.stringContaining('mcp permission'),
      });
    });

    it('rejects MCP_LIST_TOOLS without mcp permission', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['storage']);

      const handled = handleMcpMessage(
        { type: 'MCP_LIST_TOOLS', requestId: 'r2', serverName: 'srv' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(handled).toBe(true);
      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r2',
        error: expect.stringContaining('mcp permission'),
      });
    });

    it('rejects MCP_RESOURCE_READ without mcp permission', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', []);

      const handled = handleMcpMessage(
        { type: 'MCP_RESOURCE_READ', requestId: 'r3', serverName: 'srv', uri: 'test://foo' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(handled).toBe(true);
      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r3',
        error: expect.stringContaining('mcp permission'),
      });
    });

    it('rejects MCP_LIST_RESOURCES without mcp permission', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', []);

      const handled = handleMcpMessage(
        { type: 'MCP_LIST_RESOURCES', requestId: 'r4', serverName: 'srv' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(handled).toBe(true);
      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r4',
        error: expect.stringContaining('mcp permission'),
      });
    });
  });

  describe('server not found', () => {
    it('returns error when MCP server is not configured', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], [
        { name: 'other-server', url: 'https://other.com', authType: 'none' },
      ]);

      handleMcpMessage(
        { type: 'MCP_TOOL_CALL', requestId: 'r1', serverName: 'missing-server', toolName: 'ping', args: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r1',
        error: expect.stringContaining('not configured'),
      });
    });

    it('returns error when no mcpServers config exists', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp']);
      // Add instance without mcpServers config
      const ws = useWidgetStore.getState();
      ws.addInstance({
        instanceId: 'inst-1',
        widgetId: 'test-widget',
        canvasId: 'canvas-1',
        state: {},
        config: {},
      });

      handleMcpMessage(
        { type: 'MCP_TOOL_CALL', requestId: 'r1', serverName: 'srv', toolName: 'ping', args: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r1',
        error: expect.stringContaining('not configured'),
      });
    });
  });

  describe('successful proxy', () => {
    const mcpServers = [
      { name: 'test-server', url: 'https://mcp.example.com', authType: 'bearer' as const, authToken: 'tok123' },
    ];

    it('proxies MCP_TOOL_CALL to the server and returns result', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], mcpServers);

      mockFetch.mockResolvedValueOnce(jsonRpcResponse({ content: [{ type: 'text', text: 'pong' }] }));

      handleMcpMessage(
        { type: 'MCP_TOOL_CALL', requestId: 'r1', serverName: 'test-server', toolName: 'ping', args: { msg: 'hello' } } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      // Wait for async fetch to resolve
      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r1',
        result: { content: [{ type: 'text', text: 'pong' }] },
      });

      // Verify fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledWith(
        'https://mcp.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer tok123',
            'Content-Type': 'application/json',
          }),
        }),
      );

      // Verify JSON-RPC body
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toMatchObject({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'ping', arguments: { msg: 'hello' } },
      });
    });

    it('proxies MCP_LIST_TOOLS to the server', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], mcpServers);

      const tools = { tools: [{ name: 'search', description: 'Search' }] };
      mockFetch.mockResolvedValueOnce(jsonRpcResponse(tools));

      handleMcpMessage(
        { type: 'MCP_LIST_TOOLS', requestId: 'r2', serverName: 'test-server' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r2',
        result: tools,
      });
    });

    it('proxies MCP_RESOURCE_READ to the server', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], mcpServers);

      const contents = { contents: [{ uri: 'file:///test', text: 'hello' }] };
      mockFetch.mockResolvedValueOnce(jsonRpcResponse(contents));

      handleMcpMessage(
        { type: 'MCP_RESOURCE_READ', requestId: 'r3', serverName: 'test-server', uri: 'file:///test' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r3',
        result: contents,
      });
    });

    it('proxies MCP_LIST_RESOURCES to the server', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], mcpServers);

      const resources = { resources: [{ uri: 'file:///data', name: 'Data' }] };
      mockFetch.mockResolvedValueOnce(jsonRpcResponse(resources));

      handleMcpMessage(
        { type: 'MCP_LIST_RESOURCES', requestId: 'r4', serverName: 'test-server' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r4',
        result: resources,
      });
    });
  });

  describe('error handling', () => {
    const mcpServers = [
      { name: 'test-server', url: 'https://mcp.example.com', authType: 'none' as const },
    ];

    it('handles JSON-RPC error response', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], mcpServers);

      mockFetch.mockResolvedValueOnce(jsonRpcError('Tool not found'));

      handleMcpMessage(
        { type: 'MCP_TOOL_CALL', requestId: 'r1', serverName: 'test-server', toolName: 'missing', args: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r1',
        result: null,
        error: 'Tool not found',
      });
    });

    it('handles HTTP error from server', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], mcpServers);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      handleMcpMessage(
        { type: 'MCP_TOOL_CALL', requestId: 'r1', serverName: 'test-server', toolName: 'ping', args: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r1',
        result: null,
        error: expect.stringContaining('503'),
      });
    });

    it('handles network failure', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], mcpServers);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      handleMcpMessage(
        { type: 'MCP_TOOL_CALL', requestId: 'r1', serverName: 'test-server', toolName: 'ping', args: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'MCP_RESPONSE',
        requestId: 'r1',
        result: null,
        error: 'Network error',
      });
    });
  });

  describe('auth header construction', () => {
    it('sends bearer token in Authorization header', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], [
        { name: 'srv', url: 'https://example.com', authType: 'bearer', authToken: 'my-token' },
      ]);

      mockFetch.mockResolvedValueOnce(jsonRpcResponse(null));

      handleMcpMessage(
        { type: 'MCP_LIST_TOOLS', requestId: 'r1', serverName: 'srv' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
        'Authorization': 'Bearer my-token',
      });
    });

    it('sends api-key in X-API-Key header', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], [
        { name: 'srv', url: 'https://example.com', authType: 'api-key', authToken: 'key-123' },
      ]);

      mockFetch.mockResolvedValueOnce(jsonRpcResponse(null));

      handleMcpMessage(
        { type: 'MCP_LIST_TOOLS', requestId: 'r1', serverName: 'srv' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
        'X-API-Key': 'key-123',
      });
    });

    it('sends no auth header for authType none', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['mcp'], [
        { name: 'srv', url: 'https://example.com', authType: 'none' },
      ]);

      mockFetch.mockResolvedValueOnce(jsonRpcResponse(null));

      handleMcpMessage(
        { type: 'MCP_LIST_TOOLS', requestId: 'r1', serverName: 'srv' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers).not.toHaveProperty('Authorization');
      expect(headers).not.toHaveProperty('X-API-Key');
    });
  });

  describe('unhandled message types', () => {
    it('returns false for non-MCP messages', () => {
      const bridge = createMockBridge();
      const handled = handleMcpMessage(
        { type: 'EMIT', eventType: 'test', payload: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );
      expect(handled).toBe(false);
      expect(bridge.sentMessages).toHaveLength(0);
    });
  });
});
