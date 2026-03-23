import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import react from '@vitejs/plugin-react';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════
// AI Proxy Plugin — inline in vite.config to avoid import resolution
// issues. Intercepts /api/ai/generate during dev, proxies to Anthropic.
// ═══════════════════════════════════════════════════════════════════

const WIDGET_SYSTEM_PROMPT = `You are an expert widget developer for StickerNest, a spatial operating system.
You create single-file HTML widgets that run inside sandboxed iframes.

RULES:
- Output ONLY the complete HTML file. No explanation, no markdown fences, no commentary.
- The widget SDK is injected automatically as \`window.StickerNest\`. Do NOT include or import it.
- Use the StickerNest SDK API:
  - \`StickerNest.register(manifest)\` — call first with a manifest object
  - \`StickerNest.ready()\` — call after registration to signal the widget is ready
  - \`StickerNest.emit(type, payload)\` — emit events to the bus
  - \`StickerNest.subscribe(type, handler)\` — listen for bus events
  - \`StickerNest.setState(key, value)\` / \`StickerNest.getState(key)\` — persist state
  - \`StickerNest.onThemeChange(handler)\` — receive theme tokens
  - \`StickerNest.onResize(handler)\` — receive resize events
  - \`StickerNest.getConfig()\` — get user-configured values
- Use CSS custom properties for theming: --sn-bg, --sn-surface, --sn-accent, --sn-text, --sn-text-muted, --sn-border, --sn-radius, --sn-font-family
- All CSS and JS must be inline in the HTML file (single-file widget format)
- No remote script sources (CDNs). All code must be self-contained.
- The widget should be visually polished with smooth animations and clean typography
- Make the widget responsive to its container size

TEMPLATE:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Styles using --sn-* CSS custom properties */
  </style>
</head>
<body>
  <!-- Widget markup -->
  <script>
    StickerNest.register({
      name: 'Widget Name',
      version: '1.0.0',
      events: { emits: [], subscribes: [] }
    });
    // Widget logic
    StickerNest.ready();
  </script>
</body>
</html>`;

const EXPLAIN_SYSTEM_PROMPT = `You are a helpful assistant for StickerNest widget development.
Answer questions about widgets, the StickerNest SDK, pipeline connections, and canvas concepts.
Be concise and practical. Reference SDK methods when relevant.`;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function jsonRes(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function extractHtml(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:html)?\s*\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  if (/^<!|^<html/i.test(trimmed)) return trimmed;
  return trimmed;
}

async function handleAIRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    jsonRes(res, 500, { html: '', error: 'ANTHROPIC_API_KEY not set in .env.local' });
    return;
  }

  let body: string;
  try { body = await readBody(req); } catch { jsonRes(res, 400, { error: 'Failed to read body' }); return; }

  let parsed: { prompt?: string; type?: string };
  try { parsed = JSON.parse(body); } catch { jsonRes(res, 400, { error: 'Invalid JSON' }); return; }

  const prompt = parsed.prompt ?? '';
  const type = parsed.type ?? 'widget-generation';
  if (!prompt.trim()) { jsonRes(res, 400, { error: 'Empty prompt' }); return; }

  const systemPrompt = type === 'explain' ? EXPLAIN_SYSTEM_PROMPT : WIDGET_SYSTEM_PROMPT;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-proxy] Anthropic API error:', response.status, errorText);
      jsonRes(res, 502, { error: `Anthropic API returned ${response.status}` });
      return;
    }

    const data = await response.json() as { content: Array<{ type: string; text?: string }> };
    const rawText = data.content.find((b) => b.type === 'text')?.text ?? '';

    if (type === 'explain') { jsonRes(res, 200, { text: rawText }); return; }

    jsonRes(res, 200, { html: extractHtml(rawText) });
  } catch (err) {
    console.error('[ai-proxy] Error:', err);
    jsonRes(res, 500, { error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

function aiProxyPlugin(): Plugin {
  return {
    name: 'sn-ai-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/ai/generate') { next(); return; }
        void handleAIRequest(req, res).catch((err) => {
          console.error('[ai-proxy] Unhandled:', err);
          if (!res.writableEnded) jsonRes(res, 500, { error: 'Internal server error' });
        });
      });
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// Vite Configuration
// ═══════════════════════════════════════════════════════════════════

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_ prefixed) so the AI proxy
  // plugin can read ANTHROPIC_API_KEY on the server side.
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), aiProxyPlugin()],
    base: process.env.GITHUB_ACTIONS ? '/StickerNest5.0/' : '/',
    resolve: {
      dedupe: ['three', 'react', 'react-dom'],
      alias: {
        '@sn/types': path.resolve(__dirname, './src/kernel/schemas/index.ts'),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
    },
  };
});
