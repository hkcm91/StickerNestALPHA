#!/usr/bin/env node
/**
 * MCP HTTP Server
 *
 * Wraps the stickernest-dev MCP server with an HTTP JSON-RPC transport
 * so the MCP Explorer widget can connect to it from the browser.
 *
 * Usage:
 *   cd mcp-dev && npx tsx src/http-server.ts
 *   # → MCP HTTP server on http://localhost:3100
 *
 * Then in the MCP Explorer widget, add a server:
 *   Name: stickernest-dev
 *   URL:  http://localhost:3100
 *   Auth: None
 */

import { createServer } from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { initBroadcaster, broadcast, type StateProvider } from './state-broadcaster.js';
import { generateCanvasPage, type CanvasPageState } from './canvas-page.js';
import { generateThemeCss, getThemeTokens, entityToHtml } from './renderer.js';

const PORT = Number(process.env.MCP_HTTP_PORT) || 3100;

// ---------------------------------------------------------------------------
// We need to import the tool/resource handlers from the main server.
// Since the main server file sets up stdio transport and auto-starts,
// we instead create a lightweight in-process handler that delegates
// JSON-RPC method calls to the MCP SDK server via direct invocation.
//
// The approach: start the MCP server with an in-memory transport pair,
// then route HTTP requests into it.
// ---------------------------------------------------------------------------

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

async function main() {
  // Dynamically import the server setup — we need to prevent it from
  // connecting to stdio. Instead we'll spawn it with InMemoryTransport.
  // Since the main index.ts auto-connects to stdio, we create a fresh
  // server by importing the SDK and re-running the setup.
  //
  // For simplicity, we use a child process approach: spawn the stdio
  // server and proxy HTTP ↔ stdio.

  const { spawn } = await import('child_process');
  const { resolve, dirname } = await import('path');
  const { fileURLToPath } = await import('url');

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const serverScript = resolve(__dirname, 'index.ts');

  // Spawn the stdio MCP server as a child process
  const child = spawn('npx', ['tsx', serverScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    cwd: resolve(__dirname, '..'),
  });

  child.stderr?.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error(`[mcp-child] ${msg}`);
  });

  child.on('exit', (code) => {
    console.error(`MCP child process exited with code ${code}`);
    process.exit(1);
  });

  let requestId = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  // Buffer incoming data from child stdout (JSON-RPC responses)
  let buffer = '';
  child.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString();
    // JSON-RPC messages are newline-delimited
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && pending.has(msg.id)) {
          const p = pending.get(msg.id)!;
          pending.delete(msg.id);
          if (msg.error) {
            p.reject(new Error(msg.error.message ?? 'MCP error'));
          } else {
            p.resolve(msg.result);
          }
        }
      } catch {
        // Not JSON, ignore
      }
    }
  });

  function sendToChild(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      pending.set(id, { resolve, reject });
      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      child.stdin?.write(msg);

      // Timeout after 30s
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30_000);
    });
  }

  // Wait for child to start
  await new Promise<void>((resolve) => {
    const onData = (d: Buffer) => {
      if (d.toString().includes('running')) {
        child.stderr?.off('data', onData);
        resolve();
      }
    };
    child.stderr?.on('data', onData);
    // Also resolve after 2s if no message
    setTimeout(resolve, 2000);
  });

  // ---------------------------------------------------------------------------
  // Canvas state fetching (calls MCP tools on child process)
  // ---------------------------------------------------------------------------

  async function fetchCanvasState(): Promise<CanvasPageState> {
    try {
      const [entitiesResult, viewportResult, uiResult, widgetResult] = await Promise.all([
        sendToChild('tools/call', { name: 'canvas_list_entities', arguments: {} }),
        sendToChild('tools/call', { name: 'viewport_get', arguments: {} }),
        sendToChild('tools/call', { name: 'ui_get', arguments: {} }),
        sendToChild('tools/call', { name: 'widget_list', arguments: {} }),
      ]);

      const parseText = (result: unknown): unknown => {
        const r = result as { content?: Array<{ text?: string }> };
        const text = r?.content?.[0]?.text ?? '{}';
        try { return JSON.parse(text); } catch { return {}; }
      };

      const entitiesParsed = parseText(entitiesResult);
      const viewportData = parseText(viewportResult) as Record<string, unknown>;
      const uiData = parseText(uiResult) as Record<string, unknown>;
      const widgetsParsed = parseText(widgetResult);

      // canvas_list_entities returns a raw array; widget_list returns a raw array
      const entities = Array.isArray(entitiesParsed) ? entitiesParsed : [];
      const widgetInstances = Array.isArray(widgetsParsed) ? widgetsParsed : [];

      // Fetch widget HTML for all widget entities
      const widgetHtmlMap: Record<string, string> = {};
      const widgetIds = new Set<string>();
      for (const e of entities) {
        if ((e as any).type === 'widget' && (e as any).widgetId) {
          widgetIds.add((e as any).widgetId);
        }
      }
      if (widgetIds.size > 0) {
        const htmlResults = await Promise.all(
          Array.from(widgetIds).map(async (wid) => {
            try {
              const r = await sendToChild('tools/call', { name: 'widget_edit_html', arguments: { widgetId: wid } });
              const text = (r as any)?.content?.[0]?.text;
              if (text && !(r as any)?.isError) return { wid, html: text };
            } catch {}
            return null;
          })
        );
        for (const r of htmlResults) {
          if (r) widgetHtmlMap[r.wid] = r.html;
        }
      }

      return {
        entities: entities as CanvasPageState['entities'],
        viewport: {
          offset: { x: ((viewportData.offset as any)?.x ?? 0), y: ((viewportData.offset as any)?.y ?? 0) },
          zoom: (viewportData.zoom as number) ?? 1,
          width: (viewportData.width as number) ?? 800,
          height: (viewportData.height as number) ?? 600,
        },
        widgetHtmlMap,
        widgetInstances: widgetInstances as CanvasPageState['widgetInstances'],
        theme: (uiData.theme as string) ?? 'midnight-aurora',
        selectedIds: [],
      };
    } catch (err) {
      console.error('[canvas] Failed to fetch state:', err);
      return {
        entities: [], viewport: { offset: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 },
        widgetHtmlMap: {}, widgetInstances: [], theme: 'midnight-aurora', selectedIds: [],
      };
    }
  }

  // ---------------------------------------------------------------------------
  // State-change broadcasting
  // ---------------------------------------------------------------------------

  const STATE_CHANGING_TOOLS = new Set([
    'canvas_add_entity', 'canvas_update_entity', 'canvas_remove_entity',
    'canvas_clear', 'canvas_group', 'canvas_ungroup', 'canvas_reorder',
    'canvas_setup_commerce',
    'widget_create_html', 'widget_set_html', 'widget_edit_html',
    'widget_create', 'widget_remove', 'widget_set_state',
    'viewport_pan', 'viewport_zoom', 'viewport_reset', 'viewport_transform',
    'ui_set_theme', 'ui_set_interaction_mode', 'ui_set_tool',
    'selection_select', 'selection_add', 'selection_remove',
    'selection_clear', 'selection_toggle',
    'document_set_background', 'document_set_name',
  ]);

  async function broadcastCanvasUpdate(toolName: string): Promise<void> {
    try {
      const state = await fetchCanvasState();
      const themeTokens = getThemeTokens(state.theme);
      const sorted = [...state.entities].sort((a: any, b: any) => a.zIndex - b.zIndex);
      const instanceMap = new Map(state.widgetInstances.map((i: any) => [i.id, i]));
      const canvasHtml = sorted
        .map((e: any) => entityToHtml(e, state.widgetHtmlMap, instanceMap, themeTokens))
        .join('\n');

      let scope: 'full' | 'entity' | 'viewport' | 'theme' | 'selection' | 'widget' = 'full';
      if (toolName.startsWith('viewport_')) scope = 'viewport';
      else if (toolName.startsWith('selection_')) scope = 'selection';
      else if (toolName === 'ui_set_theme') scope = 'theme';
      else if (toolName.startsWith('widget_')) scope = 'widget';
      else if (toolName.startsWith('canvas_')) scope = 'entity';

      if (scope === 'viewport') {
        broadcast(scope, { panX: state.viewport.offset.x, panY: state.viewport.offset.y, zoom: state.viewport.zoom });
      } else if (scope === 'selection') {
        broadcast(scope, { selectedIds: state.selectedIds });
      } else if (scope === 'theme') {
        broadcast(scope, { themeCss: generateThemeCss(state.theme) });
      } else {
        broadcast(scope, { canvasHtml, entityCount: state.entities.length, themeCss: generateThemeCss(state.theme) });
      }
    } catch (err) {
      console.error('[broadcast] Failed:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Create HTTP server
  // ---------------------------------------------------------------------------
  const httpServer = createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse URL path
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    // GET /canvas — serve live canvas HTML page
    if (req.method === 'GET' && url.pathname === '/canvas') {
      try {
        const state = await fetchCanvasState();
        const html = generateCanvasPage(state, PORT);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body><h1>Error loading canvas</h1><pre>${message}</pre></body></html>`);
      }
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Method not allowed' } }));
      return;
    }

    // Read body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks).toString();

    let parsed: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> };
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
      return;
    }

    try {
      const result = await sendToChild(parsed.method, parsed.params ?? {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result }));

      // Broadcast state updates after successful state-changing tool calls
      if (parsed.method === 'tools/call' && STATE_CHANGING_TOOLS.has((parsed.params as any)?.name)) {
        broadcastCanvasUpdate((parsed.params as any).name).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, error: { message } }));
    }
  });

  // Initialize WebSocket broadcaster for live canvas updates
  const provider: StateProvider = {
    getFullState: () => ({}),
    async getFullStateAsync() {
      const state = await fetchCanvasState();
      const themeTokens = getThemeTokens(state.theme);
      const sorted = [...state.entities].sort((a, b) => a.zIndex - b.zIndex);
      const instanceMap = new Map(state.widgetInstances.map((i: any) => [i.id, i]));
      const canvasHtml = sorted
        .map((e: any) => entityToHtml(e, state.widgetHtmlMap, instanceMap, themeTokens))
        .join('\n');
      return {
        canvasHtml,
        entityCount: state.entities.length,
        themeCss: generateThemeCss(state.theme),
      };
    },
  };
  initBroadcaster(httpServer, provider);

  httpServer.listen(PORT, () => {
    console.log(`\n  MCP HTTP Server running on http://localhost:${PORT}`);
    console.log(`  Live Canvas: http://localhost:${PORT}/canvas`);
    console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`  Proxying to stickernest-dev MCP server (stdio)\n`);
  });
}

main().catch(console.error);
