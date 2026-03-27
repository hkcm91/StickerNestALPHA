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

  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, error: { message } }));
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`\n  MCP HTTP Server running on http://localhost:${PORT}`);
    console.log(`  Proxying to stickernest-dev MCP server (stdio)\n`);
    console.log(`  Add this to the MCP Explorer widget:`);
    console.log(`    Name: stickernest-dev`);
    console.log(`    URL:  http://localhost:${PORT}`);
    console.log(`    Auth: None\n`);
  });
}

main().catch(console.error);
