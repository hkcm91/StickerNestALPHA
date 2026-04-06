# AI-Interactive Canvas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the MCP dev server so AI can see, interact with, and iterate on StickerNest canvases and widgets in real time via Claude Code's preview tools.

**Architecture:** Three new files (`state-broadcaster.ts`, `canvas-page.ts`) plus modifications to `http-server.ts` and `index.ts`. WebSocket broadcasts state changes from MCP tools to connected browser canvas pages. The canvas page reuses `renderer.ts` for HTML generation and adds a WebSocket client for live updates.

**Tech Stack:** Node.js `ws` library for WebSocket server, existing `renderer.ts`/`sdk-stub.ts`/`widget-html.ts` for canvas rendering, Claude Code `preview_*` tools for AI interaction.

---

### Task 1: Add `ws` Dependency

**Files:**
- Modify: `mcp-dev/package.json`

**Step 1: Add ws and @types/ws**

```bash
cd mcp-dev && npm install ws && npm install -D @types/ws
```

**Step 2: Verify installation**

Run: `cd mcp-dev && node -e "require('ws'); console.log('ws OK')"`
Expected: `ws OK`

**Step 3: Commit**

```bash
git add mcp-dev/package.json mcp-dev/package-lock.json
git commit -m "feat(config): add ws dependency for MCP live canvas WebSocket"
```

---

### Task 2: Create State Broadcaster

**Files:**
- Create: `mcp-dev/src/state-broadcaster.ts`

This module manages WebSocket connections and broadcasts state changes to all connected canvas pages.

**Step 1: Write state-broadcaster.ts**

```typescript
/**
 * State Broadcaster
 *
 * Manages WebSocket connections for the live canvas page.
 * When MCP tools modify canvas/widget/theme/viewport/selection state,
 * they call broadcast() to push updates to all connected browsers.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';

// ── Types ────────────────────────────────────────────────────────────────────

export type UpdateScope = 'full' | 'entity' | 'viewport' | 'theme' | 'selection' | 'widget';

export interface StateUpdate {
  type: 'state_update';
  scope: UpdateScope;
  data: Record<string, unknown>;
}

// ── State provider interface ─────────────────────────────────────────────────

export interface StateProvider {
  getFullState(): Record<string, unknown>;
}

// ── Broadcaster ──────────────────────────────────────────────────────────────

let wss: WebSocketServer | null = null;
let stateProvider: StateProvider | null = null;

export function initBroadcaster(server: Server, provider: StateProvider): void {
  stateProvider = provider;

  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    // Send full state on connect
    if (stateProvider) {
      const fullState: StateUpdate = {
        type: 'state_update',
        scope: 'full',
        data: stateProvider.getFullState(),
      };
      ws.send(JSON.stringify(fullState));
    }
  });
}

export function broadcast(scope: UpdateScope, data: Record<string, unknown>): void {
  if (!wss) return;

  const msg: StateUpdate = { type: 'state_update', scope, data };
  const json = JSON.stringify(msg);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

export function broadcastFullState(): void {
  if (!stateProvider) return;
  broadcast('full', stateProvider.getFullState());
}

export function getConnectionCount(): number {
  if (!wss) return 0;
  let count = 0;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) count++;
  }
  return count;
}
```

**Step 2: Verify it compiles**

Run: `cd mcp-dev && npx tsc --noEmit src/state-broadcaster.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add mcp-dev/src/state-broadcaster.ts
git commit -m "feat(config): add WebSocket state broadcaster for live canvas"
```

---

### Task 3: Create Canvas Page Generator

**Files:**
- Create: `mcp-dev/src/canvas-page.ts`

This module generates the live canvas HTML page. It reuses `renderer.ts` for entity rendering and adds a WebSocket client script that receives state updates and re-renders.

**Step 1: Write canvas-page.ts**

The canvas page is a self-contained HTML page that:
1. Renders the initial canvas state (entities, viewport, widgets, theme)
2. Connects to `ws://localhost:{port}/ws` for live updates
3. On `full` scope updates: re-renders the entire canvas layer
4. On scoped updates: applies incremental changes where possible
5. Has `data-entity-id` attributes on all entities for `preview_click` targeting

```typescript
/**
 * Canvas Page Generator
 *
 * Generates a self-contained HTML page for the live canvas preview.
 * The page connects to a WebSocket for real-time state updates from MCP tools.
 */

import { generateSdkStub } from './sdk-stub.js';
import { generateThemeCss, getThemeTokens, entityToHtml } from './renderer.js';

// Re-export renderer types we need
interface Point2D { x: number; y: number; }
interface Size2D { width: number; height: number; }
interface Transform2D { position: Point2D; size: Size2D; rotation: number; scale: number; }
interface CanvasEntity {
  id: string; type: string; transform: Transform2D; zIndex: number;
  visible: boolean; opacity: number; borderRadius: number; locked: boolean;
  flipH: boolean; flipV: boolean; name?: string; content?: string;
  assetUrl?: string; widgetId?: string; widgetInstanceId?: string;
  config?: Record<string, unknown>; children?: string[]; metadata: Record<string, unknown>;
}
interface ViewportState { offset: Point2D; zoom: number; width: number; height: number; }
interface WidgetInstance { id: string; widgetId: string; config: Record<string, unknown>; state: Record<string, unknown>; }

export interface CanvasPageState {
  entities: CanvasEntity[];
  viewport: ViewportState;
  widgetHtmlMap: Record<string, string>;
  widgetInstances: WidgetInstance[];
  theme: string;
  selectedIds: string[];
}

export function generateCanvasPage(state: CanvasPageState, port: number): string {
  const themeName = state.theme || 'midnight-aurora';
  const themeTokens = getThemeTokens(themeName);
  const themeCss = generateThemeCss(themeName);
  const sorted = [...state.entities].sort((a, b) => a.zIndex - b.zIndex);
  const instanceMap = new Map(state.widgetInstances.map(i => [i.id, i]));
  const entityHtmlParts = sorted.map(e => entityToHtml(e, state.widgetHtmlMap, instanceMap, themeTokens));

  // Calculate auto-framing
  let initPanX = state.viewport.offset.x;
  let initPanY = state.viewport.offset.y;
  let initZoom = state.viewport.zoom;

  if (state.entities.length > 0 && initPanX === 0 && initPanY === 0 && initZoom === 1) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of state.entities) {
      const { position, size } = e.transform;
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + size.width);
      maxY = Math.max(maxY, position.y + size.height);
    }
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const padding = 60;
    const vw = state.viewport.width || 800;
    const vh = state.viewport.height || 600;
    const scaleX = (vw - padding * 2) / contentW;
    const scaleY = (vh - padding * 2) / contentH;
    initZoom = Math.min(scaleX, scaleY, 2);
    initPanX = (vw / 2) - ((minX + maxX) / 2) * initZoom;
    initPanY = (vh / 2) - ((minY + maxY) / 2) * initZoom;
  }

  // Serialize state for the WebSocket client to use on reconnect/update
  const stateJson = JSON.stringify({
    widgetHtmlMap: state.widgetHtmlMap,
    widgetInstances: state.widgetInstances,
    selectedIds: state.selectedIds,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StickerNest Live Canvas</title>
<style>
  :root {
${themeCss}
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%; height: 100%; overflow: hidden;
    background: var(--sn-bg);
    font-family: var(--sn-font-family, system-ui);
    color: var(--sn-text);
  }
  .sn-viewport {
    width: 100%; height: 100%;
    overflow: hidden; position: relative;
    cursor: grab;
  }
  .sn-viewport.dragging { cursor: grabbing; }
  .sn-canvas {
    position: absolute; top: 0; left: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
  .sn-entity {
    box-sizing: border-box;
    transition: box-shadow 0.15s ease;
  }
  .sn-entity:hover {
    box-shadow: 0 0 0 2px var(--sn-accent);
  }
  .sn-entity.selected {
    box-shadow: 0 0 0 2px var(--sn-accent), 0 0 12px rgba(78,123,142,0.3);
  }
  .sn-info-bar {
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    background: var(--sn-surface-glass, var(--sn-surface));
    backdrop-filter: blur(12px);
    border: 1px solid var(--sn-border);
    border-radius: var(--sn-radius);
    padding: 6px 16px;
    font-size: 12px;
    color: var(--sn-text-muted);
    display: flex; gap: 16px; align-items: center;
    user-select: none; pointer-events: none;
    z-index: 10000;
  }
  .sn-status {
    position: fixed; top: 12px; left: 16px;
    font-size: 11px; color: var(--sn-text-muted);
    display: flex; align-items: center; gap: 6px;
    user-select: none; pointer-events: none;
    z-index: 10000;
  }
  .sn-status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--sn-error);
    transition: background 0.3s ease;
  }
  .sn-status-dot.connected { background: var(--sn-success, #5AA878); }
  .sn-watermark {
    position: fixed; top: 12px; right: 16px;
    font-size: 11px; color: var(--sn-text-muted);
    opacity: 0.5; user-select: none; pointer-events: none;
    z-index: 10000;
  }
</style>
</head>
<body>
<div class="sn-viewport" id="viewport">
  <div class="sn-canvas" id="canvas">
    ${entityHtmlParts.join('\n    ')}
  </div>
</div>
<div class="sn-status" id="status">
  <div class="sn-status-dot" id="status-dot"></div>
  <span id="status-text">Connecting...</span>
</div>
<div class="sn-watermark">StickerNest Live</div>
<div class="sn-info-bar" id="infobar">
  <span id="zoom-display">100%</span>
  <span id="entity-count">${state.entities.length} entities</span>
</div>
<script>
(function() {
  var viewport = document.getElementById('viewport');
  var canvasEl = document.getElementById('canvas');
  var zoomDisplay = document.getElementById('zoom-display');
  var entityCount = document.getElementById('entity-count');
  var statusDot = document.getElementById('status-dot');
  var statusText = document.getElementById('status-text');

  // ── Pan/Zoom state ────────────────────────────────────────────────
  var currentZoom = ${initZoom};
  var panX = ${initPanX};
  var panY = ${initPanY};

  function applyTransform() {
    canvasEl.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + currentZoom + ')';
    zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
  }

  // Wheel zoom
  viewport.addEventListener('wheel', function(e) {
    e.preventDefault();
    var rect = viewport.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var oldZoom = currentZoom;
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    currentZoom = Math.max(0.05, Math.min(10, currentZoom * delta));
    var ratio = currentZoom / oldZoom;
    panX = mx - (mx - panX) * ratio;
    panY = my - (my - panY) * ratio;
    applyTransform();
  }, { passive: false });

  // Pan drag
  var dragging = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
  viewport.addEventListener('pointerdown', function(e) {
    if (e.target.closest('.sn-widget iframe, button, input, textarea, [contenteditable]')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startPanX = panX; startPanY = panY;
    viewport.classList.add('dragging');
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    panX = startPanX + (e.clientX - startX);
    panY = startPanY + (e.clientY - startY);
    applyTransform();
  });
  viewport.addEventListener('pointerup', function() {
    dragging = false;
    viewport.classList.remove('dragging');
  });

  // Entity selection
  document.querySelectorAll('.sn-entity').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      document.querySelectorAll('.sn-entity.selected').forEach(function(s) { s.classList.remove('selected'); });
      el.classList.add('selected');
    });
  });
  viewport.addEventListener('click', function(e) {
    if (e.target === viewport || e.target.id === 'canvas') {
      document.querySelectorAll('.sn-entity.selected').forEach(function(s) { s.classList.remove('selected'); });
    }
  });

  applyTransform();

  // ── WebSocket live updates ────────────────────────────────────────
  var wsUrl = 'ws://' + window.location.host + '/ws';
  var ws = null;
  var reconnectDelay = 1000;

  function setStatus(connected) {
    statusDot.className = 'sn-status-dot' + (connected ? ' connected' : '');
    statusText.textContent = connected ? 'Live' : 'Reconnecting...';
  }

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
      setStatus(true);
      reconnectDelay = 1000;
    };

    ws.onclose = function() {
      setStatus(false);
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
    };

    ws.onerror = function() {
      ws.close();
    };

    ws.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'state_update') {
          handleStateUpdate(msg);
        }
      } catch(e) {
        console.error('[SN Canvas] Failed to parse WebSocket message:', e);
      }
    };
  }

  function handleStateUpdate(msg) {
    if (msg.scope === 'full' && msg.data && msg.data.canvasHtml) {
      // Full re-render: replace canvas innerHTML
      canvasEl.innerHTML = msg.data.canvasHtml;
      if (msg.data.entityCount != null) {
        entityCount.textContent = msg.data.entityCount + ' entities';
      }
      // Re-apply entity selection click handlers
      rebindEntityClicks();
      // Update theme if provided
      if (msg.data.themeCss) {
        var root = document.documentElement;
        var style = root.querySelector('#sn-live-theme') || document.createElement('style');
        style.id = 'sn-live-theme';
        style.textContent = ':root { ' + msg.data.themeCss + ' }';
        if (!style.parentNode) document.head.appendChild(style);
      }
    } else if (msg.scope === 'entity' && msg.data && msg.data.canvasHtml) {
      // Entity-level update: full canvas re-render (incremental DOM diffing is out of scope)
      canvasEl.innerHTML = msg.data.canvasHtml;
      if (msg.data.entityCount != null) {
        entityCount.textContent = msg.data.entityCount + ' entities';
      }
      rebindEntityClicks();
    } else if (msg.scope === 'viewport' && msg.data) {
      // Viewport update — apply new pan/zoom from server
      if (msg.data.panX != null) panX = msg.data.panX;
      if (msg.data.panY != null) panY = msg.data.panY;
      if (msg.data.zoom != null) currentZoom = msg.data.zoom;
      applyTransform();
    } else if (msg.scope === 'theme' && msg.data && msg.data.themeCss) {
      var root = document.documentElement;
      var style = root.querySelector('#sn-live-theme') || document.createElement('style');
      style.id = 'sn-live-theme';
      style.textContent = ':root { ' + msg.data.themeCss + ' }';
      if (!style.parentNode) document.head.appendChild(style);
    } else if (msg.scope === 'selection' && msg.data) {
      document.querySelectorAll('.sn-entity.selected').forEach(function(s) { s.classList.remove('selected'); });
      (msg.data.selectedIds || []).forEach(function(id) {
        var el = document.querySelector('[data-entity-id="' + id + '"]');
        if (el) el.classList.add('selected');
      });
    } else if (msg.scope === 'widget' && msg.data && msg.data.canvasHtml) {
      // Widget HTML changed — re-render canvas to pick up new iframe content
      canvasEl.innerHTML = msg.data.canvasHtml;
      if (msg.data.entityCount != null) {
        entityCount.textContent = msg.data.entityCount + ' entities';
      }
      rebindEntityClicks();
    }
  }

  function rebindEntityClicks() {
    document.querySelectorAll('.sn-entity').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelectorAll('.sn-entity.selected').forEach(function(s) { s.classList.remove('selected'); });
        el.classList.add('selected');
      });
    });
  }

  connect();
})();
</script>
</body>
</html>`;
}
```

**Step 2: Verify it compiles**

Run: `cd mcp-dev && npx tsc --noEmit src/canvas-page.ts`
Expected: No errors (may need to check that `entityToHtml` is exported from renderer.ts)

**Step 3: If `entityToHtml` is not exported from renderer.ts**

Check `mcp-dev/src/renderer.ts` line 223. If `entityToHtml` is not exported, add the `export` keyword:

```diff
-function entityToHtml(
+export function entityToHtml(
```

**Step 4: Commit**

```bash
git add mcp-dev/src/canvas-page.ts
git commit -m "feat(config): add live canvas page generator with WebSocket client"
```

---

### Task 4: Extend HTTP Server with `/canvas` Route and WebSocket

**Files:**
- Modify: `mcp-dev/src/http-server.ts`

The HTTP server needs three changes:
1. Import and initialize the state broadcaster
2. Add `GET /canvas` route that serves the canvas page
3. WebSocket upgrade handling (done by `initBroadcaster`)

**Step 1: Add imports and state provider**

At the top of `http-server.ts`, after the existing imports, add:

```typescript
import { initBroadcaster, broadcast, broadcastFullState, type StateProvider } from './state-broadcaster.js';
import { generateCanvasPage, type CanvasPageState } from './canvas-page.js';
import { generateThemeCss, getThemeTokens, entityToHtml } from './renderer.js';
import { widgetHtmlRegistry } from './artifact-tools.js';
```

**Step 2: Build state provider and canvas page handler**

Inside the `main()` function, after the child process setup and before `createServer`, we need to maintain a local mirror of the MCP state. Since the HTTP server proxies to a child process, we'll use JSON-RPC calls to the child to fetch state on demand.

Add a helper function that fetches current state from the child:

```typescript
async function fetchCanvasState(): Promise<CanvasPageState> {
  try {
    const [entitiesResult, viewportResult, uiResult, widgetResult] = await Promise.all([
      sendToChild('tools/call', { name: 'canvas_list_entities', arguments: {} }),
      sendToChild('tools/call', { name: 'viewport_get', arguments: {} }),
      sendToChild('tools/call', { name: 'ui_get', arguments: {} }),
      sendToChild('tools/call', { name: 'widget_list', arguments: {} }),
    ]);

    const parseContent = (result: unknown): unknown => {
      const r = result as { content?: Array<{ text?: string }> };
      const text = r?.content?.[0]?.text ?? '{}';
      try { return JSON.parse(text); } catch { return {}; }
    };

    const entitiesData = parseContent(entitiesResult) as { entities?: unknown[] };
    const viewportData = parseContent(viewportResult) as Record<string, unknown>;
    const uiData = parseContent(uiResult) as Record<string, unknown>;
    const widgetData = parseContent(widgetResult) as { instances?: unknown[] };

    return {
      entities: (entitiesData.entities ?? []) as CanvasPageState['entities'],
      viewport: {
        offset: { x: (viewportData.offset as any)?.x ?? 0, y: (viewportData.offset as any)?.y ?? 0 },
        zoom: (viewportData.zoom as number) ?? 1,
        width: (viewportData.width as number) ?? 800,
        height: (viewportData.height as number) ?? 600,
      },
      widgetHtmlMap: {},  // Populated from child's widget HTML registry
      widgetInstances: (widgetData.instances ?? []) as CanvasPageState['widgetInstances'],
      theme: (uiData.theme as string) ?? 'midnight-aurora',
      selectedIds: [],
    };
  } catch (err) {
    console.error('[canvas] Failed to fetch state:', err);
    return {
      entities: [],
      viewport: { offset: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 },
      widgetHtmlMap: {},
      widgetInstances: [],
      theme: 'midnight-aurora',
      selectedIds: [],
    };
  }
}
```

**Step 3: Modify the createServer handler**

Replace the existing `createServer` callback to handle GET requests for `/canvas` before the existing POST-only logic:

```typescript
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

  // ── GET /canvas — live canvas page ──────────────────────────────
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/canvas') {
    try {
      const state = await fetchCanvasState();
      const html = generateCanvasPage(state, PORT);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to generate canvas page');
    }
    return;
  }

  // ── POST / — JSON-RPC proxy (existing behavior) ─────────────────
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Method not allowed' } }));
    return;
  }

  // ... rest of existing POST handler unchanged ...
```

**Step 4: Initialize broadcaster and add state-change detection**

After `httpServer` is created but before `httpServer.listen()`, add:

```typescript
// Initialize WebSocket broadcaster
const stateProviderImpl: StateProvider = {
  getFullState() {
    // Synchronous — return empty, the actual state is sent async on connect
    return {};
  },
};
initBroadcaster(httpServer, stateProviderImpl);
```

Then, in the POST handler, after a successful tool call response, detect state-changing tools and broadcast:

```typescript
// After the sendToChild call succeeds, check if the tool modifies state
const STATE_CHANGING_TOOLS = new Set([
  'canvas_add_entity', 'canvas_update_entity', 'canvas_remove_entity',
  'canvas_clear', 'canvas_group', 'canvas_ungroup', 'canvas_reorder',
  'widget_create_html', 'widget_set_html', 'widget_edit_html',
  'widget_create', 'widget_remove', 'widget_set_state',
  'viewport_pan', 'viewport_zoom', 'viewport_reset', 'viewport_transform',
  'ui_set_theme', 'ui_set_interaction_mode',
  'selection_select', 'selection_add', 'selection_remove',
  'selection_clear', 'selection_toggle',
  'document_set_background', 'document_set_name',
]);

if (parsed.method === 'tools/call' && STATE_CHANGING_TOOLS.has(parsed.params?.name as string)) {
  // Broadcast update to connected canvas pages
  broadcastCanvasUpdate(parsed.params?.name as string).catch(() => {});
}
```

Add the broadcast helper:

```typescript
async function broadcastCanvasUpdate(toolName: string) {
  try {
    const state = await fetchCanvasState();
    const themeTokens = getThemeTokens(state.theme);
    const sorted = [...state.entities].sort((a, b) => a.zIndex - b.zIndex);
    const instanceMap = new Map(state.widgetInstances.map(i => [i.id, i]));
    const canvasHtml = sorted
      .map(e => entityToHtml(e, state.widgetHtmlMap, instanceMap, themeTokens))
      .join('\n');

    // Determine scope from tool name
    let scope: 'full' | 'entity' | 'viewport' | 'theme' | 'selection' | 'widget' = 'full';
    if (toolName.startsWith('viewport_')) scope = 'viewport';
    else if (toolName.startsWith('selection_')) scope = 'selection';
    else if (toolName.startsWith('ui_set_theme')) scope = 'theme';
    else if (toolName.startsWith('widget_')) scope = 'widget';
    else if (toolName.startsWith('canvas_')) scope = 'entity';

    if (scope === 'viewport') {
      broadcast(scope, {
        panX: state.viewport.offset.x,
        panY: state.viewport.offset.y,
        zoom: state.viewport.zoom,
      });
    } else if (scope === 'selection') {
      broadcast(scope, { selectedIds: state.selectedIds });
    } else if (scope === 'theme') {
      broadcast(scope, { themeCss: generateThemeCss(state.theme) });
    } else {
      broadcast(scope, {
        canvasHtml,
        entityCount: state.entities.length,
        themeCss: generateThemeCss(state.theme),
      });
    }
  } catch (err) {
    console.error('[broadcast] Failed:', err);
  }
}
```

**Step 5: Update console output**

In the `httpServer.listen()` callback, add a line about the canvas URL:

```typescript
httpServer.listen(PORT, () => {
  console.log(`\n  MCP HTTP Server running on http://localhost:${PORT}`);
  console.log(`  Live Canvas: http://localhost:${PORT}/canvas`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  Proxying to stickernest-dev MCP server (stdio)\n`);
});
```

**Step 6: Verify it compiles**

Run: `cd mcp-dev && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add mcp-dev/src/http-server.ts
git commit -m "feat(config): add /canvas route and WebSocket upgrade to HTTP server"
```

---

### Task 5: Wire State Broadcasts into MCP Tool Handlers (index.ts)

**Files:**
- Modify: `mcp-dev/src/index.ts`

The HTTP server approach (Task 4) handles broadcasts from the proxy layer. But for the **stdio MCP server** (direct usage via Claude Code), we also need the tool handlers in `index.ts` to support broadcasting when state changes.

Since `index.ts` runs as a child process of `http-server.ts`, and the WebSocket lives in the parent HTTP server process, the child can't broadcast directly. The HTTP server detects state-changing tool calls from the JSON-RPC proxy (Task 4) and broadcasts after them. So for the stdio path, **no changes to index.ts are needed** — the HTTP proxy layer handles it.

However, we should export the tool context getters so `http-server.ts` can fetch state via tool calls. Verify the existing tool handlers for `canvas_list_entities`, `viewport_get`, `ui_get`, and `widget_list` return well-structured JSON. If any are missing or return malformed data, fix them.

**Step 1: Verify tool output formats**

Run the MCP server and call these tools to check output shape:
```bash
cd mcp-dev && echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"canvas_list_entities","arguments":{}}}' | npx tsx src/index.ts 2>/dev/null
```

Expected: JSON response with `content[0].text` containing `{ "entities": [...] }`.

**Step 2: Commit (if any fixes needed)**

```bash
git add mcp-dev/src/index.ts
git commit -m "fix(config): ensure tool handlers return well-structured state for canvas page"
```

---

### Task 6: Export `entityToHtml` from Renderer

**Files:**
- Modify: `mcp-dev/src/renderer.ts`

`canvas-page.ts` imports `entityToHtml` from `renderer.ts`, but it's currently not exported.

**Step 1: Add export keyword**

Change line 223 from:
```typescript
function entityToHtml(
```
to:
```typescript
export function entityToHtml(
```

**Step 2: Verify compilation**

Run: `cd mcp-dev && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add mcp-dev/src/renderer.ts
git commit -m "feat(config): export entityToHtml for live canvas page reuse"
```

---

### Task 7: Build and Manual Test

**Step 1: Full build**

Run: `cd mcp-dev && npm run build`
Expected: Clean compilation

**Step 2: Start the HTTP server**

Run: `cd mcp-dev && npx tsx src/http-server.ts`
Expected: Console shows:
```
  MCP HTTP Server running on http://localhost:3100
  Live Canvas: http://localhost:3100/canvas
  WebSocket: ws://localhost:3100/ws
```

**Step 3: Open canvas page**

Navigate to `http://localhost:3100/canvas` in a browser.
Expected: Empty canvas with "StickerNest Live" watermark, "Live" status indicator (green dot), zoom control showing "100%", "0 entities" count.

**Step 4: Add an entity via MCP tool**

Use curl or the MCP to call `canvas_add_entity`:
```bash
curl -X POST http://localhost:3100 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"canvas_add_entity","arguments":{"type":"text","content":"Hello World","position":{"x":100,"y":100},"size":{"width":200,"height":80}}}}'
```

Expected: The canvas page updates live (via WebSocket) to show the text entity.

**Step 5: Test with Claude Code preview tools**

```
preview_start({ url: "http://localhost:3100/canvas" })
preview_screenshot()
```

Expected: Screenshot shows the StickerNest canvas with entities.

**Step 6: Commit build artifacts**

```bash
git add -A mcp-dev/
git commit -m "feat(config): AI-interactive canvas system — live preview with WebSocket sync"
```

---

### Task 8: Verify Preview Interaction Workflow

This is a usage verification task, not a code task. Test the full AI workflow described in the design doc.

**Step 1: Widget development workflow**

1. Call `widget_create_html` with custom HTML
2. Call `canvas_add_entity` to place a widget entity
3. Call `preview_screenshot` to see the result
4. Call `widget_set_html` to update the widget code
5. WebSocket pushes update to canvas page
6. Call `preview_screenshot` to verify the change

**Step 2: Canvas design workflow**

1. Call `canvas_add_entity` to place text, stickers, shapes
2. Call `preview_screenshot` to review layout
3. Call `canvas_update_entity` to adjust positions
4. Call `preview_screenshot` to verify

**Step 3: Interactive testing**

1. Call `preview_click` on a widget button: `preview_click({ selector: "[data-entity-id='widget-1'] button" })`
2. Call `preview_fill` on an editable element: `preview_fill({ selector: "[data-entity-id='note-1'] [contenteditable]", value: "Test" })`
3. Call `preview_snapshot` to get DOM structure for targeting
4. Call `preview_eval` to read widget state

Expected: All interactions work. Widget iframes respond to clicks and fills. DOM snapshot shows `data-entity-id` attributes.

---

## Summary of Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `mcp-dev/package.json` | Modify | +2 deps |
| `mcp-dev/src/state-broadcaster.ts` | Create | ~80 |
| `mcp-dev/src/canvas-page.ts` | Create | ~250 |
| `mcp-dev/src/http-server.ts` | Modify | +120 |
| `mcp-dev/src/renderer.ts` | Modify | +1 (export) |
| `mcp-dev/src/index.ts` | Verify only | 0 |

## Key Reuse

- `renderer.ts` `entityToHtml()` — generates per-entity HTML with `data-entity-id` attrs
- `renderer.ts` `generateThemeCss()` / `getThemeTokens()` — theme token injection
- `sdk-stub.ts` `generateSdkStub()` — widget iframe SDK (used by entityToHtml for widget entities)
- `artifact-tools.ts` `widgetHtmlRegistry` — shared widget HTML map
- `http-server.ts` child process proxy — reused for state fetching
