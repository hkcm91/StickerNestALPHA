/**
 * MCP Proxy Handler
 *
 * Host-side handler for MCP (Model Context Protocol) operations from widgets.
 * Enforces permission checks before proxying tool calls and resource reads
 * to user-configured MCP servers. Widgets never hold MCP credentials.
 *
 * @module runtime/mcp
 * @layer L3
 */

import type { McpServerConfig } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import type { WidgetBridge } from '../bridge/bridge';
import type { WidgetMessage } from '../bridge/message-types';

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether a widget has the 'mcp' permission.
 */
function hasMcpPermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('mcp') ?? false;
}

// ---------------------------------------------------------------------------
// Server config resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an MCP server configuration by name from the widget instance config.
 */
function resolveServerConfig(
  instanceId: string,
  serverName: string,
): McpServerConfig | null {
  const ws = useWidgetStore.getState();
  const instance = ws.instances[instanceId];
  const config = instance?.config ?? {};

  // MCP servers are configured in the widget instance config under `mcpServers`
  const mcpServers = config.mcpServers as McpServerConfig[] | undefined;
  if (!Array.isArray(mcpServers)) {
    return null;
  }

  return mcpServers.find((s) => s.name === serverName) ?? null;
}

// ---------------------------------------------------------------------------
// HTTP transport helpers
// ---------------------------------------------------------------------------

/** Default timeout for MCP server requests: 30 seconds */
const MCP_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Builds authorization headers for an MCP server request.
 */
function buildAuthHeaders(server: McpServerConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (server.authType === 'bearer' && server.authToken) {
    headers['Authorization'] = `Bearer ${server.authToken}`;
  } else if (server.authType === 'api-key' && server.authToken) {
    headers['X-API-Key'] = server.authToken;
  }

  return headers;
}

/**
 * Makes a JSON-RPC request to an MCP server over HTTP.
 */
async function mcpRequest(
  server: McpServerConfig,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MCP_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: buildAuthHeaders(server),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`MCP server responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as { result?: unknown; error?: { message: string; code?: number } };

    if (json.error) {
      throw new Error(json.error.message ?? 'MCP server returned an error');
    }

    return json.result;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function sendMcpResponse(
  bridge: WidgetBridge,
  requestId: string,
  result: unknown,
  error?: string,
): void {
  bridge.send({ type: 'MCP_RESPONSE', requestId, result, error });
}

function sendMcpError(
  bridge: WidgetBridge,
  requestId: string,
  error: string,
): void {
  bridge.send({ type: 'MCP_RESPONSE', requestId, result: null, error });
}

// ---------------------------------------------------------------------------
// Handler context
// ---------------------------------------------------------------------------

interface McpHandlerContext {
  widgetId: string;
  instanceId: string;
  bridge: WidgetBridge;
}

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

/**
 * Handles an MCP message from a widget iframe.
 * Returns true if the message was handled, false otherwise.
 */
export function handleMcpMessage(
  message: WidgetMessage,
  ctx: McpHandlerContext,
): boolean {
  const { widgetId, instanceId, bridge } = ctx;

  switch (message.type) {
    case 'MCP_TOOL_CALL': {
      if (!hasMcpPermission(widgetId)) {
        sendMcpError(bridge, message.requestId, 'Permission denied: widget lacks mcp permission');
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'permission_denied' });
        return true;
      }

      const server = resolveServerConfig(instanceId, message.serverName);
      if (!server) {
        sendMcpError(bridge, message.requestId, `MCP server "${message.serverName}" is not configured`);
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'server_not_found' });
        return true;
      }

      mcpRequest(server, 'tools/call', {
        name: message.toolName,
        arguments: message.args,
      })
        .then((result) => {
          sendMcpResponse(bridge, message.requestId, result);
          bus.emit('mcp.tool.called', {
            instanceId,
            serverName: message.serverName,
            toolName: message.toolName,
          });
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          sendMcpError(bridge, message.requestId, errorMsg);
          bus.emit('mcp.error', {
            instanceId,
            serverName: message.serverName,
            reason: 'tool_call_failed',
            error: errorMsg,
          });
        });
      return true;
    }

    case 'MCP_RESOURCE_READ': {
      if (!hasMcpPermission(widgetId)) {
        sendMcpError(bridge, message.requestId, 'Permission denied: widget lacks mcp permission');
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'permission_denied' });
        return true;
      }

      const server = resolveServerConfig(instanceId, message.serverName);
      if (!server) {
        sendMcpError(bridge, message.requestId, `MCP server "${message.serverName}" is not configured`);
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'server_not_found' });
        return true;
      }

      mcpRequest(server, 'resources/read', { uri: message.uri })
        .then((result) => {
          sendMcpResponse(bridge, message.requestId, result);
          bus.emit('mcp.resource.read', {
            instanceId,
            serverName: message.serverName,
            uri: message.uri,
          });
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          sendMcpError(bridge, message.requestId, errorMsg);
          bus.emit('mcp.error', {
            instanceId,
            serverName: message.serverName,
            reason: 'resource_read_failed',
            error: errorMsg,
          });
        });
      return true;
    }

    case 'MCP_LIST_TOOLS': {
      if (!hasMcpPermission(widgetId)) {
        sendMcpError(bridge, message.requestId, 'Permission denied: widget lacks mcp permission');
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'permission_denied' });
        return true;
      }

      const server = resolveServerConfig(instanceId, message.serverName);
      if (!server) {
        sendMcpError(bridge, message.requestId, `MCP server "${message.serverName}" is not configured`);
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'server_not_found' });
        return true;
      }

      mcpRequest(server, 'tools/list')
        .then((result) => {
          sendMcpResponse(bridge, message.requestId, result);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          sendMcpError(bridge, message.requestId, errorMsg);
          bus.emit('mcp.error', {
            instanceId,
            serverName: message.serverName,
            reason: 'list_tools_failed',
            error: errorMsg,
          });
        });
      return true;
    }

    case 'MCP_LIST_RESOURCES': {
      if (!hasMcpPermission(widgetId)) {
        sendMcpError(bridge, message.requestId, 'Permission denied: widget lacks mcp permission');
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'permission_denied' });
        return true;
      }

      const server = resolveServerConfig(instanceId, message.serverName);
      if (!server) {
        sendMcpError(bridge, message.requestId, `MCP server "${message.serverName}" is not configured`);
        bus.emit('mcp.error', { instanceId, serverName: message.serverName, reason: 'server_not_found' });
        return true;
      }

      mcpRequest(server, 'resources/list')
        .then((result) => {
          sendMcpResponse(bridge, message.requestId, result);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          sendMcpError(bridge, message.requestId, errorMsg);
          bus.emit('mcp.error', {
            instanceId,
            serverName: message.serverName,
            reason: 'list_resources_failed',
            error: errorMsg,
          });
        });
      return true;
    }

    default:
      return false;
  }
}
