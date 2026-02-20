/**
 * Runtime Layer Initialization
 *
 * Initializes the widget runtime: iframe pool warm-up,
 * built-in widget registration, and bus subscriptions.
 *
 * @module runtime/init
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import type { BusEvent } from '@sn/types';

import { bus } from '../kernel/bus';
import { useWidgetStore } from '../kernel/stores/widget/widget.store';
import type { WidgetRegistryEntry } from '../kernel/stores/widget/widget.store';

import { createIframePool, DEFAULT_WARMUP_COUNT } from './pool/iframe-pool';
import type { IframePool } from './pool/iframe-pool';
import { createRateLimiter } from './security/rate-limiter';
import type { RateLimiter } from './security/rate-limiter';

let initialized = false;
let pool: IframePool | null = null;
let rateLimiter: RateLimiter | null = null;
const busUnsubscribes: Array<() => void> = [];

/**
 * Built-in widget definitions.
 */
const BUILTIN_WIDGETS: WidgetRegistryEntry[] = [
  {
    widgetId: 'sn.builtin.sticky-note',
    manifest: {
      id: 'sn.builtin.sticky-note',
      name: 'Sticky Note',
      version: '1.0.0',
      description: 'A simple sticky note widget',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: [],
      category: 'productivity',
      permissions: [],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { minWidth: 150, minHeight: 100, maxWidth: 600, maxHeight: 600, defaultWidth: 250, defaultHeight: 200, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '<div style="padding:12px;font-family:var(--sn-font-family,sans-serif);color:var(--sn-text,#333);background:var(--sn-surface,#fef3c7);height:100%"><textarea style="width:100%;height:100%;border:none;background:transparent;resize:none;font-family:inherit;color:inherit;outline:none" placeholder="Type here..."></textarea></div><script>StickerNest.register({id:"sn.builtin.sticky-note",name:"Sticky Note",version:"1.0.0",events:{emits:[],subscribes:[]}});StickerNest.ready();</script>',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.clock',
    manifest: {
      id: 'sn.builtin.clock',
      name: 'Clock',
      version: '1.0.0',
      description: 'A simple clock/timer widget',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: [],
      category: 'utilities',
      permissions: [],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { minWidth: 120, minHeight: 60, maxWidth: 400, maxHeight: 200, defaultWidth: 200, defaultHeight: 100, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '<div id="clock" style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--sn-font-family,monospace);font-size:24px;color:var(--sn-text,#333);background:var(--sn-surface,#fff)"></div><script>StickerNest.register({id:"sn.builtin.clock",name:"Clock",version:"1.0.0",events:{emits:[],subscribes:[]}});function tick(){document.getElementById("clock").textContent=new Date().toLocaleTimeString();}tick();setInterval(tick,1000);StickerNest.ready();</script>',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.counter',
    manifest: {
      id: 'sn.builtin.counter',
      name: 'Counter',
      version: '1.0.0',
      description: 'A simple counter widget',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: [],
      category: 'utilities',
      permissions: [],
      events: {
        emits: [{ name: 'counter.changed', description: 'Counter value changed' }],
        subscribes: [],
      },
      config: { fields: [] },
      size: { minWidth: 120, minHeight: 80, maxWidth: 300, maxHeight: 200, defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:var(--sn-font-family,sans-serif);color:var(--sn-text,#333);background:var(--sn-surface,#fff)"><span id="val" style="font-size:32px;margin:8px">0</span><div><button onclick="change(-1)" style="padding:4px 12px;margin:4px;cursor:pointer">-</button><button onclick="change(1)" style="padding:4px 12px;margin:4px;cursor:pointer">+</button></div></div><script>var c=0;function change(d){c+=d;document.getElementById("val").textContent=c;StickerNest.emit("counter.changed",{value:c});StickerNest.setState("count",c);}StickerNest.register({id:"sn.builtin.counter",name:"Counter",version:"1.0.0",events:{emits:[{name:"counter.changed"}],subscribes:[]}});StickerNest.getState("count").then(function(v){if(typeof v==="number"){c=v;document.getElementById("val").textContent=c;}});StickerNest.ready();</script>',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.image-viewer',
    manifest: {
      id: 'sn.builtin.image-viewer',
      name: 'Image Viewer',
      version: '1.0.0',
      description: 'An image viewer widget',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: [],
      category: 'media',
      permissions: [],
      events: { emits: [], subscribes: [] },
      config: { fields: [{ name: 'src', type: 'string', label: 'Image URL', default: '', required: false }] },
      size: { minWidth: 100, minHeight: 100, maxWidth: 1200, maxHeight: 900, defaultWidth: 400, defaultHeight: 300, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:var(--sn-surface,#f5f5f5)"><img id="img" style="max-width:100%;max-height:100%;object-fit:contain" alt=""></div><script>StickerNest.register({id:"sn.builtin.image-viewer",name:"Image Viewer",version:"1.0.0",events:{emits:[],subscribes:[]}});var cfg=StickerNest.getConfig();if(cfg.src)document.getElementById("img").src=cfg.src;StickerNest.ready();</script>',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.markdown-note',
    manifest: {
      id: 'sn.builtin.markdown-note',
      name: 'Markdown Note',
      version: '1.0.0',
      description: 'A markdown note widget',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: [],
      category: 'productivity',
      permissions: [],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { minWidth: 200, minHeight: 150, maxWidth: 800, maxHeight: 800, defaultWidth: 400, defaultHeight: 300, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '<div style="padding:12px;height:100%;font-family:var(--sn-font-family,sans-serif);color:var(--sn-text,#333);background:var(--sn-surface,#fff)"><div contenteditable="true" style="outline:none;height:100%;overflow-y:auto" id="md"></div></div><script>StickerNest.register({id:"sn.builtin.markdown-note",name:"Markdown Note",version:"1.0.0",events:{emits:[],subscribes:[]}});StickerNest.getState("content").then(function(v){if(v)document.getElementById("md").innerHTML=v;});document.getElementById("md").addEventListener("input",function(){StickerNest.setState("content",this.innerHTML);});StickerNest.ready();</script>',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
];

/**
 * Register built-in widgets in the widget store.
 */
function registerBuiltInWidgets(): void {
  const store = useWidgetStore.getState();
  for (const widget of BUILTIN_WIDGETS) {
    if (!store.registry[widget.widgetId]) {
      store.registerWidget(widget);
    }
  }
}

/**
 * Initialize the widget runtime.
 * Call once at app startup after initKernel().
 */
export function initRuntime(): void {
  if (initialized) return;

  // 1. Create and warm up iframe pool
  pool = createIframePool();
  pool.warmUp(DEFAULT_WARMUP_COUNT);

  // 2. Create shared rate limiter
  rateLimiter = createRateLimiter();

  // 3. Register built-in widgets
  registerBuiltInWidgets();

  // 4. Subscribe to bus events relevant to runtime
  const unsubTheme = bus.subscribe('shell.theme.changed', (_event: BusEvent) => {
    // Theme changes are forwarded to individual WidgetFrame instances
    // via their useEffect on theme prop — no global action needed here
  });
  busUnsubscribes.push(unsubTheme);

  const unsubUninstall = bus.subscribe(
    'marketplace.widget.uninstalled',
    (event: BusEvent) => {
      const payload = event.payload as { widgetId?: string };
      if (payload.widgetId) {
        // Remove widget from registry
        useWidgetStore.getState().unregisterWidget(payload.widgetId);
      }
    },
  );
  busUnsubscribes.push(unsubUninstall);

  initialized = true;
}

/**
 * Tear down the runtime and clean up all resources.
 */
export function teardownRuntime(): void {
  if (!initialized) return;

  // Unsubscribe from bus
  for (const unsub of busUnsubscribes) {
    unsub();
  }
  busUnsubscribes.length = 0;

  // Destroy pool
  pool?.destroy();
  pool = null;

  // Destroy rate limiter
  rateLimiter?.destroy();
  rateLimiter = null;

  initialized = false;
}

/**
 * Check if the runtime is currently initialized.
 */
export function isRuntimeInitialized(): boolean {
  return initialized;
}

/**
 * Get the shared iframe pool.
 */
export function getIframePool(): IframePool | null {
  return pool;
}

/**
 * Get the shared rate limiter.
 */
export function getRateLimiter(): RateLimiter | null {
  return rateLimiter;
}
