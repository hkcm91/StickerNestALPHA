/**
 * MCP Schema Tests
 *
 * @module @sn/types/mcp
 * @layer L0
 */

import { describe, it, expect } from 'vitest';

import {
  McpAuthTypeSchema,
  McpServerConfigSchema,
  McpToolDefinitionSchema,
  McpToolCallSchema,
  McpToolResultSchema,
  McpResourceSchema,
  McpResourceReadResultSchema,
  McpServerConfigJSONSchema,
  McpToolDefinitionJSONSchema,
  McpToolCallJSONSchema,
  McpToolResultJSONSchema,
  McpResourceJSONSchema,
  McpResourceReadResultJSONSchema,
} from './mcp';

describe('MCP Schemas', () => {
  describe('McpAuthTypeSchema', () => {
    it('accepts valid auth types', () => {
      expect(McpAuthTypeSchema.parse('none')).toBe('none');
      expect(McpAuthTypeSchema.parse('bearer')).toBe('bearer');
      expect(McpAuthTypeSchema.parse('api-key')).toBe('api-key');
    });

    it('rejects invalid auth types', () => {
      expect(() => McpAuthTypeSchema.parse('oauth')).toThrow();
    });
  });

  describe('McpServerConfigSchema', () => {
    it('accepts valid server config', () => {
      const config = {
        name: 'my-server',
        url: 'https://mcp.example.com/sse',
        authType: 'bearer',
        authToken: 'secret-token',
      };
      const result = McpServerConfigSchema.parse(config);
      expect(result.name).toBe('my-server');
      expect(result.url).toBe('https://mcp.example.com/sse');
      expect(result.authType).toBe('bearer');
      expect(result.authToken).toBe('secret-token');
    });

    it('defaults authType to none', () => {
      const config = {
        name: 'my-server',
        url: 'https://mcp.example.com/sse',
      };
      const result = McpServerConfigSchema.parse(config);
      expect(result.authType).toBe('none');
    });

    it('rejects empty name', () => {
      expect(() =>
        McpServerConfigSchema.parse({ name: '', url: 'https://example.com' }),
      ).toThrow();
    });

    it('rejects invalid URL', () => {
      expect(() =>
        McpServerConfigSchema.parse({ name: 'test', url: 'not-a-url' }),
      ).toThrow();
    });

    it('rejects names exceeding 128 characters', () => {
      expect(() =>
        McpServerConfigSchema.parse({
          name: 'a'.repeat(129),
          url: 'https://example.com',
        }),
      ).toThrow();
    });
  });

  describe('McpToolDefinitionSchema', () => {
    it('accepts valid tool definition', () => {
      const tool = {
        name: 'search',
        description: 'Search the web',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
      };
      const result = McpToolDefinitionSchema.parse(tool);
      expect(result.name).toBe('search');
      expect(result.description).toBe('Search the web');
    });

    it('accepts minimal tool definition (name only)', () => {
      const result = McpToolDefinitionSchema.parse({ name: 'ping' });
      expect(result.name).toBe('ping');
      expect(result.description).toBeUndefined();
    });

    it('rejects empty name', () => {
      expect(() => McpToolDefinitionSchema.parse({ name: '' })).toThrow();
    });
  });

  describe('McpToolCallSchema', () => {
    it('accepts valid tool call', () => {
      const call = {
        serverName: 'my-server',
        toolName: 'search',
        args: { query: 'hello' },
      };
      const result = McpToolCallSchema.parse(call);
      expect(result.serverName).toBe('my-server');
      expect(result.toolName).toBe('search');
      expect(result.args).toEqual({ query: 'hello' });
    });

    it('defaults args to empty object', () => {
      const result = McpToolCallSchema.parse({
        serverName: 'srv',
        toolName: 'ping',
      });
      expect(result.args).toEqual({});
    });
  });

  describe('McpToolResultSchema', () => {
    it('accepts successful result', () => {
      const result = McpToolResultSchema.parse({
        content: { answer: 42 },
        isError: false,
      });
      expect(result.content).toEqual({ answer: 42 });
      expect(result.isError).toBe(false);
    });

    it('accepts error result', () => {
      const result = McpToolResultSchema.parse({
        content: 'Something went wrong',
        isError: true,
      });
      expect(result.isError).toBe(true);
    });

    it('defaults isError to false', () => {
      const result = McpToolResultSchema.parse({ content: 'ok' });
      expect(result.isError).toBe(false);
    });
  });

  describe('McpResourceSchema', () => {
    it('accepts valid resource', () => {
      const resource = {
        uri: 'file:///data/readme.md',
        name: 'README',
        description: 'Project readme',
        mimeType: 'text/markdown',
      };
      const result = McpResourceSchema.parse(resource);
      expect(result.uri).toBe('file:///data/readme.md');
    });

    it('accepts minimal resource (uri only)', () => {
      const result = McpResourceSchema.parse({ uri: 'test://foo' });
      expect(result.uri).toBe('test://foo');
    });

    it('rejects empty uri', () => {
      expect(() => McpResourceSchema.parse({ uri: '' })).toThrow();
    });
  });

  describe('McpResourceReadResultSchema', () => {
    it('accepts valid read result', () => {
      const result = McpResourceReadResultSchema.parse({
        contents: [
          { uri: 'file:///data/readme.md', mimeType: 'text/markdown', text: '# Hello' },
        ],
      });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe('# Hello');
    });

    it('accepts blob content', () => {
      const result = McpResourceReadResultSchema.parse({
        contents: [
          { uri: 'file:///data/image.png', mimeType: 'image/png', blob: 'base64data' },
        ],
      });
      expect(result.contents[0].blob).toBe('base64data');
    });

    it('rejects missing contents array', () => {
      expect(() => McpResourceReadResultSchema.parse({})).toThrow();
    });
  });

  describe('JSON Schema exports', () => {
    it('exports valid JSON schemas for all MCP types', () => {
      for (const schema of [
        McpServerConfigJSONSchema,
        McpToolDefinitionJSONSchema,
        McpToolCallJSONSchema,
        McpToolResultJSONSchema,
        McpResourceJSONSchema,
        McpResourceReadResultJSONSchema,
      ]) {
        expect(schema).toBeDefined();
        expect(schema).toHaveProperty('type');
      }
    });
  });
});
