/**
 * Canvas Page Generator
 *
 * Generates a live canvas HTML page that connects via WebSocket
 * for real-time updates when MCP tools modify state.
 */

import { generateSdkStub } from './sdk-stub.js';
import { generateThemeCss, getThemeTokens, entityToHtml } from './renderer.js';

// ============================================================================
// Types (mirrored from renderer.ts since they are not exported)
// ============================================================================

interface Point2D { x: number; y: number; }
interface Size2D { width: number; height: number; }

interface Transform2D {
  position: Point2D;
  size: Size2D;
  rotation: number;
  scale: number;
}

interface CanvasEntity {
  id: string;
  type: string;
  transform: Transform2D;
  zIndex: number;
  visible: boolean;
  opacity: number;
  borderRadius: number;
  locked: boolean;
  flipH: boolean;
  flipV: boolean;
  name?: string;
  content?: string;
  assetUrl?: string;
  widgetId?: string;
  widgetInstanceId?: string;
  config?: Record<string, unknown>;
  children?: string[];
  metadata: Record<string, unknown>;
}

interface ViewportState {
  offset: Point2D;
  zoom: number;
  width: number;
  height: number;
}

interface WidgetInstance {
  id: string;
  widgetId: string;
  config: Record<string, unknown>;
  state: Record<string, unknown>;
}

// ============================================================================
// Canvas Page State
// ============================================================================

export interface CanvasPageState {
  entities: CanvasEntity[];
  viewport: ViewportState;
  widgetHtmlMap: Record<string, string>;
  widgetInstances: WidgetInstance[];
  theme: string;
  selectedIds: string[];
}

// ============================================================================
// Canvas Page Generator
// ============================================================================

export function generateCanvasPage(state: CanvasPageState, port: number): string {
  const themeTokens = getThemeTokens(state.theme);
  const themeCss = generateThemeCss(state.theme);
  const { viewport, entities, selectedIds } = state;

  // Sort entities by z-index
  const sorted = [...entities].sort((a, b) => a.zIndex - b.zIndex);

  // Build entity HTML server-side
  const instanceMap = new Map(state.widgetInstances.map(i => [i.id, i]));
  const entityHtmlParts = sorted.map(e => {
    const html = entityToHtml(e, state.widgetHtmlMap, instanceMap, themeTokens);
    // Add .selected class for pre-selected entities
    if (selectedIds.includes(e.id)) {
      return html.replace('class="sn-entity', 'class="sn-entity selected');
    }
    return html;
  });

  // Auto-framing: calculate bounding box if viewport is at default
  const zoom = viewport.zoom;
  const panX = viewport.offset.x;
  const panY = viewport.offset.y;
  let autoTransform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  let autoFramed = false;

  if (entities.length > 0 && panX === 0 && panY === 0 && zoom === 1) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of entities) {
      const { position, size } = e.transform;
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + size.width);
      maxY = Math.max(maxY, position.y + size.height);
    }
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const padding = 60;
    const vw = viewport.width || 800;
    const vh = viewport.height || 600;
    const scaleX = (vw - padding * 2) / contentW;
    const scaleY = (vh - padding * 2) / contentH;
    const fitZoom = Math.min(scaleX, scaleY, 2);
    const offsetX = (vw / 2) - ((minX + maxX) / 2) * fitZoom;
    const offsetY = (vh / 2) - ((minY + maxY) / 2) * fitZoom;
    autoTransform = `translate(${offsetX}px, ${offsetY}px) scale(${fitZoom})`;
    autoFramed = true;
  }

  const canvasHtml = entityHtmlParts.join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StickerNest Live Canvas</title>
<style id="sn-live-theme">
  :root {
${themeCss}
  }
</style>
<style>
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
  .sn-watermark {
    position: fixed; top: 12px; right: 16px;
    font-size: 11px; color: var(--sn-text-muted);
    opacity: 0.5; user-select: none; pointer-events: none;
    z-index: 10000;
    font-family: var(--sn-font-family, system-ui);
  }
  .sn-connection-indicator {
    position: fixed; top: 12px; left: 16px;
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--sn-text-muted);
    opacity: 0.7; user-select: none; pointer-events: none;
    z-index: 10000;
    font-family: var(--sn-font-family, system-ui);
  }
  .sn-connection-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #c85858;
    transition: background 0.3s ease;
  }
  .sn-connection-dot.connected {
    background: #5aa878;
  }
</style>
</head>
<body>
<div class="sn-viewport" id="viewport">
  <div class="sn-canvas" id="canvas" style="transform: ${autoTransform}">
    ${canvasHtml}
  </div>
</div>
<div class="sn-watermark">StickerNest Live</div>
<div class="sn-connection-indicator">
  <div class="sn-connection-dot" id="connection-dot"></div>
  <span id="connection-label">Connecting...</span>
</div>
<div class="sn-info-bar" id="infobar">
  <span id="zoom-display">${Math.round(zoom * 100)}%</span>
  <span id="entity-count">${entities.length} entities</span>
</div>
<script>
(function() {
  var viewport = document.getElementById('viewport');
  var canvasEl = document.getElementById('canvas');
  var zoomDisplay = document.getElementById('zoom-display');
  var entityCountEl = document.getElementById('entity-count');
  var connectionDot = document.getElementById('connection-dot');
  var connectionLabel = document.getElementById('connection-label');

  // Pan/zoom state
  var currentZoom = ${zoom};
  var panX = ${panX};
  var panY = ${panY};

  ${autoFramed ? `
  // Auto-framed — extract from CSS
  var m = canvasEl.style.transform.match(/translate\\(([\\d.-]+)px,\\s*([\\d.-]+)px\\)\\s*scale\\(([\\d.]+)\\)/);
  if (m) { panX = parseFloat(m[1]); panY = parseFloat(m[2]); currentZoom = parseFloat(m[3]); }
  zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
  ` : ''}

  function applyTransform() {
    canvasEl.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + currentZoom + ')';
    zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
  }

  // --- Wheel zoom ---
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

  // --- Pan drag ---
  var dragging = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
  viewport.addEventListener('pointerdown', function(e) {
    if (e.target.closest('.sn-widget iframe, button, input, [contenteditable]')) return;
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

  // --- Entity click selection ---
  function bindEntityClicks() {
    document.querySelectorAll('.sn-entity').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelectorAll('.sn-entity.selected').forEach(function(s) { s.classList.remove('selected'); });
        el.classList.add('selected');
      });
    });
  }
  bindEntityClicks();

  viewport.addEventListener('click', function(e) {
    if (e.target === viewport || e.target.id === 'canvas') {
      document.querySelectorAll('.sn-entity.selected').forEach(function(s) { s.classList.remove('selected'); });
    }
  });

  // --- WebSocket connection with auto-reconnect ---
  var ws = null;
  var reconnectDelay = 1000;
  var maxReconnectDelay = 10000;

  function connectWebSocket() {
    ws = new WebSocket('ws://localhost:${port}/ws');

    ws.onopen = function() {
      reconnectDelay = 1000;
      connectionDot.classList.add('connected');
      connectionLabel.textContent = 'Connected';
    };

    ws.onclose = function() {
      connectionDot.classList.remove('connected');
      connectionLabel.textContent = 'Reconnecting...';
      scheduleReconnect();
    };

    ws.onerror = function() {
      // onclose will fire after this
    };

    ws.onmessage = function(event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch(e) { return; }
      if (msg.type !== 'state_update') return;

      var scope = msg.scope;
      var data = msg.data;

      if (scope === 'full' || scope === 'entity' || scope === 'widget') {
        if (data.canvasHtml != null) {
          canvasEl.innerHTML = data.canvasHtml;
          bindEntityClicks();
        }
        if (data.entityCount != null) {
          entityCountEl.textContent = data.entityCount + ' entities';
        }
      }

      if (scope === 'viewport') {
        if (data.panX != null) panX = data.panX;
        if (data.panY != null) panY = data.panY;
        if (data.zoom != null) currentZoom = data.zoom;
        applyTransform();
      }

      if (scope === 'theme') {
        var themeStyle = document.getElementById('sn-live-theme');
        if (themeStyle && data.themeCss != null) {
          themeStyle.textContent = ':root {\\n' + data.themeCss + '\\n}';
        }
      }

      if (scope === 'selection') {
        document.querySelectorAll('.sn-entity.selected').forEach(function(s) {
          s.classList.remove('selected');
        });
        var ids = data.selectedIds || [];
        ids.forEach(function(id) {
          var el = document.querySelector('[data-entity-id="' + id + '"]');
          if (el) el.classList.add('selected');
        });
      }
    };
  }

  function scheduleReconnect() {
    setTimeout(function() {
      connectWebSocket();
      reconnectDelay = Math.min(reconnectDelay * 1.5, maxReconnectDelay);
    }, reconnectDelay);
  }

  connectWebSocket();

  applyTransform();
})();
</script>
</body>
</html>`;
}
