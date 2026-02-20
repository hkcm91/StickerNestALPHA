# StickerNest V5 — Layer 3: Widget Runtime — Complete Build Plan

## Document Purpose

This is the full-spec build plan for Layer 3 (Runtime) of StickerNest V5. It covers the widget execution engine — iframe sandboxing, the postMessage bridge protocol, the Widget SDK, lifecycle management, security hardening, iframe pooling, and built-in widgets. The Runtime is a security boundary: every widget runs in a sandboxed iframe with zero access to the host DOM, cookies, or storage.

**Iron Rule #2 applies here:** Widgets are untrusted guests. Every widget runs in an iframe sandbox. No widget gets access to the host DOM, cookies, localStorage, or the parent window.

**Prerequisite:** Layer 0 (Kernel) complete. Layer 1 (Social) complete or in progress (Runtime does not depend on Social — they are independent siblings in the build order).

---

## 1. Runtime Architecture Overview

### What Lives in the Runtime

```
src/runtime/
├── index.ts                    # Layer barrel — public API
├── init.ts                     # initRuntime() / teardownRuntime()
├── init.test.ts
├── WidgetFrame.tsx             # Sandboxed iframe host component
├── WidgetFrame.test.tsx
├── bridge/
│   ├── bridge.ts               # Host-side postMessage bridge
│   ├── message-types.ts        # HostMessage / WidgetMessage discriminated unions
│   ├── message-validator.ts    # Zod schemas for bridge messages
│   ├── message-queue.ts        # Queue events until READY
│   ├── bridge.test.ts
│   └── index.ts
├── sdk/
│   ├── sdk-template.ts         # StickerNest global object source
│   ├── sdk-builder.ts          # Assemble srcdoc HTML blob
│   ├── sdk.test.ts
│   └── index.ts
├── lifecycle/
│   ├── manager.ts              # Widget lifecycle state machine
│   ├── error-boundary.tsx      # React error boundary per widget
│   ├── lazy-loader.ts          # IntersectionObserver lazy init
│   ├── lifecycle.test.ts
│   └── index.ts
├── security/
│   ├── csp.ts                  # CSP generation for iframes
│   ├── rate-limiter.ts         # Per-widget event rate limiting
│   ├── sandbox-policy.ts       # Sandbox attribute configuration
│   ├── security.test.ts
│   └── index.ts
├── pool/
│   ├── iframe-pool.ts          # iframe reuse pool
│   ├── iframe-pool.test.ts
│   └── index.ts
└── widgets/                    # Built-in widgets (preserved)
    ├── stories/
    │   └── WidgetFrame.stories.tsx  # EXISTING — do not modify
    └── index.ts
```

### Dependency Rule

The runtime imports from the **kernel** (`src/kernel/`) only. It MUST NOT import from `src/social/**`, `src/lab/**`, `src/canvas/**`, `src/spatial/**`, `src/marketplace/**`, or `src/shell/**`.

```typescript
// ✅ Allowed
import { bus } from 'src/kernel/bus';
import { WidgetEvents, type WidgetManifest, type BusEvent } from '@sn/types';
import { useWidgetStore } from 'src/kernel/stores/widget/widget.store';

// ❌ Forbidden
import { PresenceManager } from 'src/social';     // L1
import { CanvasViewport } from 'src/canvas/core'; // L4A
```

---

## 2. iframe Sandbox (The Critical Path)

The iframe sandbox is the heart of the runtime. Everything else is secondary until this works perfectly.

### 2.1 WidgetFrame Component

```typescript
interface WidgetFrameProps {
  /** Widget ID from registry */
  widgetId: string;
  /** Unique instance ID */
  instanceId: string;
  /** The widget's HTML source */
  widgetHtml: string;
  /** User-configured values for this instance */
  config: Record<string, unknown>;
  /** Theme tokens from shell */
  theme: ThemeTokens;
  /** Controls display:none — NEVER unmounts */
  visible: boolean;
  /** Container width */
  width: number;
  /** Container height */
  height: number;
}
```

**Implementation rules:**

1. **`sandbox="allow-scripts allow-forms"` — NEVER `allow-same-origin`**. Without same-origin, the iframe cannot access the parent's DOM, cookies, localStorage, or sessionStorage. This is the security foundation.

2. **`srcdoc`-based loading.** Widget code is injected as a string via the `srcdoc` attribute. No external URLs, no `src` pointing to a server. The widget is self-contained HTML.

3. **Memoize `srcdoc` with `useMemo`.** If the srcdoc string reference changes between renders, React reloads the entire iframe. Key: `[widgetId, widgetHtml]` — config and theme changes are delivered via postMessage, NOT srcdoc rebuild.

4. **Never conditionally render.** Always render the iframe. Use `display: none` via style prop to hide it. Conditional rendering destroys and recreates the iframe, killing all widget state.

5. **Stable `key` prop.** Key is `instanceId`, which never changes for the widget's lifetime.

6. **Lazy initialization via IntersectionObserver.** Don't set `srcdoc` until the widget enters the viewport (with 200px rootMargin pre-load buffer).

### 2.2 Bridge Protocol (postMessage)

All communication between host and widget happens exclusively through `postMessage`. No shared memory, no shared globals, no direct function calls.

#### Messages FROM Host TO Widget

```typescript
type HostMessage =
  | { type: 'INIT'; widgetId: string; instanceId: string; config: Record<string, unknown>; theme: ThemeTokens }
  | { type: 'EVENT'; event: { type: string; payload: unknown } }
  | { type: 'CONFIG_UPDATE'; config: Record<string, unknown> }
  | { type: 'THEME_UPDATE'; theme: ThemeTokens }
  | { type: 'RESIZE'; width: number; height: number }
  | { type: 'STATE_RESPONSE'; key: string; value: unknown }
  | { type: 'DESTROY' }
```

#### Messages FROM Widget TO Host

```typescript
type WidgetMessage =
  | { type: 'READY' }
  | { type: 'REGISTER'; manifest: Partial<WidgetManifest> }
  | { type: 'EMIT'; eventType: string; payload: unknown }
  | { type: 'SET_STATE'; key: string; value: unknown }
  | { type: 'GET_STATE'; key: string; requestId: string }
  | { type: 'LOG'; level: 'info' | 'warn' | 'error'; message: string }
```

#### Bridge Rules

- **Message validation on every incoming message.** Both host and widget validate with Zod schemas. Malformed messages are logged and discarded.
- **Origin verification MANDATORY.** Host only accepts messages from its own iframes (check `event.source` against known iframe `contentWindow` references). Widget verifies `event.source === window.parent`.
- **One bridge per iframe, one listener per bridge.** No raw `addEventListener('message')` on `window`.
- **Message queue for pre-READY events.** If host sends EVENT before widget signals READY, bridge queues it. On READY, the queue flushes in order. Max 1000 queued events — overflow drops oldest.

### 2.3 Message Validation Schemas

```typescript
// Host-side validation (incoming from widget)
const WidgetMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('READY') }),
  z.object({
    type: z.literal('REGISTER'),
    manifest: z.record(z.unknown()),
  }),
  z.object({
    type: z.literal('EMIT'),
    eventType: z.string().min(1).max(100),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('SET_STATE'),
    key: z.string().min(1).max(256),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('GET_STATE'),
    key: z.string().min(1).max(256),
    requestId: z.string(),
  }),
  z.object({
    type: z.literal('LOG'),
    level: z.enum(['info', 'warn', 'error']),
    message: z.string().max(10_000),
  }),
]);

// Widget-side validation (incoming from host)
const HostMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INIT'),
    widgetId: z.string(),
    instanceId: z.string(),
    config: z.record(z.unknown()),
    theme: z.record(z.unknown()),
  }),
  z.object({
    type: z.literal('EVENT'),
    event: z.object({ type: z.string(), payload: z.unknown() }),
  }),
  z.object({ type: z.literal('CONFIG_UPDATE'), config: z.record(z.unknown()) }),
  z.object({ type: z.literal('THEME_UPDATE'), theme: z.record(z.unknown()) }),
  z.object({ type: z.literal('RESIZE'), width: z.number(), height: z.number() }),
  z.object({ type: z.literal('STATE_RESPONSE'), key: z.string(), value: z.unknown() }),
  z.object({ type: z.literal('DESTROY') }),
]);
```

---

## 3. Widget SDK

### 3.1 SDK API Surface

The SDK is injected into every iframe's `srcdoc`. It is the ONLY API surface widget authors interact with.

```typescript
interface StickerNestSDK {
  // ═══ Registration & Lifecycle ═══
  register(manifest: Partial<WidgetManifest>): void;
  ready(): void;

  // ═══ Event Bus Integration ═══
  emit(eventType: string, payload: unknown): void;
  subscribe(eventType: string, handler: (payload: unknown) => void): void;
  unsubscribe(eventType: string, handler: (payload: unknown) => void): void;

  // ═══ Instance State (per-canvas, per-instance) ═══
  setState(key: string, value: unknown): void;
  getState(key: string): Promise<unknown>;

  // ═══ User State (cross-canvas) ═══
  setUserState(key: string, value: unknown): void;
  getUserState(key: string): Promise<unknown>;

  // ═══ Configuration ═══
  getConfig(): Record<string, unknown>;

  // ═══ Theme ═══
  onThemeChange(handler: (tokens: ThemeTokens) => void): void;

  // ═══ Resize ═══
  onResize(handler: (width: number, height: number) => void): void;

  // ═══ Integration APIs (proxied via host) ═══
  integration(name: string): {
    query(params: unknown): Promise<unknown>;
    mutate(params: unknown): Promise<unknown>;
  };

  // ═══ Cross-Canvas Events ═══
  emitCrossCanvas(channel: string, payload: unknown): void;
  subscribeCrossCanvas(channel: string, handler: (payload: unknown) => void): void;
}
```

### 3.2 SDK Template

The SDK is a plain JavaScript object — no classes, no prototypes, no `this` binding. It runs inside the sandboxed page.

```javascript
window.StickerNest = {
  // Internal state
  _widgetId: null,
  _instanceId: null,
  _config: {},
  _theme: {},
  _handlers: {},        // eventType → Set<handler>
  _themeHandlers: [],
  _resizeHandlers: [],
  _stateCallbacks: {},  // requestId → resolve
  _registered: false,
  _ready: false,

  register(manifest) { /* post REGISTER to host */ },
  ready() { /* post READY to host; must be called within 500ms */ },
  emit(eventType, payload) { /* post EMIT to host */ },
  subscribe(eventType, handler) { /* register local handler */ },
  // ... etc
};
```

### 3.3 SDK Builder

Assembles the final `srcdoc` HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:;">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; font-family: var(--sn-font-family, system-ui); }
  </style>
</head>
<body>
  <script>
    // === SDK INJECTION ===
    ${sdkTemplate}

    // === MESSAGE HANDLER ===
    ${messageHandler}
  </script>

  <!-- === WIDGET CODE === -->
  ${widgetHtml}
</body>
</html>
```

### 3.4 SDK Lifecycle Contract

Widgets MUST follow this lifecycle:

1. `StickerNest.register(manifest)` — declare event contract
2. `StickerNest.ready()` — signal initialization complete
3. Widget operates normally — emits/subscribes/state

**`register()` MUST be called before `ready()`.** Calling `ready()` without `register()` throws an error.

**`ready()` MUST be called within 500ms of load.** Widgets that don't call `ready()` in time are transitioned to ERROR state.

---

## 4. Lifecycle Management

### 4.1 Lifecycle State Machine

```
UNLOADED → LOADING → INITIALIZING → READY → RUNNING → DESTROYING → DEAD
                ↑                                           |
                └───────── ERROR (can retry → LOADING) ─────┘
```

```typescript
type WidgetLifecycleState =
  | 'UNLOADED'       // Widget exists but iframe not created
  | 'LOADING'        // srcdoc set, waiting for iframe load event
  | 'INITIALIZING'   // iframe loaded, INIT sent, waiting for READY
  | 'READY'          // Widget signaled READY, queue flushed
  | 'RUNNING'        // Normal operation
  | 'DESTROYING'     // DESTROY sent, grace period for STATE_SAVE
  | 'DEAD'           // iframe removed, unregistered
  | 'ERROR';         // Widget crashed or timed out

interface WidgetLifecycleManager {
  getState(): WidgetLifecycleState;
  transition(to: WidgetLifecycleState): void;
  onStateChange(handler: (from: WidgetLifecycleState, to: WidgetLifecycleState) => void): () => void;
  destroy(): Promise<void>;
  reload(): void;
}
```

### 4.2 State Transitions

| From | To | Trigger | Action |
|------|----|---------|--------|
| UNLOADED | LOADING | Widget enters viewport (IntersectionObserver) | Build srcdoc, set on iframe |
| LOADING | INITIALIZING | iframe `load` event fires | Send INIT message with widgetId, instanceId, config, theme |
| INITIALIZING | READY | Widget posts READY message | Flush queued events, register contract |
| READY | RUNNING | First event delivered or 100ms timeout | Normal operation |
| RUNNING | DESTROYING | Widget removed or canvas unloads | Send DESTROY, start 100ms grace |
| DESTROYING | DEAD | Grace timer expires | Remove iframe from DOM, unregister |
| Any | ERROR | Crash, timeout, or invalid messages | Show error UI with reload button |
| ERROR | LOADING | User clicks reload | Reset iframe, restart lifecycle |

### 4.3 Error Boundary

React error boundary wraps each WidgetFrame:

```typescript
interface ErrorBoundaryProps {
  widgetId: string;
  instanceId: string;
  children: React.ReactNode;
  onReload: () => void;
  onRemove: () => void;
}
```

**Error boundary catches:**
- Widget timeout (no READY within 500ms of INIT)
- Excessive error logs (>50 errors in 10s)
- Invalid message types (possible attack)
- React render errors in WidgetFrame

**Error UI shows:** widget name, error type, "Reload" button, "Remove" button.

### 4.4 Lazy Loader

```typescript
interface LazyLoader {
  observe(instanceId: string, element: HTMLElement, onVisible: () => void): void;
  unobserve(instanceId: string): void;
}
```

- Uses `IntersectionObserver` with `rootMargin: '200px'` (pre-load slightly before visible)
- Prevents off-screen widgets from consuming iframe resources

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
- Access to parent window (`window.parent.document` → blocked)
- Access to cookies, localStorage, sessionStorage
- Navigation of the top frame
- Opening popups or new windows
- Pointer lock (prevents cursor hijacking)

### 5.2 Content Security Policy

Injected via `<meta>` tag in srcdoc:

```
default-src 'none';
script-src 'unsafe-inline';
style-src 'unsafe-inline';
img-src data: blob:;
font-src data:;
connect-src 'none';
```

**Widgets CANNOT:**
- Make network requests (`connect-src 'none'`)
- Load external scripts or stylesheets
- Use WebSocket, EventSource, or fetch
- Load external images (only data: and blob:)

### 5.3 Rate Limiting

Per-widget event emission rate limiting prevents bus flooding:

```typescript
interface RateLimiter {
  /** Check if widget can emit (returns true = allowed) */
  check(instanceId: string): boolean;
  /** Reset counter for a widget */
  reset(instanceId: string): void;
  /** Set custom limit */
  setLimit(instanceId: string, eventsPerSecond: number): void;
}

/** Default: 100 events/second per widget */
const DEFAULT_RATE_LIMIT = 100;
```

When rate-limited:
- Events are silently dropped (not queued)
- A `widget.rate.limited` bus event is emitted (for diagnostics)
- Widget receives no indication (prevents probing)

### 5.4 Integration Credential Safety

- Integration credentials are NEVER passed into the iframe
- Host proxies all external API calls
- Widget calls `StickerNest.integration(name).query(params)` → host makes the real HTTP request → returns result via bridge
- Media assets are NEVER delivered as direct bucket URLs — always proxy via SDK media API

---

## 6. Theme System

### 6.1 Theme Tokens

```typescript
interface ThemeTokens {
  '--sn-bg': string;
  '--sn-surface': string;
  '--sn-accent': string;
  '--sn-text': string;
  '--sn-text-muted': string;
  '--sn-border': string;
  '--sn-radius': string;
  '--sn-font-family': string;
}
```

### 6.2 Theme Injection Flow

```
Shell changes theme
  → bus.emit(ShellEvents.THEME_CHANGED, newTokens)
    → WidgetFrame receives via bus subscription
      → bridge.send({ type: 'THEME_UPDATE', theme: newTokens })
        → Widget SDK internal handler fires
          → StickerNest.onThemeChange handlers called with newTokens
```

Theme tokens are injected on iframe load (via INIT) and on every theme change (via THEME_UPDATE).

---

## 7. State Persistence

### 7.1 Instance State

- Key: `{widgetId}:{instanceId}`
- Stored in `widget_instances` table
- Hard limit: **1MB per instance** — writes exceeding this are rejected with error
- State must be JSON-serializable

### 7.2 User State

- Per-user across all canvases
- Stored in `user_widget_state` table
- Hard limit: **10MB total per user** — reject writes exceeding this
- Requires `user-state` permission in manifest

### 7.3 State Lifecycle

- State is cleared on: widget uninstall (with confirmation dialog), canvas delete, user account delete
- On DESTROY: widget gets 100ms grace period to call `setState()` before iframe is torn down
- On next load: state is restored via `STATE_RESPONSE` after INIT

---

## 8. iframe Pool

### 8.1 Pool Interface

```typescript
interface IframePool {
  /** Get a warm iframe from the pool (or create new) */
  acquire(): HTMLIFrameElement;
  /** Return iframe to pool after clearing srcdoc */
  release(iframe: HTMLIFrameElement): void;
  /** Pre-create iframes on app startup */
  warmUp(count: number): void;
  /** Current pool size */
  size(): number;
  /** Maximum pool size */
  maxSize: number;  // Default: 20
}
```

### 8.2 Pool Lifecycle

1. On app start: warm up 5 iframes
2. When widget needs iframe: `acquire()` returns from pool or creates new
3. When widget destroyed: iframe cleared and returned to pool via `release()`
4. Pool never exceeds `maxSize` — excess iframes fully destroyed

---

## 9. Kernel Infrastructure Used by Runtime

| Component | Location | How Runtime Uses It |
|---|---|---|
| Event Bus | `src/kernel/bus/bus.ts` | Widget EMIT → bus, bus events → widget via bridge |
| widgetStore | `src/kernel/stores/widget/widget.store.ts` | Widget registry, instance tracking, state persistence |
| WidgetManifest | `src/kernel/schemas/widget-manifest.ts` | Manifest validation, event contract, config schema |
| WidgetEvents | `src/kernel/schemas/bus-event.ts` | 5 widget lifecycle event constants |
| ShellEvents | `src/kernel/schemas/bus-event.ts` | Theme change events for forwarding to widgets |
| BusEvent | `src/kernel/schemas/bus-event.ts` | Event type for bridge message validation |

---

## 10. Testing Strategy

### 10.1 Testing Stack

| Tool | Purpose |
|---|---|
| **Vitest** | Unit and integration tests |
| **jsdom** | DOM environment for React component tests (WidgetFrame, ErrorBoundary) |
| **@testing-library/react** | React component testing utilities |
| **Fake Timers** | Test timeouts, grace periods, rate limiting |
| **Vitest Coverage** | 80% threshold |

### 10.2 Test Categories

#### WidgetFrame Component Tests

```typescript
describe('WidgetFrame', () => {
  it('renders iframe with sandbox="allow-scripts allow-forms"')
  it('does NOT include allow-same-origin in sandbox')
  it('uses srcdoc, not src')
  it('memoizes srcdoc — same reference on re-render with same props')
  it('rebuilds srcdoc when widgetHtml changes')
  it('does NOT rebuild srcdoc when config or theme changes')
  it('uses display:none when visible=false, not conditional render')
  it('uses instanceId as React key')
  it('lazy-loads srcdoc via IntersectionObserver')
})
```

#### Bridge Protocol Tests

```typescript
describe('Bridge', () => {
  // Host → Widget messages
  it('sends INIT with widgetId, instanceId, config, and theme')
  it('sends EVENT with typed bus event')
  it('sends CONFIG_UPDATE with new config')
  it('sends THEME_UPDATE with new theme tokens')
  it('sends RESIZE with width and height')
  it('sends STATE_RESPONSE with key and value')
  it('sends DESTROY signal')

  // Widget → Host messages
  it('handles READY and flushes event queue')
  it('handles REGISTER and stores manifest')
  it('handles EMIT and forwards to event bus')
  it('handles SET_STATE and persists')
  it('handles GET_STATE and responds with STATE_RESPONSE')
  it('handles LOG and prefixes with widget ID')

  // Validation
  it('rejects malformed HostMessage')
  it('rejects malformed WidgetMessage')
  it('rejects message from unknown source (origin check)')
  it('rejects SET_STATE exceeding 1MB')

  // Queue
  it('queues events sent before READY')
  it('flushes queue in order on READY')
  it('drops oldest when queue exceeds 1000')
  it('delivers directly after READY (no queue)')
})
```

#### Widget SDK Tests

```typescript
describe('WidgetSDK', () => {
  it('register() posts REGISTER message to parent')
  it('ready() posts READY message to parent')
  it('ready() without register() throws error')
  it('emit() posts EMIT message to parent')
  it('subscribe() registers handler for event type')
  it('unsubscribe() removes specific handler')
  it('setState() posts SET_STATE to parent')
  it('getState() posts GET_STATE and resolves with response')
  it('getConfig() returns config from last INIT/CONFIG_UPDATE')
  it('onThemeChange() receives theme tokens on THEME_UPDATE')
  it('onResize() receives dimensions on RESIZE')
})
```

#### Lifecycle State Machine Tests

```typescript
describe('WidgetLifecycle', () => {
  it('starts in UNLOADED state')
  it('transitions to LOADING when widget enters viewport')
  it('transitions to INITIALIZING when iframe loads')
  it('transitions to READY on READY message')
  it('transitions to RUNNING on first event delivery')
  it('transitions to DESTROYING on destroy call')
  it('transitions to DEAD after 100ms grace period')
  it('transitions to ERROR on crash detection')
  it('recovers from ERROR to LOADING on reload')
  it('times out to ERROR if no READY within 500ms')
  it('rejects invalid state transitions')
})
```

#### Security Tests

```typescript
describe('RateLimiter', () => {
  it('allows events under the rate limit')
  it('throttles events exceeding 100/sec default')
  it('resets count after window expires')
  it('uses per-widget custom limits')
  it('emits widget.rate.limited event when throttling')
})

describe('CSP', () => {
  it('generates correct CSP meta tag for sandbox')
  it('blocks connect-src by default')
  it('allows inline scripts and styles')
  it('allows data: and blob: for images')
})

describe('SandboxPolicy', () => {
  it('always includes allow-scripts allow-forms')
  it('NEVER includes allow-same-origin')
  it('NEVER includes allow-top-navigation')
  it('NEVER includes allow-popups')
})
```

#### iframe Pool Tests

```typescript
describe('IframePool', () => {
  it('warms up requested number of iframes')
  it('acquire returns iframe from pool')
  it('acquire creates new when pool empty')
  it('release returns iframe after clearing srcdoc')
  it('does not exceed maxSize')
  it('destroys excess iframes')
})
```

### 10.3 Gate Tests (Required for L3 Completion)

These mandatory integration tests must pass before Layer 3 is considered complete:

```typescript
describe('L3 Gate Tests', () => {
  it('Gate 1: Widget signals READY within 500ms of iframe load')

  it('Gate 2: Widget crash → host shows per-instance error state, bus continues')

  it('Gate 3: Origin spoofing → message silently rejected, no processing')

  it('Gate 4: Theme injection → widget onThemeChange receives correct tokens')

  it('Gate 5: setState/getState round-trip persists across close and reopen')

  it('Gate 6: register() before ready() succeeds; reverse order throws error')

  it('Gate 7: State write at 1MB accepted; exceeding 1MB rejected with error')
})
```

### 10.4 Coverage Requirements

| Module | Minimum Coverage |
|---|---|
| `bridge/bridge.ts` | 90% |
| `bridge/message-validator.ts` | 95% |
| `bridge/message-queue.ts` | 90% |
| `WidgetFrame.tsx` | 85% |
| `sdk/sdk-template.ts` | 90% |
| `sdk/sdk-builder.ts` | 85% |
| `lifecycle/manager.ts` | 90% |
| `lifecycle/error-boundary.tsx` | 85% |
| `lifecycle/lazy-loader.ts` | 85% |
| `security/csp.ts` | 90% |
| `security/rate-limiter.ts` | 90% |
| `security/sandbox-policy.ts` | 90% |
| `pool/iframe-pool.ts` | 85% |
| **Runtime overall** | **80%** |

---

## 11. Build Order & Task Dependencies

### Phase 1: Message Foundation (Can Parallelize)

```
L0 Complete ──→ R-MSG-TYPES ──→ R-BRIDGE ──→ R-QUEUE
                             ──→ R-SDK-TEMPLATE
                             ──→ R-MSG-VALIDATOR
```

**Tasks:**
- `R-MSG-TYPES`: HostMessage and WidgetMessage discriminated unions with Zod schemas
- `R-BRIDGE`: Host-side postMessage bridge with validation and origin check
- `R-QUEUE`: Message queue for pre-READY events (max 1000, drop oldest)
- `R-SDK-TEMPLATE`: StickerNest SDK global object with all API methods
- `R-MSG-VALIDATOR`: Zod schemas for all bridge message types

### Phase 2: iframe Core (Sequential — Critical Path)

```
R-BRIDGE + R-SDK-TEMPLATE ──→ R-SDK-BUILDER ──→ R-CSP
                            ──→ R-WIDGET-FRAME ──→ R-LAZY
                                              ──→ R-SANDBOX
                            ──→ R-LIFECYCLE ──→ R-ERROR-BOUNDARY
```

**Tasks:**
- `R-SDK-BUILDER`: Assemble srcdoc HTML (SDK + CSP + widget code)
- `R-CSP`: Content Security Policy generation for iframe srcdoc
- `R-WIDGET-FRAME`: WidgetFrame React component (sandbox, srcdoc, memoization, no conditional render)
- `R-LAZY`: IntersectionObserver lazy loader
- `R-SANDBOX`: Sandbox attribute configuration and validation
- `R-LIFECYCLE`: Widget lifecycle state machine (8 states, transitions, timeouts)
- `R-ERROR-BOUNDARY`: React error boundary with reload/remove UI

### Phase 3: Security + Pool (Partially Parallel)

```
R-BRIDGE ──→ R-RATE-LIMITER
R-WIDGET-FRAME ──→ R-IFRAME-POOL
```

**Tasks:**
- `R-RATE-LIMITER`: Per-widget event emission rate limiting (100/sec default)
- `R-IFRAME-POOL`: iframe reuse pool (acquire, release, warm-up, maxSize)

### Phase 4: Init + Integration Testing

```
All above ──→ R-INIT
           ──→ R-GATE-TESTS
           ──→ R-INTEGRATION
```

**Tasks:**
- `R-INIT`: `initRuntime()` / `teardownRuntime()` orchestration
- `R-GATE-TESTS`: All 7 mandatory gate tests
- `R-INTEGRATION`: Full integration test — widget lifecycle through bus to other widgets

---

## 12. Mock Factories

```typescript
// test/runtime-factories.ts
export function createMockIframe(overrides?: Partial<MockIframe>): MockIframe;
export function createMockBridge(bus: IEventBus): MockBridge;
export function createMockWidgetHtml(content?: string): string;
export function createMockManifest(overrides?: Partial<WidgetManifest>): WidgetManifest;
export function createMockSrcdoc(sdkCode: string, widgetCode: string): string;
export function createMockLifecycle(): MockLifecycleManager;
export function createMockThemeTokens(): ThemeTokens;
```

---

## Appendix A: Key Decisions

| Decision | Rationale |
|---|---|
| No `allow-same-origin` on any iframe | Security foundation — prevents all host DOM/storage access |
| srcdoc-based loading, never remote src | Self-contained widgets, no server round-trip, no URL leaks |
| CSP blocks `connect-src` by default | Widgets cannot phone home or exfiltrate data |
| 100ms DESTROY grace period | Enough for STATE_SAVE, not enough for complex teardown |
| 500ms READY timeout | Widgets that can't init in 500ms are probably broken |
| 1MB instance state limit | Prevents memory abuse — widgets should be lightweight |
| 10MB user state limit | Allows meaningful cross-canvas state without abuse |
| Rate limit 100 events/sec default | Prevents bus flooding, configurable per-widget |
| Message queue max 1000 | Prevents memory leak if widget never sends READY |
| useMemo keyed on [widgetId, widgetHtml] | Config/theme changes via bridge, not iframe reload |

## Appendix B: Theme Token CSS Variables

Built-in themes inject these CSS variables on the `<html>` element:

| Token | Light | Dark |
|---|---|---|
| `--sn-bg` | `#ffffff` | `#1a1a2e` |
| `--sn-surface` | `#f5f5f5` | `#16213e` |
| `--sn-accent` | `#6366f1` | `#818cf8` |
| `--sn-text` | `#1a1a2e` | `#e2e8f0` |
| `--sn-text-muted` | `#64748b` | `#94a3b8` |
| `--sn-border` | `#e2e8f0` | `#334155` |
| `--sn-radius` | `8px` | `8px` |
| `--sn-font-family` | `system-ui, sans-serif` | `system-ui, sans-serif` |
