# StickerNest V5 — Layer 1: Runtime — Complete Build Plan

## Document Purpose

This is the full-spec build plan for Layer 1 (Runtime) of StickerNest V5. It covers the widget execution engine — iframe sandboxing, the postMessage bridge protocol, the Widget SDK, widget lifecycle management, inline and 3D execution modes, manifests, and security hardening. It also covers the development infrastructure updates needed for this phase (MCPs, skills, agents, parallel sessions, Ralph loops) and the testing strategy that gates promotion to Layer 2.

**Iron Rule #2 applies here:** Widgets are untrusted guests. Every widget runs in an iframe sandbox. No widget gets access to the host DOM, cookies, localStorage, or the parent window.

**Prerequisite:** Layer 0 (Kernel) acceptance test passes — all event bus, connection registry, stores, and Supabase tests green with 90%+ coverage.

---

## 1. Runtime Architecture Overview

### What Lives in the Runtime

```
src/runtime/
├── iframe/                 # Sandboxed widget execution (default + most critical path)
│   ├── WidgetFrame.tsx     # React component wrapping the sandbox iframe
│   ├── bridge.ts           # postMessage bridge — host side
│   ├── message-queue.ts    # Queues events until widget signals READY
│   ├── message-types.ts    # HostMessage and WidgetMessage discriminated unions
│   ├── message-validator.ts# Zod schemas for all message types
│   └── index.ts
├── sdk/                    # Widget SDK (injected into every iframe)
│   ├── sdk-template.ts     # The StickerNest global object
│   ├── sdk-builder.ts      # Assembles srcdoc HTML with SDK + widget code
│   └── index.ts
├── lifecycle/              # Widget lifecycle state machine
│   ├── manager.ts          # Load → Init → Ready → Running → Destroying → Dead
│   ├── error-boundary.tsx  # Catch widget crashes, show error UI, offer reload
│   ├── lazy-loader.ts      # Intersection Observer for viewport-based init
│   └── index.ts
├── inline/                 # Inline React widget execution (trusted built-ins only)
│   ├── InlineWidgetFrame.tsx
│   ├── hooks.ts            # useEmit, useSubscribe, useWidgetState
│   └── index.ts
├── native3d/               # Native 3D widget execution (Three.js / R3F)
│   ├── Widget3DContainer.tsx
│   ├── VRWidgetTexture.tsx  # Renders widget to texture for VR surfaces
│   └── index.ts
├── registry/               # Widget manifest and catalog
│   ├── manifest.ts         # WidgetManifest type, validation, versioning
│   ├── catalog.ts          # In-memory catalog of registered widget types
│   ├── wiring.ts           # Auto-wire and manual wiring between widgets
│   └── index.ts
├── security/               # Security enforcement
│   ├── csp.ts              # Content Security Policy generation for iframes
│   ├── rate-limiter.ts     # Per-widget event emission rate limiting
│   ├── sandbox-policy.ts   # Sandbox attribute configuration
│   └── index.ts
├── pool/                   # iframe pool for performance
│   ├── iframe-pool.ts      # Reuse iframes instead of create/destroy
│   └── index.ts
└── index.ts                # Layer barrel — public API of the runtime
```

### Dependency Rule

The runtime imports from the **kernel** (`src/core/`) only. It consumes the event bus, connection registry, types, and stores. Higher layers (entities, canvas, spatial) import from the runtime.

```typescript
// ✅ Allowed
import { EventBus } from '@core/events';
import { WidgetContract } from '@core/types';
import { useWorkspaceStore } from '@core/store';

// ❌ Forbidden
import { Canvas2D } from '@canvas-2d';     // Higher layer
import { StickerEntity } from '@entities'; // Higher layer
```

### Three Execution Modes

| Mode | Component | Trust Level | Use Case | Overhead |
|------|-----------|-------------|----------|----------|
| **Sandboxed** | `WidgetFrame` | Untrusted (default) | All third-party widgets, marketplace widgets, user-generated | iframe + postMessage |
| **Inline** | `InlineWidgetFrame` | Trusted only | Built-in core widgets (toolbar, inspector, settings) | Zero — direct React |
| **Native 3D** | `Widget3DContainer` | Trusted only | Spatial/VR widgets (3D objects, environments) | R3F group wrapper |

**Decision:** Sandboxed is always the default. A widget only gets inline or native3D execution if it's a first-party built-in. Third-party widgets NEVER get inline access.

---

## 2. iframe Sandbox (The Critical Path)

The iframe sandbox is the heart of the runtime. Everything else is secondary until this works perfectly.

### 2.1 WidgetFrame Component

The React component that wraps every sandboxed widget:

```typescript
interface WidgetFrameProps {
  stickerId: string;
  widgetCode: string;        // The widget's JS/HTML source
  config: Record<string, unknown>;
  theme: ThemeTokens;
  visible: boolean;          // Controls display:none, NEVER unmounts
}
```

**Implementation rules (Draft 3 bug fixes baked in):**

1. **`sandbox="allow-scripts allow-forms"` — NO `allow-same-origin`**. Without same-origin, the iframe cannot access the parent's DOM, cookies, localStorage, or sessionStorage. This is the security foundation.

2. **`srcdoc`-based loading.** Widget code is injected as a string via the `srcdoc` attribute. No external URLs, no `src` pointing to a server. The widget bundle is self-contained HTML.

3. **Memoize `srcdoc` with `useMemo`.** If the srcdoc string reference changes between renders, React reloads the entire iframe. The memoization key is `[stickerId, widgetCode]` — config and theme changes are delivered via postMessage, not srcdoc rebuild.

4. **Never conditionally render.** Always render the iframe. Use `display: none` via a style prop to hide it. Conditional rendering (`{visible && <iframe/>}`) destroys and recreates the iframe, killing all widget state.

5. **Stable `key` prop.** The key is the sticker ID, which never changes for the lifetime of the sticker. Never use array index, never use a generated key that changes.

6. **Lazy initialization via Intersection Observer.** Don't set `srcdoc` until the widget's sticker enters the viewport. This means off-screen widgets don't consume iframe resources until needed.

### 2.2 Bridge Protocol (postMessage)

All communication between host and widget happens exclusively through `postMessage`. No shared memory, no shared globals, no direct function calls.

#### Messages FROM Host TO Widget

```typescript
type HostMessage =
  | { type: 'INIT'; stickerId: string; config: Record<string, unknown>; theme: ThemeTokens }
  | { type: 'EVENT'; event: StickerNestEvent }
  | { type: 'CONFIG_UPDATE'; config: Record<string, unknown> }
  | { type: 'THEME_UPDATE'; theme: ThemeTokens }
  | { type: 'RESIZE'; width: number; height: number }
  | { type: 'STATE_RESTORE'; state: Record<string, unknown> }
  | { type: 'DESTROY' }
```

#### Messages FROM Widget TO Host

```typescript
type WidgetMessage =
  | { type: 'READY' }
  | { type: 'EMIT'; eventType: string; payload: unknown }
  | { type: 'STATE_SAVE'; state: Record<string, unknown> }
  | { type: 'RESIZE_REQUEST'; width: number; height: number }
  | { type: 'LOG'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'REGISTER'; contract: WidgetContract }
```

#### Bridge Rules

- **Message validation on every incoming message.** Both host and widget validate message structure with Zod schemas before processing. Malformed messages are logged and discarded.
- **Origin verification.** The host only accepts messages from its own iframes (check `event.source` against known iframe contentWindow references). Widgets verify messages come from the parent (`event.source === window.parent`).
- **No raw `addEventListener('message')` on `window`.** The bridge abstracts this into typed handlers. One bridge per iframe, one listener per bridge.
- **Message queue for pre-READY events.** If the host sends an EVENT before the widget has signaled READY, the bridge queues it. On READY, the queue flushes in order.

### 2.3 Widget SDK Template

The SDK is a JavaScript object injected into every iframe's `srcdoc`. This is the API surface that widget authors interact with.

```javascript
// Injected into every widget iframe
window.StickerNest = {
  // ═══ Event Bus Integration ═══
  emit(eventType, payload) { /* postMessage → host → bus */ },
  on(eventType, callback) { /* registers handler, host forwards matching events */ },
  off(eventType, callback) { /* unregisters handler */ },

  // ═══ State Persistence ═══
  getState() { /* returns last restored state or {} */ },
  setState(state) { /* postMessage STATE_SAVE → host persists to workspace */ },

  // ═══ Configuration ═══
  getConfig() { /* returns config from last INIT/CONFIG_UPDATE */ },
  getTheme() { /* returns theme tokens from last INIT/THEME_UPDATE */ },

  // ═══ Registration ═══
  register(contract) { /* postMessage REGISTER → host adds to connection registry */ },

  // ═══ Layout ═══
  requestResize(width, height) { /* postMessage RESIZE_REQUEST → host decides */ },

  // ═══ Logging (visible in host inspector) ═══
  log(...args) { /* postMessage LOG info */ },
  warn(...args) { /* postMessage LOG warn */ },
  error(...args) { /* postMessage LOG error */ },

  // ═══ Metadata ═══
  stickerId: null,  // Set on INIT
  version: '1.0.0', // SDK version
};
```

**SDK Builder:** The `sdk-builder.ts` module assembles the final `srcdoc` HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; font-family: system-ui; }
  </style>
</head>
<body>
  <script>
    // === SDK INJECTION ===
    ${sdkTemplate}

    // === MESSAGE HANDLER ===
    ${messageHandler}

    // === WIDGET CODE ===
    ${widgetCode}

    // === AUTO-INIT ===
    // Signal READY after widget code has loaded
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>
```

### 2.4 Lifecycle Management

Widget lifecycle is a state machine with six states:

```
UNLOADED → LOADING → INITIALIZING → READY → RUNNING → DESTROYING → DEAD
                ↑                                           |
                └───────── ERROR (can retry → LOADING) ─────┘
```

**State Transitions:**

| From | To | Trigger | Action |
|------|----|---------|--------|
| UNLOADED | LOADING | Sticker enters viewport (IntersectionObserver) | Build srcdoc, set on iframe |
| LOADING | INITIALIZING | iframe `load` event fires | Send INIT message with stickerId, config, theme |
| INITIALIZING | READY | Widget posts READY message | Flush queued events, register contract |
| READY | RUNNING | First event delivered or timeout | Normal operation — events flow bidirectionally |
| RUNNING | DESTROYING | Sticker removed or canvas unloads | Send DESTROY message, start 100ms grace timer |
| DESTROYING | DEAD | Grace timer expires | Remove iframe from DOM, unregister from registry |
| Any | ERROR | Widget crashes, unresponsive, or invalid messages | Show error UI with reload button |
| ERROR | LOADING | User clicks reload | Reset iframe, restart lifecycle |

**Error Recovery:**

The `error-boundary.tsx` wraps each WidgetFrame and catches:
- Widget crash (no messages for 30s after READY — optional heartbeat)
- Excessive error logs (>50 errors in 10 seconds)
- Invalid message types (possible XSS attempt)
- Widget timeout (no READY within 5 seconds of INIT)

Error UI shows: widget name, error type, "Reload" button, "Remove" button.

---

## 3. Widget Registry & Manifests

### 3.1 Widget Manifest Format

Every widget type has a manifest that describes it to the platform:

```typescript
interface WidgetManifest {
  // Identity
  id: string;                    // Unique widget type ID (e.g., "pomodoro-timer")
  name: string;                  // Human-readable name
  version: string;               // SemVer (e.g., "1.2.0")
  author: string;                // Creator name or org
  description: string;           // What this widget does
  thumbnail?: string;            // Base64 or URL for marketplace listing

  // Protocol
  protocolVersion: string;       // StickerNest SDK version required (e.g., "1.0")
  executionMode: 'sandboxed' | 'inline' | 'native_3d';

  // Contract (events)
  contract: WidgetContract;      // From kernel types — emits[], subscribes[]

  // Configuration
  configSchema?: ConfigField[];  // User-configurable settings
  defaultConfig?: Record<string, unknown>;

  // Constraints
  minWidth?: number;             // Minimum sticker width in pixels
  minHeight?: number;            // Minimum sticker height in pixels
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;           // Default true

  // Permissions (future — for Layer 7 marketplace review)
  permissions?: WidgetPermission[];

  // Size
  codeSize?: number;             // Bytes — enforced max 500KB code
  assetSize?: number;            // Bytes — enforced max 5MB assets
}

interface ConfigField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color';
  label: string;
  default: unknown;
  options?: string[];            // For 'select' type
  description?: string;
}

type WidgetPermission =
  | 'network:cdn'               // Can load from CDN URLs (specific whitelist)
  | 'storage:local'             // Can use widget-scoped localStorage proxy
  | 'media:camera'              // Can access camera (with user permission)
  | 'media:microphone';         // Can access microphone (with user permission)
```

### 3.2 Manifest Validation

```typescript
// On widget registration and marketplace publish
function validateManifest(manifest: WidgetManifest): ValidationResult {
  // Required fields present
  // Version is valid SemVer
  // Protocol version is supported
  // Contract has no duplicate event types
  // Config schema defaults match types
  // Code size within limits
  // No forbidden permissions for sandboxed mode
}
```

### 3.3 Widget Catalog

In-memory registry of available widget types (not instances — instances are stickers):

```typescript
interface WidgetCatalog {
  register(manifest: WidgetManifest, code: string): void;
  unregister(widgetId: string): void;
  get(widgetId: string): { manifest: WidgetManifest; code: string } | null;
  list(): WidgetManifest[];
  search(query: string): WidgetManifest[];

  // Built-in widgets auto-registered on app startup
  registerBuiltIns(): void;
}
```

### 3.4 Event Wiring

The runtime's wiring system connects the kernel's connection registry to actual widget instances:

```typescript
interface WiringManager {
  // Auto-wire: Widget A emits "timer:complete", Widget B subscribes to "timer:complete"
  // → automatically connected when both are on the same canvas
  autoWire(canvas: CanvasState): ConnectionMap;

  // Manual wire: User explicitly draws a connection line between two stickers
  manualWire(sourceStickerId: string, targetStickerId: string, eventType: string): void;

  // Transform wire: Connection with transform node between source and target
  transformWire(
    sourceStickerId: string,
    targetStickerId: string,
    eventType: string,
    transformFn: string  // Serialized JS function
  ): void;

  // Query
  getConnections(stickerId: string): Connection[];
  getConnectionGraph(): AdjacencyGraph;
}
```

---

## 4. Inline & Native 3D Execution

### 4.1 Inline React Widgets

For trusted, first-party built-in widgets that don't need iframe isolation:

```typescript
interface InlineWidgetFrameProps {
  stickerId: string;
  widgetComponent: React.ComponentType<WidgetProps>;
  config: Record<string, unknown>;
  theme: ThemeTokens;
}

interface WidgetProps {
  stickerId: string;
  config: Record<string, unknown>;
  theme: ThemeTokens;
}
```

**Inline widgets use hooks instead of postMessage:**

```typescript
// Hooks for inline widgets — same API surface as the SDK
function useEmit(): (eventType: string, payload: unknown) => void;
function useSubscribe(eventType: string, handler: EventHandler): void;
function useWidgetState<T>(): [T, (state: T) => void];
function useWidgetConfig<T>(): T;
```

**Security constraint:** Inline widgets are registered via a hardcoded allowlist in `src/runtime/inline/allowlist.ts`. There is no API to add inline widgets at runtime. Marketplace widgets can NEVER be inline.

### 4.2 Native 3D Widgets

For widgets that render as 3D objects in the spatial canvas:

```typescript
// R3F component wrapper for 3D widgets
interface Widget3DContainerProps {
  stickerId: string;
  widgetComponent: React.ComponentType<Widget3DProps>;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

interface Widget3DProps {
  stickerId: string;
  config: Record<string, unknown>;
  // Same event bus hooks as inline widgets
}
```

**VRWidgetTexture:** For widgets that need to appear as 2D panels in VR/AR, this component renders the widget to a texture and maps it onto a 3D plane:

```typescript
interface VRWidgetTextureProps {
  stickerId: string;
  widgetCode: string;        // Uses the same iframe sandbox internally
  width: number;             // Texture width in pixels
  height: number;            // Texture height in pixels
  planeWidth?: number;       // 3D plane width in meters (default 1)
  planeHeight?: number;      // 3D plane height in meters (default 0.75)
}
```

**LOD (Level of Detail):** Distant 3D widgets degrade quality to save frames:
- **Near (<2m):** Full resolution texture, interactive
- **Mid (2-10m):** Half-resolution, still receives events
- **Far (>10m):** Static thumbnail, paused (no events)

**Note:** Native 3D and VR texture rendering are stubs in this phase. Full implementation happens in Layer 4 (Spatial). The runtime defines the interfaces and execution mode switching — Layer 4 provides the R3F rendering.

---

## 5. Security

### 5.1 iframe Sandbox Policy

```html
<iframe
  sandbox="allow-scripts allow-forms"
  <!-- NEVER: allow-same-origin -->
  <!-- NEVER: allow-top-navigation -->
  <!-- NEVER: allow-popups -->
  <!-- NEVER: allow-pointer-lock -->
/>
```

**What this prevents:**
- ❌ Access to parent window (`window.parent.document` → blocked)
- ❌ Access to cookies, localStorage, sessionStorage
- ❌ Navigation of the top frame
- ❌ Opening popups or new windows
- ❌ Form submission to external URLs (forms only submit within iframe)
- ❌ Pointer lock (prevents cursor hijacking)

**What this allows:**
- ✅ JavaScript execution (`allow-scripts`)
- ✅ Form elements for UI purposes (`allow-forms`)

### 5.2 Content Security Policy (per iframe)

Injected via `<meta>` tag in the srcdoc:

```
default-src 'none';
script-src 'unsafe-inline';
style-src 'unsafe-inline';
img-src data: blob:;
font-src data:;
connect-src 'none';
```

**This means widgets:**
- Can run inline scripts and styles (they're in srcdoc, so all code is inline)
- Can use data URIs and blob URLs for images/fonts
- CANNOT make network requests (`connect-src 'none'`)
- CANNOT load external scripts or stylesheets
- CANNOT use WebSocket, EventSource, or fetch

**Future:** Widgets with the `network:cdn` permission will get a modified CSP that allows loading from a specific CDN whitelist. This is a Layer 7 marketplace feature.

### 5.3 Message Validation

Every message crossing the bridge is validated before processing:

```typescript
// Host-side validation (incoming from widget)
const WidgetMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('READY') }),
  z.object({ type: z.literal('EMIT'), eventType: z.string().max(100), payload: z.unknown() }),
  z.object({ type: z.literal('STATE_SAVE'), state: z.record(z.unknown()).refine(
    (s) => JSON.stringify(s).length < 1_000_000, // 1MB state limit
    'Widget state exceeds 1MB limit'
  )}),
  z.object({ type: z.literal('RESIZE_REQUEST'), width: z.number().min(50).max(4096), height: z.number().min(50).max(4096) }),
  z.object({ type: z.literal('LOG'), level: z.enum(['info', 'warn', 'error']), message: z.string().max(10_000) }),
  z.object({ type: z.literal('REGISTER'), contract: WidgetContractSchema }),
]);

// Widget-side validation (incoming from host)
const HostMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INIT'), stickerId: z.string(), config: z.record(z.unknown()), theme: z.record(z.unknown()) }),
  z.object({ type: z.literal('EVENT'), event: StickerNestEventSchema }),
  z.object({ type: z.literal('CONFIG_UPDATE'), config: z.record(z.unknown()) }),
  z.object({ type: z.literal('THEME_UPDATE'), theme: z.record(z.unknown()) }),
  z.object({ type: z.literal('RESIZE'), width: z.number(), height: z.number() }),
  z.object({ type: z.literal('STATE_RESTORE'), state: z.record(z.unknown()) }),
  z.object({ type: z.literal('DESTROY') }),
]);
```

### 5.4 Rate Limiting

Per-widget emission rate limiting prevents a rogue widget from flooding the event bus:

```typescript
interface RateLimiter {
  // Default: 100 events/second per widget
  // Configurable per-widget in manifest
  check(stickerId: string): boolean;  // true = allowed, false = throttled
  reset(stickerId: string): void;
  setLimit(stickerId: string, eventsPerSecond: number): void;
}
```

When rate-limited:
- Events are silently dropped (not queued)
- A `widget:rate-limited` event is emitted on the bus (for the inspector)
- The widget receives no indication (prevents probing)

### 5.5 Widget Code Scanning (Pre-publish)

Static analysis of widget code before it enters the catalog:

```typescript
interface CodeScanner {
  scan(code: string): ScanResult;
}

interface ScanResult {
  safe: boolean;
  warnings: string[];
  blocked: string[];    // Patterns that prevent publishing
}

// Blocked patterns:
// - eval(), new Function()
// - document.cookie, localStorage, sessionStorage
// - window.parent, window.top, window.opener
// - XMLHttpRequest, fetch (redundant with CSP, but defense in depth)
// - WebSocket, EventSource
// - importScripts()
```

---

## 6. Performance

### 6.1 iframe Pool

Creating and destroying iframes is expensive. The pool maintains a set of warm iframes that can be reused:

```typescript
interface IframePool {
  acquire(): HTMLIFrameElement;     // Get a warm iframe from the pool
  release(iframe: HTMLIFrameElement): void;  // Return to pool, clear srcdoc
  warmUp(count: number): void;     // Pre-create iframes on app startup
  size(): number;                  // Current pool size
  maxSize: number;                 // Cap (default: 20)
}
```

**Pool lifecycle:**
1. On app start, warm up 5 iframes
2. When a widget needs an iframe, `acquire()` returns one from the pool or creates new
3. When a widget is destroyed, the iframe is cleared and returned to the pool
4. Pool never exceeds `maxSize` — excess iframes are fully destroyed

### 6.2 Lazy Loading

Off-screen widgets don't load until their sticker enters the viewport:

```typescript
interface LazyLoader {
  observe(stickerId: string, element: HTMLElement, onVisible: () => void): void;
  unobserve(stickerId: string): void;
  // Uses IntersectionObserver with rootMargin of 200px (pre-load slightly before visible)
}
```

### 6.3 Memory Limits

- **Widget state:** Max 1MB per widget (enforced in STATE_SAVE validation)
- **Widget code:** Max 500KB source per widget (enforced in manifest validation)
- **Widget assets:** Max 5MB total assets per widget (enforced at publish time)
- **Active iframes:** Max 20 simultaneous loaded widgets (pool limit)
- **Event queue:** Max 1000 queued events per widget before READY (overflow → drop oldest)

### 6.4 Performance Metrics

The runtime exposes performance data to the inspector (Layer 6):

```typescript
interface RuntimeMetrics {
  widgetLoadTime: Map<string, number>;        // stickerId → ms from LOADING to READY
  messageThroughput: Map<string, number>;     // stickerId → messages/sec
  memoryEstimate: Map<string, number>;        // stickerId → estimated bytes
  errorCount: Map<string, number>;            // stickerId → errors since load
  poolUtilization: number;                    // active / maxSize ratio
}
```

---

## 7. MCPs (Dev MCP Updates for Layer 1)

The StickerNest Dev MCP (built during kernel phase) gets new tools for the runtime layer.

### 7.1 New Phase 2 Tools (Activate Now)

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `sn_scaffold_widget` | Generate complete widget bundle | `{ name, emits, subscribes, config, mode }` | widget.html, manifest.json, widget.test.ts |
| `sn_scaffold_hook` | Generate inline widget hooks | `{ name, purpose }` | Hook file with event bus integration |

These were defined during kernel planning but become active now that the runtime exists.

### 7.2 New Phase 3 Tools

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `sn_validate_widget` | Check widget protocol compliance | `{ widgetCode: string }` | Compliance report (bridge protocol, SDK usage, blocked patterns) |
| `sn_trace_message` | Debug bridge message flow | `{ stickerId, messageType? }` | Message log for specific widget |

### 7.3 Architecture Data Updates

Update `data/architecture.json` to include Layer 1 spec:

```json
{
  "layer1": {
    "name": "Runtime",
    "folder": "src/runtime/",
    "description": "Widget execution engine: iframe sandbox, bridge protocol, SDK, lifecycle",
    "acceptanceTest": "Widget in iframe emits events to bus and receives events from other widgets with zero access to host DOM",
    "deepwikiRefs": ["5.1-widget-architecture", "5.2-widget-lifecycle-and-rendering", "5.3-widget-library-and-discovery"],
    "imports": ["@core"],
    "exports": ["WidgetFrame", "InlineWidgetFrame", "Widget3DContainer", "WidgetCatalog", "WiringManager", "useEmit", "useSubscribe", "useWidgetState"]
  }
}
```

### 7.4 Build Tasks — MCPs

| ID | Task |
|----|------|
| R-MCP-1 | Add `sn_scaffold_widget` tool with srcdoc template generation |
| R-MCP-2 | Add `sn_validate_widget` tool with code scanning |
| R-MCP-3 | Add `sn_trace_message` tool for bridge debugging |
| R-MCP-4 | Update architecture.json with Layer 1 spec |
| R-MCP-5 | Add widget manifest template to `templates/` |

---

## 8. Skills (Claude Code)

### 8.1 Project-Level Skills Updates (`.claude/skills/`)

#### `iframe-sandbox` Skill (NEW)

```markdown
# iframe Sandbox Skill

## When to Activate
Triggered when working on files in `src/runtime/iframe/` or when building widget frames.

## Rules
1. ALWAYS use `sandbox="allow-scripts allow-forms"` — NEVER add `allow-same-origin`
2. ALWAYS use srcdoc, never src with external URLs
3. ALWAYS memoize srcdoc with useMemo keyed on [stickerId, widgetCode]
4. NEVER conditionally render iframes — use display:none to hide
5. ALWAYS use stable keys (sticker ID)
6. ALWAYS validate incoming postMessages with Zod schemas
7. ALWAYS queue events before READY signal

## Common Mistakes
- Adding allow-same-origin "for testing" — this destroys the sandbox entirely
- Forgetting to memoize srcdoc — causes iframe reload on every parent re-render
- Using conditional rendering — destroys iframe and all widget state
- Trusting message.origin — always verify event.source against known iframes
- Sending events before READY — widget may not have registered handlers yet

## Anti-Patterns
- Direct DOM access from host to iframe content (impossible with sandbox, but don't try workarounds)
- Storing widget state in the host's React state (use the bridge STATE_SAVE/RESTORE protocol)
- Passing React refs across the iframe boundary (impossible, use postMessage)
```

#### `widget-sdk` Skill (NEW)

```markdown
# Widget SDK Skill

## When to Activate
Triggered when working on files in `src/runtime/sdk/` or when building widget code.

## SDK API Surface
- emit(eventType, payload) — post to bus via bridge
- on(eventType, callback) — subscribe via bridge
- off(eventType, callback) — unsubscribe
- getState() / setState(state) — persistent state
- getConfig() / getTheme() — read-only configuration
- register(contract) — declare event contract
- requestResize(w, h) — request sticker resize
- log/warn/error — console output visible in inspector

## Rules
1. SDK is a POJO — no classes, no prototypes, no this binding
2. SDK is injected once in srcdoc — never hot-reloaded
3. State must be JSON-serializable (no functions, no DOM refs, no circular refs)
4. Event types follow kernel convention: domain:action (e.g., "timer:complete")
5. Widget code runs AFTER SDK injection — SDK is always available
6. register() should be called first, before any emit/on calls

## Template
Always start widget code with:
```js
StickerNest.register({
  widgetId: 'my-widget',
  emits: [{ type: 'my:event', description: '...' }],
  subscribes: [{ type: 'other:event', description: '...' }]
});
```
```

#### `bridge-protocol` Skill (NEW)

```markdown
# Bridge Protocol Skill

## When to Activate
Triggered when working on host↔widget communication or message handling.

## Message Types
Host → Widget: INIT, EVENT, CONFIG_UPDATE, THEME_UPDATE, RESIZE, STATE_RESTORE, DESTROY
Widget → Host: READY, EMIT, STATE_SAVE, RESIZE_REQUEST, LOG, REGISTER

## Rules
1. EVERY message validated with Zod before processing
2. One bridge instance per iframe — never share bridges
3. Message queue holds events until READY — max 1000, drop oldest on overflow
4. DESTROY gives widget 100ms grace period for STATE_SAVE
5. Origin/source verification on ALL incoming messages
6. Log and discard invalid messages — never throw
7. Bridge is bidirectional but asymmetric — host controls lifecycle

## Debugging
- All messages logged to runtime metrics
- sn_trace_message MCP tool traces a specific widget's message flow
- Widget LOG messages appear in host console with [WIDGET:stickerId] prefix
```

### 8.2 Updated Skills

#### `event-bus` Skill (UPDATE)

Add section on widget↔bus integration:

```markdown
## Widget Event Bus Integration
- Sandboxed widgets reach the bus via bridge.ts postMessage relay
- Inline widgets reach the bus via useEmit/useSubscribe hooks (direct)
- Native 3D widgets use the same hooks as inline
- All widget events get `source: stickerId` automatically
- Transform pipeline intercepts BEFORE delivery to target widget
- Rate limiter checks BEFORE event reaches the bus
```

#### `testing` Skill (UPDATE)

Add section on runtime testing patterns:

```markdown
## Runtime Testing
- Use createMockIframe() factory for iframe tests (jsdom doesn't support real iframes)
- Use createMockBridge() for bridge protocol tests
- Message validation tests: one test per message type, plus malformed messages
- Lifecycle tests: use fake timers for timeout/grace period testing
- Never test real iframe sandboxing in unit tests — that's integration/e2e
- Widget SDK tests: mock window.parent.postMessage
```

### 8.3 Build Tasks — Skills

| ID | Task |
|----|------|
| R-SKILL-1 | Create `iframe-sandbox` skill |
| R-SKILL-2 | Create `widget-sdk` skill |
| R-SKILL-3 | Create `bridge-protocol` skill |
| R-SKILL-4 | Update `event-bus` skill with widget integration section |
| R-SKILL-5 | Update `testing` skill with runtime testing patterns |

---

## 9. Agents (Claude Code Subagents)

### 9.1 New Agents for Runtime

#### `widget-tester` Agent

```yaml
---
name: widget-tester
description: >
  Tests widget compliance with the bridge protocol. Given widget code,
  validates it: correct SDK usage, valid contract, no blocked patterns,
  proper lifecycle (register → ready → events). Generates test harness.
tools: Read, Write, Glob, Grep, Bash
model: sonnet
---
```

Takes widget code as input, generates a test that:
1. Builds the srcdoc via sdk-builder
2. Validates the manifest
3. Runs the code scanner for blocked patterns
4. Simulates the lifecycle: INIT → READY → EVENT → STATE_SAVE → DESTROY
5. Verifies the contract matches actual emit/subscribe behavior

#### `bridge-debugger` Agent

```yaml
---
name: bridge-debugger
description: >
  Diagnoses postMessage bridge issues. Use when widgets aren't receiving
  events, READY isn't firing, or state isn't persisting. Traces the
  full message path from widget emit to bus delivery.
tools: Read, Glob, Grep, Bash
model: sonnet
---
```

Diagnostic flow:
1. Check WidgetFrame is not conditionally rendered
2. Check srcdoc is memoized
3. Check bridge message listener is attached
4. Verify message validation schemas match between host and widget
5. Check message queue flush on READY
6. Trace event from widget EMIT through bridge → bus → connection registry → target bridge → target widget

### 9.2 Updated Existing Agents

#### `architect` Agent (UPDATE)

Add runtime layer checks:
- Verify runtime only imports from `@core`
- Verify no inline widget allowlist additions without explicit approval
- Verify WidgetFrame always uses sandbox without allow-same-origin
- Verify no direct iframe DOM access patterns

#### `test-writer` Agent (UPDATE)

Add runtime test generation capability:
- Knows about createMockIframe, createMockBridge factories
- Generates lifecycle state machine tests
- Generates message validation tests for all message types
- Generates rate limiter edge case tests

### 9.3 Build Tasks — Agents

| ID | Task |
|----|------|
| R-AGENT-1 | Create `widget-tester` agent |
| R-AGENT-2 | Create `bridge-debugger` agent |
| R-AGENT-3 | Update `architect` agent with runtime layer rules |
| R-AGENT-4 | Update `test-writer` agent with runtime test patterns |

---

## 10. Parallel Sessions (Agent Teams)

### 10.1 When to Use Agent Teams for the Runtime

**Scenario A: Bridge + SDK + Lifecycle Sprint**

The three core iframe subsystems have minimal file overlap:

```
Team Lead:    Coordinates, ensures bridge↔SDK↔lifecycle integrate correctly
Teammate 1:   Bridge protocol (message types, validation, host-side bridge, queue)
Teammate 2:   Widget SDK (template, builder, srcdoc assembly, CSP injection)
Teammate 3:   Lifecycle manager (state machine, error boundary, lazy loader, pool)
```

**Scenario B: Registry + Security + Inline Sprint**

After the sandbox core works:

```
Team Lead:    Coordinates, reviews cross-cutting concerns
Teammate 1:   Manifest system + catalog + wiring manager
Teammate 2:   Security (rate limiter, code scanner, CSP configuration)
Teammate 3:   Inline widgets (InlineWidgetFrame, hooks, allowlist) + 3D stubs
```

### 10.2 When NOT to Use Agent Teams

- **WidgetFrame component itself** — single file, sequential, HITL is better
- **Bridge debugging** — use the bridge-debugger agent instead
- **Cross-iframe integration tests** — sequential by nature, one session

### 10.3 Cost Management

Same rules as kernel phase:
- Cap at 3-4 teammates maximum
- Use Sonnet for teammates
- Set clear exit criteria per teammate
- Review before merging — bridge protocol must be consistent between host and SDK sides

### 10.4 Build Tasks — Teams

| ID | Task |
|----|------|
| R-TEAM-1 | Execute Bridge + SDK + Lifecycle Sprint (Scenario A) |
| R-TEAM-2 | Execute Registry + Security + Inline Sprint (Scenario B) |

---

## 11. Ralph Loops

### 11.1 RALPH.md Updates for Runtime Phase

The RALPH.md file is updated to target Layer 1:

```markdown
---
## Identity

You are a StickerNest V5 Runtime Engineer. You implement the widget execution
engine: iframe sandbox, bridge protocol, SDK, lifecycle, manifests, security.

## Context

- Call `sn_get_layer(1)` to get the runtime spec
- Call `sn_project_status()` to see current progress
- Call `sn_get_decision()` for past decisions about widget architecture
- The kernel (Layer 0) is COMPLETE — you can import from @core freely
- You are building in `src/runtime/`

## Workflow

1. Run `bd ready` to see available tasks
2. Pick the highest-priority task whose dependencies are met
3. Read the relevant skill files (.claude/skills/) for the subsystem you're touching
4. Implement following project conventions (see .claude/skills/layer-rules)
5. Write tests (see .claude/skills/testing for runtime patterns)
6. Run `npm test -- --filter=runtime` — must pass
7. Run `npm run lint` — zero errors
8. Commit with conventional message: `feat(runtime): <description>`
9. Run `bd complete <task-id>`
10. Exit

## Rules

- NEVER add allow-same-origin to any iframe sandbox attribute
- NEVER conditionally render iframes — display:none only
- ALWAYS validate messages with Zod schemas
- ALWAYS memoize srcdoc with useMemo
- ALWAYS queue events before widget READY
- Runtime imports from @core ONLY — never from @entities, @canvas-2d, etc.
- Tests must NOT render actual browser iframes — use mocks

## Exit Conditions

- Task complete and tests pass → `bd complete`, exit normally
- Blocked by missing kernel feature → create BLOCKED.md with details, exit
- Test failures you can't resolve in 3 attempts → create FAILED.md, exit
- Unclear requirements → create QUESTION.md, exit
```

### 11.2 Beads Task Definitions for Runtime

```bash
# ═══ IFRAME SANDBOX ═══
bd add "R-FRAME: WidgetFrame component with sandbox, srcdoc, memoization" --dep K-INTEGRATION --tag layer1
bd add "R-MSG-TYPES: HostMessage and WidgetMessage discriminated unions with Zod" --dep K-TYPES --tag layer1
bd add "R-BRIDGE: Host-side postMessage bridge with validation and origin check" --dep R-MSG-TYPES --tag layer1
bd add "R-QUEUE: Message queue for pre-READY events" --dep R-BRIDGE --tag layer1

# ═══ WIDGET SDK ═══
bd add "R-SDK: StickerNest SDK template with all API methods" --dep R-MSG-TYPES --tag layer1
bd add "R-BUILDER: SDK builder — assemble srcdoc HTML with SDK + widget code + CSP" --dep R-SDK --tag layer1

# ═══ LIFECYCLE ═══
bd add "R-LIFECYCLE: Widget lifecycle state machine (6 states)" --dep R-FRAME,R-BRIDGE --tag layer1
bd add "R-ERROR: Error boundary component with reload/remove UI" --dep R-LIFECYCLE --tag layer1
bd add "R-LAZY: Intersection Observer lazy loader" --dep R-FRAME --tag layer1

# ═══ REGISTRY ═══
bd add "R-MANIFEST: WidgetManifest type, validation, ConfigField schema" --dep K-TYPES --tag layer1
bd add "R-CATALOG: Widget catalog (register, list, search)" --dep R-MANIFEST --tag layer1
bd add "R-WIRING: Auto-wire, manual wire, transform wire integration with kernel connections" --dep R-CATALOG,K-CONN-REG --tag layer1

# ═══ SECURITY ═══
bd add "R-CSP: Content Security Policy generation for iframe srcdoc" --dep R-BUILDER --tag layer1
bd add "R-RATE: Per-widget event emission rate limiter" --dep R-BRIDGE,K-BUS-CORE --tag layer1
bd add "R-SCAN: Widget code scanner (blocked patterns detection)" --dep R-MANIFEST --tag layer1
bd add "R-SANDBOX: Sandbox policy configuration and documentation" --dep R-FRAME --tag layer1

# ═══ PERFORMANCE ═══
bd add "R-POOL: iframe pool (acquire, release, warm-up)" --dep R-FRAME --tag layer1
bd add "R-METRICS: Runtime performance metrics collection" --dep R-LIFECYCLE,R-POOL --tag layer1

# ═══ INLINE & 3D STUBS ═══
bd add "R-INLINE: InlineWidgetFrame with useEmit/useSubscribe/useWidgetState hooks" --dep K-BUS-CORE --tag layer1
bd add "R-ALLOWLIST: Inline widget allowlist (hardcoded, no runtime additions)" --dep R-INLINE --tag layer1
bd add "R-3D-STUB: Widget3DContainer and VRWidgetTexture interfaces (stub)" --dep K-TYPES --tag layer1

# ═══ MCP & SKILLS ═══
bd add "R-MCP-TOOLS: Add scaffold_widget, validate_widget, trace_message to Dev MCP" --dep R-MANIFEST,R-SCAN --tag layer1
bd add "R-SKILLS: Create iframe-sandbox, widget-sdk, bridge-protocol skills" --tag layer1
bd add "R-AGENTS: Create widget-tester and bridge-debugger agents" --dep R-BRIDGE,R-SDK --tag layer1

# ═══ TESTING ═══
bd add "R-MOCKS: Create mock factories (iframe, bridge, widget, manifest)" --dep R-FRAME,R-BRIDGE --tag layer1
bd add "R-TEST-BRIDGE: Bridge protocol unit tests (all message types + validation)" --dep R-BRIDGE,R-MOCKS --tag layer1
bd add "R-TEST-SDK: Widget SDK unit tests" --dep R-SDK,R-MOCKS --tag layer1
bd add "R-TEST-LIFECYCLE: Lifecycle state machine unit tests" --dep R-LIFECYCLE,R-MOCKS --tag layer1
bd add "R-TEST-REGISTRY: Manifest validation + catalog + wiring tests" --dep R-CATALOG,R-WIRING,R-MOCKS --tag layer1
bd add "R-TEST-SECURITY: Rate limiter + code scanner + CSP tests" --dep R-RATE,R-SCAN,R-CSP,R-MOCKS --tag layer1
bd add "R-TEST-POOL: iframe pool unit tests" --dep R-POOL,R-MOCKS --tag layer1
bd add "R-TEST-INLINE: Inline widget hook tests" --dep R-INLINE,R-MOCKS --tag layer1
bd add "R-INTEGRATION: Full integration test — widget lifecycle through bus to other widgets" --dep R-TEST-BRIDGE,R-TEST-SDK,R-TEST-LIFECYCLE,R-TEST-REGISTRY --tag layer1
bd add "R-STRESS: Stress tests (50 widgets, rapid events, pool exhaustion)" --dep R-INTEGRATION --tag layer1
bd add "R-CI: Update CI pipeline for runtime tests + coverage" --dep R-INTEGRATION --tag layer1
```

### 11.3 Ralph Modes for Runtime

| Subsystem | Mode | Rationale |
|-----------|------|-----------|
| Message types & Zod schemas | AFK | Mechanical — type definitions from spec |
| Bridge protocol | HITL | Security-critical — must review every decision |
| Widget SDK | HITL | API design — affects all future widget authors |
| Lifecycle state machine | HITL | Complex state transitions, error recovery |
| Manifest & catalog | AFK | Mechanical — type definitions and CRUD |
| Security (CSP, rate limiter, scanner) | HITL | Security-critical |
| iframe pool | AFK | Performance optimization, well-defined behavior |
| Inline widgets & hooks | AFK | Straightforward React hooks wrapping bus |
| 3D stubs | AFK | Interface definitions only |
| Integration tests | HITL | Validates entire runtime architecture |

### 11.4 Build Tasks — Ralph

| ID | Task |
|----|------|
| R-RALPH-1 | Update RALPH.md for Layer 1 context |
| R-RALPH-2 | Define all Beads tasks with dependencies (above) |
| R-RALPH-3 | Test Ralph HITL on R-MSG-TYPES (simple first task) |
| R-RALPH-4 | Run Ralph AFK batch on manifest/catalog/inline tasks |
| R-RALPH-5 | Run Ralph HITL on bridge + SDK + lifecycle (critical path) |

---

## 12. Testing Strategy

Testing is the runtime's gate. Nothing moves to Layer 2 until the runtime passes all tests confirming widgets can communicate through the bus without any access to the host.

### 12.1 Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration tests (same as kernel) |
| **jsdom** | DOM environment for React component tests (WidgetFrame, error boundary) |
| **Happy-dom** | Alternative to jsdom if iframe support is needed |
| **Vitest Coverage** | 85% coverage threshold for runtime (slightly lower than kernel — iframe mocking adds noise) |

### 12.2 Test Categories

#### Unit Tests

**Bridge Protocol Tests:**

```typescript
describe('Bridge', () => {
  // Host → Widget messages
  it('sends INIT with stickerId, config, and theme')
  it('sends EVENT with serialized StickerNestEvent')
  it('sends CONFIG_UPDATE with new config')
  it('sends THEME_UPDATE with new theme tokens')
  it('sends RESIZE with width and height')
  it('sends STATE_RESTORE with saved state')
  it('sends DESTROY signal')

  // Widget → Host messages
  it('handles READY and flushes event queue')
  it('handles EMIT and forwards to event bus')
  it('handles STATE_SAVE and persists to workspace store')
  it('handles RESIZE_REQUEST and validates bounds')
  it('handles LOG and prefixes with widget ID')
  it('handles REGISTER and adds to connection registry')

  // Validation
  it('rejects malformed HostMessage')
  it('rejects malformed WidgetMessage')
  it('rejects message from unknown source')
  it('rejects EMIT with oversized payload (>100KB)')
  it('rejects STATE_SAVE exceeding 1MB')

  // Queue
  it('queues events sent before READY')
  it('flushes queue in order on READY')
  it('drops oldest when queue exceeds 1000')
  it('does not queue after READY (direct delivery)')
})
```

**Widget SDK Tests:**

```typescript
describe('WidgetSDK', () => {
  it('emit() posts EMIT message to parent')
  it('on() registers handler for event type')
  it('off() removes specific handler')
  it('getState() returns last restored state')
  it('setState() posts STATE_SAVE to parent')
  it('getConfig() returns config from last INIT')
  it('getTheme() returns theme from last INIT/THEME_UPDATE')
  it('register() posts REGISTER with contract')
  it('requestResize() posts RESIZE_REQUEST')
  it('log/warn/error post LOG messages')
  it('stickerId is null before INIT, set after')
  it('handles CONFIG_UPDATE by updating internal config')
  it('handles THEME_UPDATE by updating internal theme')
})
```

**Lifecycle State Machine Tests:**

```typescript
describe('WidgetLifecycle', () => {
  it('starts in UNLOADED state')
  it('transitions to LOADING when sticker enters viewport')
  it('transitions to INITIALIZING when iframe loads')
  it('transitions to READY on READY message')
  it('transitions to RUNNING on first event delivery')
  it('transitions to DESTROYING on destroy call')
  it('transitions to DEAD after grace period')
  it('transitions to ERROR on crash detection')
  it('recovers from ERROR to LOADING on reload')
  it('sends DESTROY with 100ms grace for STATE_SAVE')
  it('times out to ERROR if no READY within 5 seconds')
  it('detects unresponsive widget (no messages for 30s)')
  it('rejects invalid state transitions')
})
```

**WidgetFrame Component Tests:**

```typescript
describe('WidgetFrame', () => {
  it('renders iframe with sandbox="allow-scripts allow-forms"')
  it('does NOT include allow-same-origin in sandbox')
  it('uses srcdoc, not src')
  it('memoizes srcdoc — same reference on re-render with same props')
  it('rebuilds srcdoc when widgetCode changes')
  it('does NOT rebuild srcdoc when config or theme changes')
  it('uses display:none when visible=false, not conditional render')
  it('uses stickerId as React key')
  it('lazy-loads srcdoc via IntersectionObserver')
})
```

**Manifest & Catalog Tests:**

```typescript
describe('WidgetManifest', () => {
  it('validates required fields')
  it('validates SemVer version format')
  it('validates protocol version compatibility')
  it('validates contract has no duplicate event types')
  it('validates code size within 500KB limit')
  it('rejects manifest with missing contract')
  it('rejects manifest with invalid execution mode')
})

describe('WidgetCatalog', () => {
  it('registers a widget manifest + code')
  it('retrieves registered widget by ID')
  it('lists all registered widgets')
  it('searches by name/description')
  it('unregisters a widget')
  it('handles duplicate registration gracefully')
  it('auto-registers built-in widgets on startup')
})
```

**Security Tests:**

```typescript
describe('RateLimiter', () => {
  it('allows events under the rate limit')
  it('throttles events exceeding rate limit')
  it('resets count after window expires')
  it('emits widget:rate-limited event when throttling')
  it('uses per-widget limits from manifest')
  it('default limit is 100 events/second')
})

describe('CodeScanner', () => {
  it('passes clean widget code')
  it('blocks eval() usage')
  it('blocks new Function() usage')
  it('blocks document.cookie access')
  it('blocks localStorage/sessionStorage access')
  it('blocks window.parent/window.top access')
  it('blocks fetch/XMLHttpRequest calls')
  it('blocks WebSocket/EventSource usage')
  it('blocks importScripts() calls')
  it('returns warnings for suspicious patterns')
})

describe('CSP', () => {
  it('generates correct CSP meta tag for default sandbox')
  it('blocks connect-src by default')
  it('allows inline scripts and styles')
  it('allows data: and blob: for images')
})
```

**iframe Pool Tests:**

```typescript
describe('IframePool', () => {
  it('warms up requested number of iframes')
  it('acquire returns iframe from pool')
  it('acquire creates new iframe when pool empty')
  it('release returns iframe to pool after clearing')
  it('does not exceed maxSize')
  it('destroys excess iframes beyond maxSize')
  it('released iframe has srcdoc cleared')
})
```

**Inline Widget Tests:**

```typescript
describe('InlineWidgetFrame', () => {
  it('renders widget component directly (no iframe)')
  it('passes stickerId, config, and theme as props')
})

describe('useEmit', () => {
  it('returns function that emits to event bus')
  it('auto-sets source to stickerId')
})

describe('useSubscribe', () => {
  it('subscribes to event bus on mount')
  it('unsubscribes on unmount')
  it('re-subscribes when eventType changes')
})

describe('useWidgetState', () => {
  it('returns persisted state for sticker')
  it('updates state and persists to workspace store')
})
```

#### Integration Tests

```typescript
describe('Runtime Integration', () => {
  // Full lifecycle
  it('widget loads → inits → registers contract → receives events → saves state → destroys gracefully')

  // Bus integration
  it('widget EMIT reaches event bus and delivers to subscribers')
  it('event bus event reaches subscribed widget via bridge')
  it('Widget A emits → transform → Widget B receives transformed payload')

  // Connection registry integration
  it('widget REGISTER updates connection registry')
  it('widget unregister removes from connection registry')
  it('auto-wiring connects matching emitter/subscriber widgets')

  // State persistence
  it('widget STATE_SAVE persists to workspace store')
  it('widget receives STATE_RESTORE on reload')
  it('DESTROY triggers final STATE_SAVE opportunity')

  // Error recovery
  it('crashed widget shows error UI')
  it('reload button restarts widget lifecycle from LOADING')
  it('rate-limited widget events are dropped silently')

  // Multiple widgets
  it('two sandboxed widgets communicate via bus without accessing each other')
  it('inline widget communicates with sandboxed widget via bus')
})
```

#### Stress Tests

```typescript
describe('Runtime Stress', () => {
  it('20 simultaneous widget iframes load without crashing')
  it('widget emitting 200 events/second gets rate-limited')
  it('iframe pool handles rapid acquire/release cycles')
  it('message queue handles 1000 events before READY')
  it('50 widgets registering simultaneously all appear in registry')
  it('bridge handles 10,000 messages/second without dropping validated messages')
})
```

### 12.3 Mock Factories

```typescript
// test/runtime-factories.ts
export function createMockIframe(overrides?: Partial<MockIframe>): MockIframe;
export function createMockBridge(bus: EventBus): MockBridge;
export function createMockWidgetCode(contract?: Partial<WidgetContract>): string;
export function createMockManifest(overrides?: Partial<WidgetManifest>): WidgetManifest;
export function createMockSrcdoc(sdkCode: string, widgetCode: string): string;
export function createMockLifecycle(): MockLifecycleManager;
```

### 12.4 Test Helpers

```typescript
// test/runtime-helpers.ts
export function simulateWidgetReady(bridge: MockBridge): void;
export function simulateWidgetEmit(bridge: MockBridge, eventType: string, payload: unknown): void;
export function simulateWidgetCrash(bridge: MockBridge): void;
export function waitForLifecycleState(manager: LifecycleManager, state: WidgetState): Promise<void>;
export function createTestWidget(options: { emits?: string[]; subscribes?: string[] }): TestWidget;
export function postMessageToHost(iframe: MockIframe, message: WidgetMessage): void;
export function postMessageToWidget(bridge: MockBridge, message: HostMessage): void;
```

### 12.5 Coverage Requirements

| Module | Minimum Coverage |
|--------|-----------------|
| `iframe/bridge.ts` | 95% |
| `iframe/message-validator.ts` | 95% |
| `iframe/WidgetFrame.tsx` | 90% |
| `iframe/message-queue.ts` | 90% |
| `sdk/sdk-template.ts` | 90% |
| `sdk/sdk-builder.ts` | 85% |
| `lifecycle/manager.ts` | 90% |
| `lifecycle/error-boundary.tsx` | 85% |
| `lifecycle/lazy-loader.ts` | 85% |
| `registry/manifest.ts` | 90% |
| `registry/catalog.ts` | 85% |
| `registry/wiring.ts` | 85% |
| `security/rate-limiter.ts` | 90% |
| `security/csp.ts` | 90% |
| `security/sandbox-policy.ts` | 85% |
| `pool/iframe-pool.ts` | 85% |
| `inline/*.ts` | 85% |
| **Runtime overall** | **85%** |

### 12.6 CI Pipeline Update

```yaml
# Update .github/workflows/ci.yml
jobs:
  test-kernel:
    # ... existing kernel tests
  test-runtime:
    needs: test-kernel    # Runtime only runs if kernel passes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint -- --filter=runtime
      - run: npm run test:runtime -- --coverage
      - run: npm run test:runtime:integration
      - name: Check coverage thresholds
        run: npx vitest --coverage --coverage.thresholds.lines=85
```

### 12.7 Runtime Acceptance Test (Gate to Layer 2)

The runtime is complete when ALL of the following pass:

```bash
# The single command that gates Layer 2 access
npm test -- --filter=runtime

# Which must include:
✅ Bridge protocol — all message types validated, sent, received
✅ Widget SDK — all API methods work through bridge
✅ Lifecycle — all state transitions correct, error recovery works
✅ WidgetFrame — sandbox enforced, srcdoc memoized, no conditional render
✅ Manifest — validation catches all invalid manifests
✅ Catalog — register, list, search, unregister
✅ Wiring — auto-wire, manual wire, transform wire with kernel connections
✅ Security — rate limiting, code scanning, CSP enforcement
✅ iframe pool — acquire/release cycle works
✅ Inline widgets — hooks work, allowlist enforced
✅ Integration — full widget↔bus↔widget communication
✅ Stress — 20+ widgets, rapid events, pool exhaustion
✅ Coverage — 85%+ overall
✅ Lint — zero errors

# THE ACCEPTANCE TEST:
# A widget in an iframe can emit events to the bus and receive
# events from other widgets, with ZERO access to host DOM.
```

### 12.8 Build Tasks — Testing

| ID | Task |
|----|------|
| R-TEST-1 | Create runtime mock factories (iframe, bridge, widget, manifest, srcdoc) |
| R-TEST-2 | Create runtime test helpers (simulateReady, simulateEmit, waitForState) |
| R-TEST-3 | Bridge protocol unit tests (full suite — 20+ tests) |
| R-TEST-4 | Widget SDK unit tests |
| R-TEST-5 | Lifecycle state machine unit tests |
| R-TEST-6 | WidgetFrame component tests |
| R-TEST-7 | Manifest validation + catalog + wiring tests |
| R-TEST-8 | Security tests (rate limiter, code scanner, CSP) |
| R-TEST-9 | iframe pool tests |
| R-TEST-10 | Inline widget and hooks tests |
| R-TEST-11 | Integration test suite (widget↔bus↔widget) |
| R-TEST-12 | Stress test suite |
| R-TEST-13 | Update CI pipeline for runtime tests + coverage gate |

---

## 13. Build Order & Task Dependencies

### Phase 1: Message Foundation (Can Parallelize)

```
K-INTEGRATION ──→ R-MSG-TYPES ──→ R-BRIDGE ──→ R-QUEUE
                               ──→ R-SDK
```

**Ralph mode:** HITL for bridge (security-critical), AFK for message types
**Alternative:** First two tasks of Agent Team Scenario A

### Phase 2: iframe Core (Sequential — Critical Path)

```
R-BRIDGE + R-SDK ──→ R-BUILDER ──→ R-CSP
                  ──→ R-FRAME ──→ R-LAZY
                               ──→ R-SANDBOX
                  ──→ R-LIFECYCLE ──→ R-ERROR
```

**Ralph mode:** HITL — this is the most architecturally critical phase of the entire runtime

### Phase 3: Registry & Security (Partially Parallel)

```
K-TYPES ──→ R-MANIFEST ──→ R-CATALOG ──→ R-WIRING
                        ──→ R-SCAN
R-BRIDGE ──→ R-RATE
R-FRAME ──→ R-POOL ──→ R-METRICS
K-BUS-CORE ──→ R-INLINE ──→ R-ALLOWLIST
K-TYPES ──→ R-3D-STUB
```

**Ralph mode:** AFK for manifest/catalog/inline/3D stubs, HITL for security (rate limiter, scanner)
**Alternative:** Agent Team Scenario B

### Phase 4: Tooling & Testing (Partially Parallel)

```
R-MANIFEST + R-SCAN ──→ R-MCP-TOOLS
R-BRIDGE + R-SDK ──→ R-AGENTS
R-FRAME + R-BRIDGE ──→ R-MOCKS ──→ R-TEST-*
R-TEST-* ──→ R-INTEGRATION ──→ R-STRESS ──→ R-CI
```

**Ralph mode:** AFK for mock factories and individual test suites, HITL for integration tests

### Phase 5: Skills & Documentation

```
R-SKILLS (parallel with any phase — no code dependencies)
R-RALPH-1, R-RALPH-2 (parallel with Phase 1)
R-MCP-4, R-MCP-5 (parallel with Phase 3)
```

**Ralph mode:** AFK — documentation and config files

### Estimated Timeline

| Phase | Duration | Method |
|-------|----------|--------|
| Phase 1: Message Foundation | 1-2 days | HITL bridge, AFK types |
| Phase 2: iframe Core | 3-5 days | HITL — critical path |
| Phase 3: Registry & Security | 2-3 days | Agent Team or Ralph mixed |
| Phase 4: Tooling & Testing | 2-3 days | HITL integration, AFK unit tests |
| Phase 5: Skills & Docs | 1 day | AFK — parallel with others |
| **Total** | **~8-14 days** | |

---

## 14. Dev MCP Workflow for Runtime

### Before (Starting Runtime Layer Cold)

1. Open new AI chat
2. Re-explain the bridge protocol types
3. Re-explain the sandbox rules
4. Re-explain the lifecycle states
5. Paste widget code context
6. Hope AI doesn't add `allow-same-origin`

### After (Starting Runtime Layer Warm)

1. Open Claude Code (MCP auto-connected)
2. AI calls `sn_project_status()` → "Layer 0 complete, working on Layer 1"
3. AI calls `sn_get_layer(1)` → gets full runtime spec
4. AI calls `sn_get_decision("iframe sandbox policy")` → respects no-same-origin decision
5. AI calls `sn_scaffold_widget(...)` → generates correct srcdoc with SDK and CSP
6. AI calls `sn_validate_widget(code)` → catches blocked patterns before testing
7. Skills auto-activate → bridge-protocol, iframe-sandbox, widget-sdk skills loaded
8. Subagents available → widget-tester validates, bridge-debugger diagnoses
9. Beads tracks progress → Ralph picks up next task seamlessly

---

## Appendix A: Complete Bead Dependency Graph

```
                            K-INTEGRATION (Layer 0 gate)
                                    │
                    ┌───────────────┼───────────────────┐
                    ▼               ▼                   ▼
              R-MSG-TYPES       R-MANIFEST          K-BUS-CORE
                 │    │            │   │               │
                 ▼    ▼            ▼   ▼               ▼
           R-BRIDGE  R-SDK    R-CATALOG R-SCAN     R-INLINE
              │  │     │         │                    │
              ▼  │     ▼         ▼                    ▼
          R-QUEUE│  R-BUILDER  R-WIRING          R-ALLOWLIST
              │  │     │
              │  ▼     ▼
              │ R-FRAME R-CSP
              │  │  │
              │  ▼  ▼
              │ R-LAZY R-SANDBOX
              │  │
              ▼  ▼
           R-LIFECYCLE ──────────→ R-POOL
              │                      │
              ▼                      ▼
           R-ERROR              R-METRICS
              │
              ▼
         R-RATE (also needs R-BRIDGE + K-BUS-CORE)

    All R-TEST-* depend on R-MOCKS (which needs R-FRAME + R-BRIDGE)
    R-INTEGRATION depends on R-TEST-3,4,5,7
    R-STRESS depends on R-INTEGRATION
    R-CI depends on R-INTEGRATION

    R-MCP-TOOLS depends on R-MANIFEST + R-SCAN
    R-AGENTS depends on R-BRIDGE + R-SDK
    R-SKILLS has no code dependencies (parallel)
    R-3D-STUB depends on K-TYPES only
```

## Appendix B: Key Decisions to Record

After building the runtime, record these decisions in the Dev MCP:

| Decision | Rationale |
|----------|-----------|
| No `allow-same-origin` on any iframe | Security foundation — prevents all host DOM access |
| srcdoc-based loading, not src | Self-contained widgets, no server round-trip, no external URL leaks |
| CSP blocks `connect-src` by default | Widgets cannot phone home or exfiltrate data |
| 100ms DESTROY grace period | Enough for STATE_SAVE, not enough for complex teardown (by design) |
| 5-second READY timeout | Widgets that can't init in 5s are probably broken |
| 1MB widget state limit | Prevents memory abuse — widgets should be lightweight |
| 500KB widget code limit | Keeps marketplace downloads fast |
| Rate limit: 100 events/sec default | Prevents bus flooding, configurable per-widget |
| Inline widgets: hardcoded allowlist only | Prevents privilege escalation via manifest manipulation |
| Message queue: 1000 max, drop oldest | Prevents memory leak if widget never sends READY |
