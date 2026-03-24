/**
 * Bridge Protocol Message Types
 *
 * Defines all typed messages between host and widget iframes.
 * ALL messages are validated with Zod schemas before processing.
 *
 * @module runtime/bridge
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * Theme tokens injected into widgets.
 */
export interface ThemeTokens {
  '--sn-bg': string;
  '--sn-surface': string;
  '--sn-accent': string;
  '--sn-text': string;
  '--sn-text-muted': string;
  '--sn-border': string;
  '--sn-radius': string;
  '--sn-font-family': string;
}

/**
 * Messages sent FROM Host TO Widget iframe.
 */
export type HostMessage =
  | { type: 'INIT'; widgetId: string; instanceId: string; config: Record<string, unknown>; theme: ThemeTokens }
  | { type: 'EVENT'; event: { type: string; payload: unknown } }
  | { type: 'CONFIG_UPDATE'; config: Record<string, unknown> }
  | { type: 'THEME_UPDATE'; theme: ThemeTokens }
  | { type: 'RESIZE'; width: number; height: number }
  | { type: 'STATE_RESPONSE'; key: string; value: unknown }
  | { type: 'STATE_REJECTED'; key: string; reason: string }
  | { type: 'INTEGRATION_RESPONSE'; requestId: string; result: unknown; error?: string }
  | { type: 'CROSS_CANVAS_EVENT'; channel: string; payload: unknown }
  | { type: 'DS_RESPONSE'; requestId: string; result: unknown; error?: string }
  | { type: 'MCP_RESPONSE'; requestId: string; result: unknown; error?: string }
  | { type: 'DESTROY' };

/**
 * Messages sent FROM Widget iframe TO Host.
 */
export type WidgetMessage =
  | { type: 'READY' }
  | { type: 'REGISTER'; manifest: unknown }
  | { type: 'EMIT'; eventType: string; payload: unknown }
  | { type: 'SUBSCRIBE'; eventType: string }
  | { type: 'UNSUBSCRIBE'; eventType: string }
  | { type: 'SET_STATE'; key: string; value: unknown }
  | { type: 'GET_STATE'; key: string }
  | { type: 'SET_USER_STATE'; key: string; value: unknown }
  | { type: 'GET_USER_STATE'; key: string }
  | { type: 'RESIZE_REQUEST'; width: number; height: number }
  | { type: 'LOG'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'INTEGRATION_QUERY'; requestId: string; name: string; params: unknown }
  | { type: 'INTEGRATION_MUTATE'; requestId: string; name: string; params: unknown }
  | { type: 'CROSS_CANVAS_EMIT'; channel: string; payload: unknown }
  | { type: 'CROSS_CANVAS_SUBSCRIBE'; channel: string }
  | { type: 'CROSS_CANVAS_UNSUBSCRIBE'; channel: string }
  | { type: 'DS_CREATE'; requestId: string; dsType: string; scope: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown> }
  | { type: 'DS_READ'; requestId: string; dataSourceId: string }
  | { type: 'DS_UPDATE'; requestId: string; dataSourceId: string; updates: Record<string, unknown>; lastSeenRevision?: number }
  | { type: 'DS_DELETE'; requestId: string; dataSourceId: string }
  | { type: 'DS_LIST'; requestId: string; scope?: string; dsType?: string }
  | { type: 'DS_TABLE_GET_ROWS'; requestId: string; dataSourceId: string; options?: Record<string, unknown> }
  | { type: 'DS_TABLE_ADD_ROW'; requestId: string; dataSourceId: string; row: Record<string, unknown> }
  | { type: 'DS_TABLE_UPDATE_ROW'; requestId: string; dataSourceId: string; rowId: string; updates: Record<string, unknown>; lastSeenRevision?: number }
  | { type: 'DS_TABLE_DELETE_ROW'; requestId: string; dataSourceId: string; rowId: string }
  | { type: 'MCP_TOOL_CALL'; requestId: string; serverName: string; toolName: string; args: Record<string, unknown> }
  | { type: 'MCP_RESOURCE_READ'; requestId: string; serverName: string; uri: string }
  | { type: 'MCP_LIST_TOOLS'; requestId: string; serverName: string }
  | { type: 'MCP_LIST_RESOURCES'; requestId: string; serverName: string };
