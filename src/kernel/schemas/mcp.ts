/**
 * MCP (Model Context Protocol) Schemas
 *
 * Defines schemas for MCP server configuration, tool calls, tool results,
 * and resource reads. Used by the runtime MCP proxy to validate widget
 * requests for MCP server interactions.
 *
 * @module @sn/types/mcp
 * @layer L0
 */

import { z } from 'zod';

// =============================================================================
// MCP Server Configuration
// =============================================================================

/**
 * Authentication type for connecting to an MCP server.
 */
export const McpAuthTypeSchema = z.enum(['none', 'bearer', 'api-key']);
export type McpAuthType = z.infer<typeof McpAuthTypeSchema>;

/**
 * Configuration for a single MCP server that a widget can connect to.
 * Stored in widget instance config under `mcpServers`.
 */
export const McpServerConfigSchema = z.object({
  /** Unique name to reference this server (e.g., 'my-tools') */
  name: z.string().min(1).max(128),
  /** Server URL (HTTP/SSE endpoint) */
  url: z.string().url(),
  /** Authentication type */
  authType: McpAuthTypeSchema.default('none'),
  /**
   * Auth token (bearer token or API key).
   * NEVER sent to the widget iframe — only used by the host-side proxy.
   */
  authToken: z.string().optional(),
});
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// =============================================================================
// MCP Tool Definitions
// =============================================================================

/**
 * A tool definition as returned by an MCP server's `tools/list` endpoint.
 */
export const McpToolDefinitionSchema = z.object({
  /** Tool name */
  name: z.string().min(1),
  /** Human-readable description */
  description: z.string().optional(),
  /** JSON Schema describing the tool's input parameters */
  inputSchema: z.record(z.string(), z.unknown()).optional(),
});
export type McpToolDefinition = z.infer<typeof McpToolDefinitionSchema>;

// =============================================================================
// MCP Tool Call / Result
// =============================================================================

/**
 * A tool call request from a widget to an MCP server.
 */
export const McpToolCallSchema = z.object({
  /** Target MCP server name (matches McpServerConfig.name) */
  serverName: z.string().min(1),
  /** Tool to invoke */
  toolName: z.string().min(1),
  /** Arguments to pass to the tool */
  args: z.record(z.string(), z.unknown()).default({}),
});
export type McpToolCall = z.infer<typeof McpToolCallSchema>;

/**
 * Result returned from an MCP tool call.
 */
export const McpToolResultSchema = z.object({
  /** Result content from the tool */
  content: z.unknown(),
  /** Whether the tool call resulted in an error */
  isError: z.boolean().default(false),
});
export type McpToolResult = z.infer<typeof McpToolResultSchema>;

// =============================================================================
// MCP Resource
// =============================================================================

/**
 * An MCP resource definition as returned by a server's `resources/list` endpoint.
 */
export const McpResourceSchema = z.object({
  /** Resource URI */
  uri: z.string().min(1),
  /** Human-readable name */
  name: z.string().optional(),
  /** Description of the resource */
  description: z.string().optional(),
  /** MIME type of the resource content */
  mimeType: z.string().optional(),
});
export type McpResource = z.infer<typeof McpResourceSchema>;

/**
 * Result returned from reading an MCP resource.
 */
export const McpResourceReadResultSchema = z.object({
  /** Resource content */
  contents: z.array(z.object({
    uri: z.string(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
    blob: z.string().optional(),
  })),
});
export type McpResourceReadResult = z.infer<typeof McpResourceReadResultSchema>;

// =============================================================================
// JSON Schema exports
// =============================================================================

export const McpServerConfigJSONSchema = McpServerConfigSchema.toJSONSchema();
export const McpToolDefinitionJSONSchema = McpToolDefinitionSchema.toJSONSchema();
export const McpToolCallJSONSchema = McpToolCallSchema.toJSONSchema();
export const McpToolResultJSONSchema = McpToolResultSchema.toJSONSchema();
export const McpResourceJSONSchema = McpResourceSchema.toJSONSchema();
export const McpResourceReadResultJSONSchema = McpResourceReadResultSchema.toJSONSchema();
