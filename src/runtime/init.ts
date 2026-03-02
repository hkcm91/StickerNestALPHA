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
import { MarketplaceEvents } from '@sn/types';

import { bus } from '../kernel/bus';
import { useAuthStore } from '../kernel/stores/auth/auth.store';
import { useCanvasStore } from '../kernel/stores/canvas/canvas.store';
import { useWidgetStore } from '../kernel/stores/widget/widget.store';
import type { WidgetRegistryEntry } from '../kernel/stores/widget/widget.store';


import { createAiHandler } from './integrations/ai-handler';
import { createAuthHandler } from './integrations/auth-integration';
import { createCheckoutHandler } from './integrations/checkout-integration';
import { createNotionHandler } from './integrations/notion-handler';
import { getIntegrationProxy } from './integrations/singleton';
import { createSocialHandler } from './integrations/social-handler';
import { createIframePool, DEFAULT_WARMUP_COUNT } from './pool/iframe-pool';
import type { IframePool } from './pool/iframe-pool';
import { createRateLimiter } from './security/rate-limiter';
import type { RateLimiter } from './security/rate-limiter';
import { imageGeneratorManifest, kanbanManifest, todoListManifest } from './widgets';
import { BUILT_IN_WIDGET_HTML } from './widgets/built-in-html';

let initialized = false;
let pool: IframePool | null = null;
let rateLimiter: RateLimiter | null = null;
const busUnsubscribes: Array<() => void> = [];

/**
 * Built-in widget definitions.
 */
const BUILTIN_WIDGETS: WidgetRegistryEntry[] = [
  {
    widgetId: 'sn.builtin.image-generator',
    manifest: imageGeneratorManifest,
    htmlContent: '', // Not used for inline widgets
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.kanban',
    manifest: kanbanManifest,
    htmlContent: '', // Not used for inline widgets
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.todo-list',
    manifest: todoListManifest,
    htmlContent: '', // Not used for inline widgets
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
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
  {
    widgetId: 'sn.builtin.social-feed',
    manifest: {
      id: 'sn.builtin.social-feed',
      name: 'Social Feed',
      version: '1.0.0',
      description: 'A social feed widget showing posts from followed users',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['social'],
      category: 'social',
      permissions: ['ai'],
      events: {
        emits: [
          { name: 'social.post.liked', description: 'User liked a post' },
          { name: 'social.post.unliked', description: 'User unliked a post' },
        ],
        subscribes: [],
      },
      config: {
        fields: [
          { name: 'feedType', type: 'string', label: 'Feed Type', default: 'home', required: false },
        ],
      },
      size: { minWidth: 300, minHeight: 400, maxWidth: 600, maxHeight: 800, defaultWidth: 400, defaultHeight: 600, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: `<style>
*{box-sizing:border-box;margin:0;padding:0}
.feed{font-family:var(--sn-font-family,sans-serif);color:var(--sn-text,#333);background:var(--sn-surface,#fff);height:100%;overflow-y:auto;padding:12px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid var(--sn-border,#e5e5e5);margin-bottom:12px}
.header h2{font-size:18px;font-weight:600}
.badge{background:var(--sn-accent,#3b82f6);color:#fff;border-radius:12px;padding:2px 8px;font-size:12px}
.post{padding:12px;border:1px solid var(--sn-border,#e5e5e5);border-radius:8px;margin-bottom:12px}
.post-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.avatar{width:32px;height:32px;border-radius:50%;background:var(--sn-accent,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600}
.author{font-weight:600;font-size:14px}
.time{color:var(--sn-text-muted,#888);font-size:12px}
.content{font-size:14px;line-height:1.5;margin-bottom:8px}
.actions{display:flex;gap:16px}
.btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;color:var(--sn-text-muted,#888);font-size:13px}
.btn:hover{color:var(--sn-accent,#3b82f6)}
.btn.liked{color:#ef4444}
.empty{text-align:center;padding:40px;color:var(--sn-text-muted,#888)}
.loading{text-align:center;padding:20px}
</style>
<div class="feed">
<div class="header"><h2>Feed</h2><span class="badge" id="notif">0</span></div>
<div id="posts"><div class="loading">Loading...</div></div>
</div>
<script>
var social=StickerNest.integration("social");
var posts=[];
var likedPosts={};
function init(){
loadFeed();
loadNotifCount();
}
function loadFeed(){
var cfg=StickerNest.getConfig();
var feedType=cfg.feedType||"home";
social.query({type:"getFeed",feedType:feedType,limit:20}).then(function(res){
posts=res.items||[];
render();
}).catch(function(e){
document.getElementById("posts").innerHTML='<div class="empty">'+e.message+'</div>';
});
}
function loadNotifCount(){
social.query({type:"getUnreadCount"}).then(function(count){
document.getElementById("notif").textContent=count||0;
}).catch(function(){});
}
function render(){
var el=document.getElementById("posts");
if(!posts.length){el.innerHTML='<div class="empty">No posts yet. Follow some users!</div>';return;}
el.innerHTML=posts.map(function(p){
var liked=likedPosts[p.id];
return '<div class="post" data-id="'+p.id+'">'+
'<div class="post-header"><div class="avatar">'+p.authorId.charAt(0).toUpperCase()+'</div>'+
'<div><div class="author">User '+p.authorId.slice(0,8)+'</div>'+
'<div class="time">'+new Date(p.createdAt).toLocaleDateString()+'</div></div></div>'+
'<div class="content">'+escapeHtml(p.content)+'</div>'+
'<div class="actions"><button class="btn'+(liked?" liked":"")+'" onclick="toggleLike(\\''+p.id+'\\')">'+
(liked?"♥":"♡")+' '+(p.reactionCount||0)+'</button></div></div>';
}).join("");
}
function escapeHtml(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
function toggleLike(postId){
var liked=likedPosts[postId];
if(liked){
social.mutate({type:"unreact",targetType:"post",targetId:postId}).then(function(){
likedPosts[postId]=false;
StickerNest.emit("social.post.unliked",{postId:postId});
loadFeed();
}).catch(function(e){console.error(e);});
}else{
social.mutate({type:"react",targetType:"post",targetId:postId,reactionType:"like"}).then(function(){
likedPosts[postId]=true;
StickerNest.emit("social.post.liked",{postId:postId});
loadFeed();
}).catch(function(e){console.error(e);});
}
}
StickerNest.register({id:"sn.builtin.social-feed",name:"Social Feed",version:"1.0.0",events:{emits:[{name:"social.post.liked"},{name:"social.post.unliked"}],subscribes:[]}});
init();
StickerNest.ready();
</script>`,
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  // ── Commerce Widgets ──────────────────────────────────────────────────
  {
    widgetId: 'sn.builtin.signup',
    manifest: {
      id: 'sn.builtin.signup',
      name: 'Sign Up',
      version: '1.0.0',
      description: 'Email/password signup and login form for canvas visitors',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'auth'],
      category: 'commerce',
      permissions: ['auth'],
      events: {
        emits: [
          { name: 'auth.signed_up', description: 'User signed up' },
          { name: 'auth.signed_in', description: 'User signed in' },
          { name: 'auth.signed_out', description: 'User signed out' },
        ],
        subscribes: [],
      },
      config: { fields: [] },
      size: { minWidth: 280, minHeight: 320, maxWidth: 500, maxHeight: 500, defaultWidth: 360, defaultHeight: 400, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '', // Loaded from BUILT_IN_WIDGET_HTML['wgt-signup'] at runtime
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.subscribe',
    manifest: {
      id: 'sn.builtin.subscribe',
      name: 'Subscribe',
      version: '1.0.0',
      description: 'Displays canvas subscription tiers for visitor purchase',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'subscription'],
      category: 'commerce',
      permissions: ['checkout'],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { minWidth: 280, minHeight: 300, maxWidth: 600, maxHeight: 800, defaultWidth: 360, defaultHeight: 500, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '', // Loaded from BUILT_IN_WIDGET_HTML['wgt-subscribe'] at runtime
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.shop',
    manifest: {
      id: 'sn.builtin.shop',
      name: 'Shop',
      version: '1.0.0',
      description: 'Displays canvas shop items for purchase',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'shop'],
      category: 'commerce',
      permissions: ['checkout'],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { minWidth: 300, minHeight: 300, maxWidth: 800, maxHeight: 800, defaultWidth: 480, defaultHeight: 500, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '', // Loaded from BUILT_IN_WIDGET_HTML['wgt-shop'] at runtime
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.creator-setup',
    manifest: {
      id: 'sn.builtin.creator-setup',
      name: 'Creator Setup',
      version: '1.0.0',
      description: 'Multi-page Stripe Connect onboarding for creators',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'creator'],
      category: 'commerce',
      permissions: ['checkout'],
      events: {
        emits: [{ name: 'commerce.connect.completed', description: 'Creator finished Stripe Connect onboarding' }],
        subscribes: [],
      },
      config: { fields: [] },
      size: { minWidth: 320, minHeight: 400, maxWidth: 520, maxHeight: 700, defaultWidth: 440, defaultHeight: 560, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.tier-manager',
    manifest: {
      id: 'sn.builtin.tier-manager',
      name: 'Tier Manager',
      version: '1.0.0',
      description: 'Create, edit, and delete subscription tiers (multi-page form)',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'creator'],
      category: 'commerce',
      permissions: ['checkout'],
      events: {
        emits: [
          { name: 'commerce.tier.created', description: 'Creator created a tier' },
          { name: 'commerce.tier.updated', description: 'Creator updated a tier' },
          { name: 'commerce.tier.deleted', description: 'Creator deleted a tier' },
        ],
        subscribes: [],
      },
      config: { fields: [] },
      size: { minWidth: 320, minHeight: 400, maxWidth: 600, maxHeight: 800, defaultWidth: 440, defaultHeight: 600, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.item-manager',
    manifest: {
      id: 'sn.builtin.item-manager',
      name: 'Item Manager',
      version: '1.0.0',
      description: 'Create, edit, and delete shop items (multi-page form)',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'creator'],
      category: 'commerce',
      permissions: ['checkout'],
      events: {
        emits: [
          { name: 'commerce.item.created', description: 'Creator created an item' },
          { name: 'commerce.item.updated', description: 'Creator updated an item' },
          { name: 'commerce.item.deleted', description: 'Creator deleted an item' },
        ],
        subscribes: [],
      },
      config: { fields: [] },
      size: { minWidth: 320, minHeight: 400, maxWidth: 600, maxHeight: 800, defaultWidth: 440, defaultHeight: 600, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.orders',
    manifest: {
      id: 'sn.builtin.orders',
      name: 'My Orders',
      version: '1.0.0',
      description: 'Purchase history and active subscriptions for buyers',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'buyer'],
      category: 'commerce',
      permissions: ['checkout'],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { minWidth: 300, minHeight: 350, maxWidth: 600, maxHeight: 800, defaultWidth: 420, defaultHeight: 500, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
  {
    widgetId: 'sn.builtin.creator-dashboard',
    manifest: {
      id: 'sn.builtin.creator-dashboard',
      name: 'Creator Dashboard',
      version: '1.0.0',
      description: 'Revenue, subscriber, and order overview for creators',
      author: { name: 'StickerNest', url: 'https://stickernest.com' },
      license: 'MIT',
      tags: ['commerce', 'creator'],
      category: 'commerce',
      permissions: ['checkout'],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { minWidth: 320, minHeight: 400, maxWidth: 700, maxHeight: 800, defaultWidth: 500, defaultHeight: 560, aspectLocked: false },
      entry: 'inline',
      spatialSupport: false,
    },
    htmlContent: '',
    isBuiltIn: true,
    installedAt: new Date().toISOString(),
  },
];

/** Map from registry widgetId to built-in-html key */
const WIDGET_HTML_KEY: Record<string, string> = {
  'sn.builtin.signup': 'wgt-signup',
  'sn.builtin.subscribe': 'wgt-subscribe',
  'sn.builtin.shop': 'wgt-shop',
  'sn.builtin.creator-setup': 'wgt-creator-setup',
  'sn.builtin.tier-manager': 'wgt-tier-manager',
  'sn.builtin.item-manager': 'wgt-item-manager',
  'sn.builtin.orders': 'wgt-orders',
  'sn.builtin.creator-dashboard': 'wgt-creator-dashboard',
};

/**
 * Register built-in widgets in the widget store.
 */
function registerBuiltInWidgets(): void {
  const store = useWidgetStore.getState();
  for (const widget of BUILTIN_WIDGETS) {
    if (!store.registry[widget.widgetId]) {
      // Populate htmlContent from BUILT_IN_WIDGET_HTML for commerce widgets
      const htmlKey = WIDGET_HTML_KEY[widget.widgetId];
      if (htmlKey && !widget.htmlContent) {
        widget.htmlContent = BUILT_IN_WIDGET_HTML[htmlKey] ?? '';
      }
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

  // 4. Register integration handlers
  const proxy = getIntegrationProxy();
  proxy.register('ai', createAiHandler());
  proxy.register('social', createSocialHandler(() => useAuthStore.getState().user?.id ?? null));
  proxy.register(
    'notion',
    createNotionHandler(() => ({
      userId: useAuthStore.getState().user?.id ?? null,
      // widgetId and instanceId are set per-request by WidgetFrame
    })),
  );
  proxy.register('auth', createAuthHandler());
  proxy.register(
    'checkout',
    createCheckoutHandler(() => useCanvasStore.getState().activeCanvasId),
  );

  // 5. Subscribe to bus events relevant to runtime
  const unsubTheme = bus.subscribe('shell.theme.changed', (_event: BusEvent) => {
    // Theme changes are forwarded to individual WidgetFrame instances
    // via their useEffect on theme prop — no global action needed here
  });
  busUnsubscribes.push(unsubTheme);

  const unsubUninstall = bus.subscribe(
    MarketplaceEvents.WIDGET_UNINSTALLED,
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

  // Unregister integration handlers
  getIntegrationProxy().unregister('ai');
  getIntegrationProxy().unregister('social');
  getIntegrationProxy().unregister('notion');
  getIntegrationProxy().unregister('auth');
  getIntegrationProxy().unregister('checkout');

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
