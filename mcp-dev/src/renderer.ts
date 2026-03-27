/**
 * StickerNest Artifact Renderer
 *
 * Pure functions that convert canvas scene graph state into
 * self-contained HTML artifacts. Used by the MCP server's
 * render_canvas, render_widget, and render_widget_preview tools.
 */

import { generateSdkStub } from './sdk-stub.js';

// ============================================================================
// Types (mirrors mcp-dev index.ts structures)
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
// Theme Definitions (copied from shell/theme/theme-tokens.ts)
// ============================================================================

type ThemeName = 'midnight-aurora' | 'crystal-light' | 'bubbles-sky' | 'autumn-fireflies' | 'high-contrast';

const THEMES: Record<ThemeName, Record<string, string>> = {
  'midnight-aurora': {
    '--sn-bg': '#0A0A0E',
    '--sn-surface': '#16161B',
    '--sn-accent': '#4E7B8E',
    '--sn-text': '#EDEBE6',
    '--sn-text-muted': '#8A8796',
    '--sn-border': 'rgba(255,255,255,0.10)',
    '--sn-radius': '12px',
    '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",
    '--sn-surface-raised': '#1E1E24',
    '--sn-surface-glass': 'rgba(20,17,24,0.85)',
    '--sn-accent-light': '#6A95A6',
    '--sn-ember': '#E8806C',
    '--sn-success': '#5AA878',
    '--sn-warning': '#D4A04C',
    '--sn-error': '#C85858',
  },
  'crystal-light': {
    '--sn-bg': '#FAF8F5',
    '--sn-surface': '#FFFFFF',
    '--sn-accent': '#4E7B8E',
    '--sn-text': '#1A1820',
    '--sn-text-muted': '#7A7580',
    '--sn-border': 'rgba(0,0,0,0.12)',
    '--sn-radius': '12px',
    '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",
    '--sn-surface-raised': '#FFFFFF',
    '--sn-surface-glass': 'rgba(255,255,255,0.75)',
    '--sn-accent-light': '#6A95A6',
    '--sn-ember': '#D06850',
    '--sn-success': '#4A9068',
    '--sn-warning': '#C08A30',
    '--sn-error': '#B84848',
  },
  'bubbles-sky': {
    '--sn-bg': '#0B1628',
    '--sn-surface': '#121E30',
    '--sn-accent': '#38BDF8',
    '--sn-text': '#E8F0F8',
    '--sn-text-muted': '#7A8FA8',
    '--sn-border': 'rgba(56,189,248,0.12)',
    '--sn-radius': '16px',
    '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",
    '--sn-surface-raised': '#182840',
    '--sn-surface-glass': 'rgba(16,26,44,0.85)',
    '--sn-accent-light': '#7DD3FC',
    '--sn-ember': '#06B6D4',
    '--sn-success': '#2DD4BF',
    '--sn-warning': '#FBBF24',
    '--sn-error': '#F87171',
  },
  'autumn-fireflies': {
    '--sn-bg': '#1A1008',
    '--sn-surface': '#241A10',
    '--sn-accent': '#E8A44C',
    '--sn-text': '#F0E8D8',
    '--sn-text-muted': '#9A8870',
    '--sn-border': 'rgba(232,164,76,0.14)',
    '--sn-radius': '12px',
    '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",
    '--sn-surface-raised': '#2E2218',
    '--sn-surface-glass': 'rgba(30,22,12,0.85)',
    '--sn-accent-light': '#F0C070',
    '--sn-ember': '#E8806C',
    '--sn-success': '#8AB060',
    '--sn-warning': '#E8A44C',
    '--sn-error': '#D06050',
  },
  'high-contrast': {
    '--sn-bg': '#000000',
    '--sn-surface': '#111111',
    '--sn-accent': '#7A9DAE',
    '--sn-text': '#F2EDE6',
    '--sn-text-muted': '#A098A4',
    '--sn-border': '#F2EDE6',
    '--sn-radius': '0px',
    '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",
    '--sn-surface-raised': '#1A1A1F',
    '--sn-surface-glass': 'rgba(0,0,0,0.85)',
    '--sn-accent-light': '#7A9DAE',
    '--sn-ember': '#ECA080',
    '--sn-success': '#8EC8A4',
    '--sn-warning': '#E8C080',
    '--sn-error': '#F0A0A0',
  },
};

// ============================================================================
// Theme CSS Generation
// ============================================================================

export function generateThemeCss(themeName?: string): string {
  const tokens = THEMES[(themeName as ThemeName)] ?? THEMES['midnight-aurora'];
  return Object.entries(tokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

export function getThemeTokens(themeName?: string): Record<string, string> {
  return { ...(THEMES[(themeName as ThemeName)] ?? THEMES['midnight-aurora']) };
}

// ============================================================================
// Entity → HTML Conversion
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeSrcdoc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function entityTransformStyle(entity: CanvasEntity): string {
  const { position, size, rotation, scale } = entity.transform;
  const parts = [
    `position:absolute`,
    `left:${position.x}px`,
    `top:${position.y}px`,
    `width:${size.width}px`,
    `height:${size.height}px`,
    `z-index:${entity.zIndex}`,
    `opacity:${entity.opacity}`,
  ];
  if (rotation !== 0 || scale !== 1 || entity.flipH || entity.flipV) {
    const transforms: string[] = [];
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (scale !== 1) transforms.push(`scale(${scale})`);
    if (entity.flipH) transforms.push('scaleX(-1)');
    if (entity.flipV) transforms.push('scaleY(-1)');
    parts.push(`transform:${transforms.join(' ')}`);
  }
  if (entity.borderRadius > 0) {
    parts.push(`border-radius:${entity.borderRadius}px`);
  }
  return parts.join(';');
}

function wrapWidgetInIframe(
  widgetHtml: string,
  config: Record<string, unknown>,
  theme: Record<string, string>,
  width: number,
  height: number,
): string {
  const sdkStub = generateSdkStub(config, theme);
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{overflow:hidden}</style></head><body>${sdkStub}${widgetHtml}</body></html>`;
  return `<iframe srcdoc="${escapeSrcdoc(fullHtml)}" style="width:100%;height:100%;border:none;" sandbox="allow-scripts"></iframe>`;
}

export function entityToHtml(
  entity: CanvasEntity,
  widgetHtmlMap: Record<string, string>,
  widgetInstances: Map<string, WidgetInstance> | WidgetInstance[],
  theme: Record<string, string>,
): string {
  if (!entity.visible) return '';

  const style = entityTransformStyle(entity);
  const dataAttrs = `data-entity-id="${entity.id}" data-entity-type="${entity.type}"`;

  switch (entity.type) {
    case 'text': {
      const content = entity.content ?? '';
      return `<div class="sn-entity sn-text" ${dataAttrs} style="${style};padding:8px;color:var(--sn-text);font-family:var(--sn-font-family,system-ui);overflow:auto;">${escapeHtml(content)}</div>`;
    }

    case 'sticker': {
      const url = entity.assetUrl ?? '';
      if (url) {
        return `<div class="sn-entity sn-sticker" ${dataAttrs} style="${style};overflow:hidden;"><img src="${escapeHtml(url)}" style="width:100%;height:100%;object-fit:contain;" alt="${escapeHtml(entity.name ?? 'sticker')}" /></div>`;
      }
      // Placeholder for stickers without URLs
      return `<div class="sn-entity sn-sticker" ${dataAttrs} style="${style};display:flex;align-items:center;justify-content:center;background:var(--sn-surface);border:1px dashed var(--sn-border);border-radius:var(--sn-radius);overflow:hidden;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--sn-text-muted)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </div>`;
    }

    case 'widget': {
      const instanceId = entity.widgetInstanceId;
      const widgetId = entity.widgetId ?? '';
      let instance: WidgetInstance | undefined;

      if (instanceId) {
        if (widgetInstances instanceof Map) {
          instance = widgetInstances.get(instanceId) ?? undefined;
        } else {
          instance = widgetInstances.find(i => i.id === instanceId);
        }
      }

      const html = widgetHtmlMap[widgetId];
      if (html) {
        const config = instance?.config ?? entity.config ?? {};
        const iframe = wrapWidgetInIframe(html, config, theme, entity.transform.size.width, entity.transform.size.height);
        return `<div class="sn-entity sn-widget" ${dataAttrs} style="${style};overflow:hidden;border-radius:var(--sn-radius);border:1px solid var(--sn-border);background:var(--sn-surface);">${iframe}</div>`;
      }

      // Widget placeholder when HTML not available
      return `<div class="sn-entity sn-widget" ${dataAttrs} style="${style};display:flex;align-items:center;justify-content:center;background:var(--sn-surface);border:1px solid var(--sn-border);border-radius:var(--sn-radius);flex-direction:column;gap:8px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sn-accent)" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M8 12h8M12 8v8"/></svg>
        <span style="font-family:var(--sn-font-family,system-ui);font-size:12px;color:var(--sn-text-muted);">${escapeHtml(entity.name ?? widgetId)}</span>
      </div>`;
    }

    case 'shape': {
      return `<div class="sn-entity sn-shape" ${dataAttrs} style="${style};background:var(--sn-accent);opacity:0.3;border-radius:var(--sn-radius);"></div>`;
    }

    case 'group': {
      // Groups render as a transparent container — children render at their own positions
      return `<div class="sn-entity sn-group" ${dataAttrs} style="${style};border:1px dashed var(--sn-border);border-radius:var(--sn-radius);pointer-events:none;"></div>`;
    }

    case 'docker': {
      return `<div class="sn-entity sn-docker" ${dataAttrs} style="${style};background:var(--sn-surface-glass,var(--sn-surface));border:1px solid var(--sn-border);border-radius:var(--sn-radius);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;">
        <span style="font-family:var(--sn-font-family,system-ui);font-size:12px;color:var(--sn-text-muted);">Docker: ${escapeHtml(entity.name ?? entity.id)}</span>
      </div>`;
    }

    default: {
      // Generic entity placeholder
      return `<div class="sn-entity" ${dataAttrs} style="${style};background:var(--sn-surface);border:1px solid var(--sn-border);border-radius:var(--sn-radius);display:flex;align-items:center;justify-content:center;">
        <span style="font-family:var(--sn-font-family,system-ui);font-size:11px;color:var(--sn-text-muted);">${escapeHtml(entity.type)}: ${escapeHtml(entity.name ?? entity.id)}</span>
      </div>`;
    }
  }
}

// ============================================================================
// Canvas Renderer
// ============================================================================

export interface RenderCanvasOptions {
  theme?: string;
  zoom?: number;
  center?: Point2D;
  showGrid?: boolean;
  title?: string;
}

export function renderCanvas(
  entities: CanvasEntity[],
  viewport: ViewportState,
  widgetHtmlMap: Record<string, string>,
  widgetInstances: WidgetInstance[],
  options: RenderCanvasOptions = {},
): string {
  const themeName = options.theme ?? 'midnight-aurora';
  const themeTokens = getThemeTokens(themeName);
  const themeCss = generateThemeCss(themeName);
  const zoom = options.zoom ?? viewport.zoom;
  const centerX = options.center?.x ?? viewport.offset.x;
  const centerY = options.center?.y ?? viewport.offset.y;
  const title = options.title ?? 'StickerNest Canvas';

  // Sort entities by z-index
  const sorted = [...entities].sort((a, b) => a.zIndex - b.zIndex);

  // Build entity HTML
  const instanceMap = new Map(widgetInstances.map(i => [i.id, i]));
  const entityHtmlParts = sorted.map(e => entityToHtml(e, widgetHtmlMap, instanceMap, themeTokens));

  // Calculate bounding box for auto-framing if no explicit viewport
  let autoTransform = `translate(${centerX}px, ${centerY}px) scale(${zoom})`;
  if (entities.length > 0 && centerX === 0 && centerY === 0 && zoom === 1) {
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
    const fitZoom = Math.min(scaleX, scaleY, 2); // Cap at 2x
    const offsetX = (vw / 2) - ((minX + maxX) / 2) * fitZoom;
    const offsetY = (vh / 2) - ((minY + maxY) / 2) * fitZoom;
    autoTransform = `translate(${offsetX}px, ${offsetY}px) scale(${fitZoom})`;
  }

  const gridOverlay = options.showGrid ? `
    <div class="sn-grid" style="position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,var(--sn-border) 1px,transparent 1px);background-size:40px 40px;opacity:0.4;"></div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
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
  ${gridOverlay}
  <div class="sn-canvas" id="canvas" style="transform: ${autoTransform}">
    ${entityHtmlParts.join('\n    ')}
  </div>
</div>
<div class="sn-watermark">StickerNest</div>
<div class="sn-info-bar" id="infobar">
  <span id="zoom-display">100%</span>
  <span>${entities.length} entities</span>
</div>
<script>
(function() {
  var viewport = document.getElementById('viewport');
  var canvas = document.getElementById('canvas');
  var zoomDisplay = document.getElementById('zoom-display');

  // Parse current transform
  var currentZoom = ${zoom};
  var panX = ${centerX};
  var panY = ${centerY};

  ${entities.length > 0 && centerX === 0 && centerY === 0 ? `
  // Auto-framed — extract from CSS
  var m = canvas.style.transform.match(/translate\\(([\\d.-]+)px,\\s*([\\d.-]+)px\\)\\s*scale\\(([\\d.]+)\\)/);
  if (m) { panX = parseFloat(m[1]); panY = parseFloat(m[2]); currentZoom = parseFloat(m[3]); }
  ` : ''}

  function applyTransform() {
    canvas.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + currentZoom + ')';
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
  viewport.addEventListener('pointerup', function(e) {
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
})();
</script>
</body>
</html>`;
}

// ============================================================================
// Single Widget Renderer
// ============================================================================

export interface RenderWidgetOptions {
  theme?: string;
  width?: number;
  height?: number;
  title?: string;
}

export function renderWidget(
  instance: WidgetInstance,
  widgetHtml: string,
  options: RenderWidgetOptions = {},
): string {
  const themeName = options.theme ?? 'midnight-aurora';
  const themeTokens = getThemeTokens(themeName);
  const themeCss = generateThemeCss(themeName);
  const width = options.width ?? 400;
  const height = options.height ?? 300;
  const title = options.title ?? `Widget: ${instance.widgetId}`;

  const iframe = wrapWidgetInIframe(widgetHtml, instance.config, themeTokens, width, height);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  :root {
${themeCss}
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%; height: 100%; overflow: hidden;
    background: var(--sn-bg);
    display: flex; align-items: center; justify-content: center;
  }
  .sn-widget-container {
    width: ${width}px; height: ${height}px;
    border-radius: var(--sn-radius);
    border: 1px solid var(--sn-border);
    overflow: hidden;
    background: var(--sn-surface);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
  }
  .sn-watermark {
    position: fixed; bottom: 8px; right: 12px;
    font-size: 11px; color: var(--sn-text-muted);
    opacity: 0.4; font-family: var(--sn-font-family, system-ui);
  }
</style>
</head>
<body>
<div class="sn-widget-container">
  ${iframe}
</div>
<div class="sn-watermark">StickerNest</div>
</body>
</html>`;
}

// ============================================================================
// Raw HTML Preview Renderer
// ============================================================================

export interface RenderPreviewOptions {
  theme?: string;
  width?: number;
  height?: number;
  config?: Record<string, unknown>;
  title?: string;
}

export function renderWidgetPreview(
  html: string,
  options: RenderPreviewOptions = {},
): string {
  const themeName = options.theme ?? 'midnight-aurora';
  const themeTokens = getThemeTokens(themeName);
  const themeCss = generateThemeCss(themeName);
  const width = options.width ?? 400;
  const height = options.height ?? 300;
  const config = options.config ?? {};
  const title = options.title ?? 'Widget Preview';

  const iframe = wrapWidgetInIframe(html, config, themeTokens, width, height);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  :root {
${themeCss}
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%; height: 100%; overflow: hidden;
    background: var(--sn-bg);
    display: flex; align-items: center; justify-content: center;
  }
  .sn-preview-frame {
    width: ${width}px; height: ${height}px;
    border-radius: var(--sn-radius);
    border: 1px solid var(--sn-border);
    overflow: hidden;
    background: var(--sn-surface);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    position: relative;
  }
  .sn-preview-label {
    position: absolute; top: -24px; left: 0;
    font-size: 11px; color: var(--sn-text-muted);
    font-family: var(--sn-font-family, system-ui);
  }
  .sn-watermark {
    position: fixed; bottom: 8px; right: 12px;
    font-size: 11px; color: var(--sn-text-muted);
    opacity: 0.4; font-family: var(--sn-font-family, system-ui);
  }
</style>
</head>
<body>
<div style="position:relative;">
  <div class="sn-preview-label">Preview — ${width}×${height}</div>
  <div class="sn-preview-frame">
    ${iframe}
  </div>
</div>
<div class="sn-watermark">StickerNest</div>
</body>
</html>`;
}
