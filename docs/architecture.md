# StickerNest V5 — Architecture Documentation

**Last updated:** 2026-03-23
**Source of truth:** This document reflects the actual codebase at `src/` and the canonical naming in `v5 terminology.pdf`.

---

## 1. What Is StickerNest V5?

StickerNest V5 is a spatial operating system — an infinite-canvas platform where widgets, entities, and event-driven pipelines compose into interactive spaces. It runs in three environments: browser (2D canvas), spatial/3D (Three.js), and VR (WebXR / Quest 3).

The mental model maps directly to a desktop OS. The canvas is the desktop. Stickers are icons. Widgets are apps. The event bus is IPC. The marketplace is the app store.

---

## 2. Core Design Principles

Every architectural decision enforces separation between three conceptual layers:

- **Layer A — Spatial:** canvas, entities, rendering, z-order, input routing
- **Layer B — Data:** DataSources — persistent records independent of widgets
- **Layer C — Interaction:** widgets, scripts, pipelines, event bus

Crossing these boundaries was the primary source of V4 technical debt. V5 prevents it structurally via ESLint rules (`eslint-plugin-boundaries`), `dependency-cruiser`, and strictly enforced import rules per layer.

---

## 3. Layer Architecture

The system is organized into seven layers with a strict build order. Each layer may only import from layers below it — never sideways or upward. All cross-layer communication goes through the event bus or the shared type package `@sn/types`.

### Build Order

```
L0 (Kernel) → L1 (Social) → L3 (Runtime) → L2 (Lab)
  → L4A/4B (Canvas/Spatial) → L5 (Marketplace) → L6 (Shell)
```

Each layer must be independently testable before the next begins.

### Layer Overview

| Layer | Name | Path | Responsibility |
|-------|------|------|----------------|
| L0 | Kernel | `src/kernel/` | Schemas, event bus, stores, auth, Supabase client, DataSource CRUD, billing, quota, API keys, social graph, world manager |
| L1 | Social | `src/social/` | Real-time collaboration — presence, cursors, entity sync, conflict resolution, Yjs CRDT, edit locks, offline degradation |
| L2 | Lab | `src/lab/` | Widget IDE — Monaco editor, live preview, event inspector, node graph, AI generation, manifest editor, publish pipeline |
| L3 | Runtime | `src/runtime/` | Widget sandbox — WidgetFrame (iframe), bridge protocol, Widget SDK, built-in widgets, cross-canvas routing |
| L4A | Canvas (2D) | `src/canvas/` | Infinite canvas — core viewport, tools, pipeline wiring, UI panels |
| L4B | Spatial (3D/VR) | `src/spatial/` | Three.js scene, WebXR sessions, VR controller input, spatial entity mapping |
| L5 | Marketplace | `src/marketplace/` | Widget discovery, installation, ratings, reviews, publisher dashboard, license enforcement |
| L6 | Shell | `src/shell/` | Application shell — routing, auth gating, layout, theme system, keyboard shortcuts, error boundary |

### Import Rules Matrix

Each layer may only import from layers listed below it:

| Layer | May Import From |
|-------|-----------------|
| L0: Kernel | *(nothing — foundation layer)* |
| L1: Social | L0 |
| L3: Runtime | L0 |
| L2: Lab | L0, L1, L3 |
| L4A-1: Canvas Core | L0, L3 |
| L4A-2: Canvas Tools | L0, L3, L4A-1 |
| L4A-3: Canvas Wiring | L0, L3, L4A-1 |
| L4A-4: Canvas Panels | L0, L3, L4A-1 |
| L4B: Spatial | L0, L3 |
| L5: Marketplace | L0, L1, L3, L4A-1 |
| L6: Shell | L0, L1, L3, L4A-1, L4B, L5 |

L4A and L4B are peers — neither imports the other. Communication between 2D canvas and 3D spatial goes through the event bus.

---

## 4. Layer 0 — Kernel (`src/kernel/`)

The kernel is the foundation of the entire system. It has zero dependencies on other application layers. Everything above depends on what is defined here.

### Modules

| Path | Purpose |
|------|---------|
| `src/kernel/schemas/` | All shared Zod schemas and TypeScript types, exported via `@sn/types` |
| `src/kernel/bus/` | Typed pub/sub event bus with ring buffer history |
| `src/kernel/stores/` | Nine Zustand stores (one domain each) |
| `src/kernel/auth/` | Authentication — email/password + OAuth |
| `src/kernel/supabase/` | Single Supabase client instance |
| `src/kernel/datasource/` | DataSource CRUD API with ACL enforcement |
| `src/kernel/billing/` | Billing API — tier management, Stripe/PayPal integration |
| `src/kernel/quota/` | Quota enforcement — per-tier limits, `useQuotaCheck` hook |
| `src/kernel/api-keys/` | User API key management (BYOK) for external integrations |
| `src/kernel/social-graph/` | Social graph — profiles, follows, blocks, messages, posts, reactions |
| `src/kernel/world/` | World manager — tick loop, world instances (entity systems runtime) |
| `src/kernel/systems/` | Entity systems — animation system, physics system |

### Schema Registry (`@sn/types`)

The `@sn/types` package alias resolves to `src/kernel/schemas/index.ts`. This barrel file is the single source of truth for all shared types. Schemas are defined with Zod and exported alongside their inferred TypeScript types and JSON schema representations (via `z.toJSONSchema()`).

Schema domains:

- **Spatial:** `Vector3`, `Quaternion`, `Point2D`, `Size2D`, `BoundingBox2D`, `SpatialContext`, XR session types, hand joints, detected planes/meshes, spatial anchors
- **Bus Events:** `BusEvent` base schema plus namespaced event constants (`KernelEvents`, `SocialEvents`, `CanvasEvents`, `WidgetEvents`, `ShellEvents`, `SpatialEvents`, `MarketplaceEvents`, `CrossCanvasEvents`, etc.)
- **DataSource:** types (`doc | table | note | folder | file | custom`), scopes (`canvas | user | shared | public`), ACL roles (`owner | editor | commenter | viewer`)
- **Canvas Entities:** 14 entity types — `sticker`, `text`, `widget`, `shape`, `drawing`, `group`, `docker`, `lottie`, `audio`, `svg`, `path`, `object3d`, `artboard`, `folder`
- **Widget Manifest:** permissions, event ports, config schema, size constraints, author, license
- **Pipeline:** ports, nodes, edges, DAG graph model
- **Social Graph:** profiles, follows, posts, reactions, comments, notifications, widget invites, feeds
- **Canvas Document:** backgrounds (solid/gradient/image), viewport config, layout modes, platform
- **Database Management:** column types, table schemas, views, filters, sorts, AI operations, Notion sync
- **Docker:** dockable widget containers, tabs, dock modes
- **Gallery:** asset management
- **Theme:** core/extended/full token schemas, theme names
- **Widget Design Spec:** colors, typography, spacing, borders, shadows, components
- **API Keys:** provider types, statuses, validation

### BusEvent Schema

The actual BusEvent shape in code:

```typescript
{
  type: string,        // dot-namespaced (e.g., 'widget.mounted', 'social.cursor.moved')
  payload: unknown,    // shape varies by event type
  spatial?: SpatialContext,  // ALWAYS optional — only for VR/3D events
  timestamp?: number,  // milliseconds since epoch, populated by the bus
}
```

Event type namespaces: `widget.*`, `social.*`, `canvas.*`, `spatial.*`, `shell.*`, `marketplace.*`, `crossCanvas.*`, `kernel.*`, `grid.*`, `docker.*`, `gallery.*`.

### Event Bus (`src/kernel/bus/`)

The bus is the backbone of cross-layer communication. Implementation details:

- Typed pub/sub: subscribe by event type, emit with typed payload
- Emit-to-handler latency target: **< 1ms** (hard performance contract)
- Ring buffer for event history replay
- Exposes a `bench()` API for throughput benchmarks
- Stores **never** read each other's state directly — all cross-store coordination goes through the bus

Files: `bus.ts`, `ring-buffer.ts`, `types.ts`, plus co-located tests.

### Zustand Stores

Nine stores, each a standalone Zustand slice. Stores do not import from each other. Each exports a `setup*BusSubscriptions()` function wired up at app startup via `setupAllStoreBusSubscriptions()`.

| Store | Domain |
|-------|--------|
| `authStore` | Current user, session, auth status |
| `workspaceStore` | Workspace metadata, member list, settings |
| `canvasStore` | Active canvas ID, canvas metadata, sharing settings |
| `historyStore` | Undo/redo stack (powered by bus ring buffer) |
| `widgetStore` | Widget registry, widget instance list |
| `socialStore` | Presence map, cursor positions |
| `uiStore` | UI flags, `canvasInteractionMode: 'edit' | 'preview'`, active tool |
| `dockerStore` | Dockable container state, visible/docked/floating docker selectors |
| `galleryStore` | Asset library state |

### DataSource System

DataSources are persistent data records independent of any widget. Six types (`doc`, `table`, `note`, `folder`, `file`, `custom`) with four scope levels (`canvas`, `user`, `shared`, `public`). Scope controls visibility; ACL roles control write permission.

ACL enforcement is applied at the API boundary — every write checks the caller's role before proceeding:

- **owner:** full control including ACL management and deletion
- **editor:** full read/write on source data
- **commenter:** can annotate, cannot mutate source data
- **viewer:** read-only under all code paths

### Supabase

Single client instance created in `src/kernel/supabase/` and imported by all higher layers. Required tables: `users`, `canvases`, `entities`, `widgets`, `stickers`, `pipelines`, `widget_connections`, `presence`, `data_sources`, `data_source_acl`, `widget_instances`, `user_installed_widgets`, `user_widget_state`.

---

## 5. Layer 1 — Social (`src/social/`)

The real-time collaboration layer. Invisible to end users as a UI surface — it is platform plumbing for multi-user sync.

### Modules

| Path | Purpose |
|------|---------|
| `src/social/channel/` | Supabase Realtime channel management (one channel per canvas: `canvas:{canvasId}`) |
| `src/social/presence/` | Join/leave tracking, presence map in socialStore |
| `src/social/cursor/` | Cursor position broadcast, throttled to 30fps max |
| `src/social/entity-sync/` | Entity transform broadcast — optimistic during drag, reconcile on drop |
| `src/social/conflict/` | Conflict resolution per data type |
| `src/social/yjs-sync/` | Yjs CRDT sync for Doc DataSources |
| `src/social/edit-lock/` | Advisory per-entity edit locks (30s timeout, not hard-enforced) |
| `src/social/offline/` | Graceful offline degradation and reconnect |

### Conflict Resolution Strategies

| Data Type | Strategy | Behavior |
|-----------|----------|----------|
| Canvas entities (position, transform) | Last-write-wins, silent | Most recent write wins by server timestamp; no user notification |
| Doc DataSources | Yjs CRDT | One `Y.Doc` per DataSource; synced via Realtime as binary updates; no keystrokes lost |
| Table & Custom DataSources | Revision-based with LWW fallback | Row-level revision counter; 409 Conflict on stale write; toast notification, auto-refresh, retry |
| Note DataSources | Last-write-wins, silent | Same as entity LWW |

### Bus Events (`social.*` namespace)

- `social.presence.joined` / `social.presence.left`
- `social.cursor.moved`
- `social.entity.transformed`
- `social.datasource.updated`
- `social.conflict.rejected`

---

## 6. Layer 3 — Runtime (`src/runtime/`)

The security boundary. All widgets — built-in and third-party — run through this layer.

### Modules

| Path | Purpose |
|------|---------|
| `src/runtime/bridge/` | Typed postMessage protocol (host ↔ widget), Zod-validated |
| `src/runtime/sdk/` | Widget SDK injected into every iframe |
| `src/runtime/widgets/` | Built-in trusted inline widgets |
| `src/runtime/cross-canvas/` | Cross-canvas event routing |
| `src/runtime/integrations/` | External service proxy (credentials never enter iframe) |
| `src/runtime/lifecycle/` | Widget lifecycle management |
| `src/runtime/pool/` | iframe pooling |
| `src/runtime/security/` | CSP enforcement, origin validation |

### WidgetFrame

The sandboxed iframe host component. Key rules:

- Widget HTML loaded via `srcdoc` blob — never a remote `src` URL
- Strict Content Security Policy on every iframe
- Widget SDK injected via `<script>` tag before load
- Lifecycle: `load → init → READY → run → unmount` (READY must signal within 500ms)
- Widget crash caught by error boundary — never crashes the host or bus

### Widget SDK API

Available to widgets as `StickerNest` on `window`:

```
StickerNest.emit(type, payload)         // post event to host bus
StickerNest.subscribe(type, handler)    // receive bus events
StickerNest.setState(key, value)        // instance state (1MB limit)
StickerNest.getState(key)               // async state retrieval
StickerNest.setUserState(key, value)    // cross-canvas user state (10MB limit)
StickerNest.getUserState(key)
StickerNest.getConfig()                 // user-configured instance values
StickerNest.register(manifest)          // declare event contract (before ready)
StickerNest.ready()                     // signal init complete (within 500ms)
StickerNest.onThemeChange(handler)      // receive theme tokens
StickerNest.onResize(handler)           // receive viewport dimensions
StickerNest.integration(name).query()   // proxied external data read
StickerNest.integration(name).mutate()  // proxied external data write
StickerNest.emitCrossCanvas(channel, payload)
StickerNest.subscribeCrossCanvas(channel, handler)
StickerNest.unsubscribeCrossCanvas(channel)
```

### Widget Permissions

Declared in the widget manifest. Users see these before installing:

`storage`, `user-state`, `integrations`, `clipboard`, `notifications`, `media`, `geolocation`, `cross-canvas`, `ai`, `checkout`, `auth`, `datasource`, `datasource-write`

### Built-in Widgets

Located in `src/runtime/widgets/`. Current set:

- `image-generator/` — AI image generation widget
- `kanban/` — Kanban board widget
- `pathfinder/` — Pathfinding/navigation widget
- `stories/` — Stories/narrative widget
- `todo-list/` — Task management widget

Built-in widgets are trusted (no iframe sandbox) but must use the same SDK interface as third-party widgets.

### Security Non-Negotiables

1. `srcdoc` blob only — no remote URLs
2. Origin validation on every `message` handler
3. No integration credentials in iframe context
4. No direct bucket/CDN URLs in iframe context
5. Strict CSP — never relax it
6. Widget crash must not crash the host

---

## 7. Layer 2 — Lab (`src/lab/`)

The in-app IDE for creating, testing, and publishing widgets. Desktop-browser-first; Creator+ tier gated at the route level.

### Modules

| Path | Purpose |
|------|---------|
| `src/lab/editor/` | Monaco editor, single-file HTML widget format |
| `src/lab/preview/` | Live preview in Runtime sandbox (WidgetFrame) |
| `src/lab/inspector/` | Event inspector for preview sessions |
| `src/lab/graph/` | Node graph for visual no-code widget composition |
| `src/lab/ai/` | AI generation panel (prompt → widget HTML via platform proxy) |
| `src/lab/manifest/` | Manifest editor GUI |
| `src/lab/versions/` | Snapshot save and restore |
| `src/lab/publish/` | Publish pipeline: validate → test → thumbnail → submit |
| `src/lab/import/` | Load Marketplace widgets for forking (respects licenses) |
| `src/lab/design-spec/` | Widget design specification tools |
| `src/lab/guards/` | Access control route guards |
| `src/lab/hooks/` | Shared React hooks |
| `src/lab/components/` | Shared UI components (LabAI, LabGraph, views) |

### Widget Format

Widgets are single-file HTML: HTML + JS + CSS in one `.html` file. The SDK is injected by the Runtime — widget authors do not bundle it.

### Publish Pipeline

Four mandatory steps (no skipping):

1. **Validate** — check for `StickerNest.register(manifest)` and `StickerNest.ready()` calls
2. **Test** — headless Runtime sandbox; READY within 500ms; no uncaught errors
3. **Thumbnail** — screenshot via Playwright with `--use-gl=swiftshader`
4. **Submit** — send to Marketplace API

---

## 8. Layer 4A — Canvas (`src/canvas/`)

The 2D infinite canvas, split into four sub-layers with strict boundaries between them.

### Sub-layer 4A-1: Core (`src/canvas/core/`)

Foundation of all canvas rendering and interaction:

| Path | Purpose |
|------|---------|
| `core/viewport/` | Pan, zoom, coordinate transforms (canvas ↔ screen space) |
| `core/scene/` | Entity scene graph, z-order, spatial indexing |
| `core/hittest/` | Point and region hit-testing via spatial index |
| `core/renderer/` | Render loop (`requestAnimationFrame`), dirty-region tracking, 60fps target |
| `core/drag/` | Pointer capture and delta tracking primitives |
| `core/grid/` | Grid system |
| `core/background/` | Canvas background rendering |
| `core/geometry/` | Geometric utilities |
| `core/input/` | Input event routing |
| `core/interaction/` | Interaction mode management |
| `core/layout/` | Layout algorithms |
| `core/persistence/` | Canvas state persistence |
| `core/transforms/` | Transform utilities |

Coordinate system: canvas space is an infinite 2D plane with origin at (0,0) growing right/down. Screen space is viewport pixels. Entity positions are always stored in canvas space.

### Sub-layer 4A-2: Tools (`src/canvas/tools/`)

Interactive editing tools — only one active at a time:

| Tool | Path |
|------|------|
| Select | `tools/select/` |
| Direct Select | `tools/direct-select/` |
| Move | `tools/move/` |
| Resize | `tools/resize/` |
| Pen (freehand) | `tools/pen/` |
| Pen Path (vector) | `tools/pen-path/` |
| Text | `tools/text/` |
| Shape | `tools/shape/` |
| Sticker | `tools/sticker/` |
| Widget | `tools/widget/` |
| Grid Paint | `tools/grid-paint/` |
| Ghost Widget | `tools/ghost-widget/` |
| Pathfinder Tool | `tools/pathfinder-tool/` |
| Registry | `tools/registry/` |

Tools receive pointer events from Canvas Core via the event bus — they do not attach their own DOM listeners.

### Sub-layer 4A-3: Wiring (`src/canvas/wiring/`)

Visual Pipeline graph editor and execution engine:

| Path | Purpose |
|------|---------|
| `wiring/graph/` | Pipeline graph data model (nodes, edges, ports) |
| `wiring/engine/` | Pipeline execution — event routing through the DAG |
| `wiring/validator/` | Cycle detection, type-compatibility checking |
| `wiring/persistence/` | Pipeline save/load |
| `wiring/cross-canvas-edge/` | Cross-canvas pipeline connections |

A Pipeline is a directed acyclic graph (DAG). Nodes represent widget instances or built-in transforms (filter, map, merge, delay). Ports are typed inputs/outputs declared in widget manifests. Edges connect output ports to input ports with type compatibility enforced at creation time.

The pipeline graph is visible and editable only in edit mode. In preview mode, the graph is hidden but execution continues.

### Sub-layer 4A-4: Panels (`src/canvas/panels/`)

UI chrome — purely presentational components:

| Panel | Path |
|-------|------|
| Toolbar | `panels/toolbar/` |
| Properties | `panels/properties/` |
| Layers | `panels/layers/` |
| Assets | `panels/assets/` |
| Pipeline Inspector | `panels/pipeline-inspector/` |
| Context Menu | `panels/context-menu/` |
| Floating Action Bar | `panels/floating-bar/` |
| Minimap | `panels/minimap/` |

Panels read from stores via selectors and dispatch intent by emitting bus events. They contain no business logic.

---

## 9. Layer 4B — Spatial (`src/spatial/`)

The 3D and VR rendering environment, running alongside the 2D canvas as a peer (not a child).

### Modules

| Path | Purpose |
|------|---------|
| `spatial/scene/` | Three.js scene graph and render loop |
| `spatial/session/` | WebXR session lifecycle |
| `spatial/xr-session/` | XR session management |
| `spatial/controller/` | VR controller input (ray casting, trigger, grip, thumbstick) |
| `spatial/input/` | Input event handling |
| `spatial/entities/` | 3D entity representations |
| `spatial/entity-mapping/` | 2D ↔ 3D entity position mapping |
| `spatial/locomotion/` | VR locomotion (teleport/smooth) |
| `spatial/components/` | React Three Fiber components |
| `spatial/mr/` | Mixed reality support |
| `spatial/legacy/` | Legacy compatibility |

Uses `@react-three/fiber` for React integration and `@react-three/xr` for WebXR. One Three.js renderer instance only.

### SpatialContext

When bus events originate from spatial interactions, they populate the optional `spatial` field:

```typescript
{
  position: Vector3,
  rotation: Quaternion,
  normal: Vector3
}
```

For non-spatial events, `spatial` is `undefined` — never defaulted to zero vectors.

---

## 10. Layer 5 — Marketplace (`src/marketplace/`)

Widget discovery, installation, and publishing.

### Modules

| Path | Purpose |
|------|---------|
| `marketplace/api/` | Backend API integration |
| `marketplace/listing/` | Widget list/grid view with search and categories |
| `marketplace/detail/` | Widget detail page (description, screenshots, manifest, reviews) |
| `marketplace/install/` | Installation flow with manifest validation |
| `marketplace/publisher/` | Publisher dashboard (submit, update, deprecate) |
| `marketplace/reviews/` | Ratings and reviews |

### Installation Flow

1. User clicks Install → fetch widget HTML + manifest
2. Validate manifest against `WidgetManifest` schema from `@sn/types`
3. On pass: register in `widgetStore` via bus event, emit `marketplace.widget.installed`
4. On fail: show specific error, do not install

License types: `MIT`, `Apache-2.0`, `proprietary`, `no-fork`.

---

## 11. Layer 6 — Shell (`src/shell/`)

The outermost application shell. The only layer that may import from (almost) all others.

### Modules

| Path | Purpose |
|------|---------|
| `shell/router/` | Application routing |
| `shell/layout/` | Top-level layout with named slots |
| `shell/theme/` | Theme system (light/dark/high-contrast/custom) |
| `shell/shortcuts/` | Global keyboard shortcut registry |
| `shell/error/` | Application-level error boundary |
| `shell/pages/` | Route-level page components |
| `shell/components/` | Shared shell components (auth, docker) |
| `shell/canvas/` | Canvas page integration (apis, components, handlers, hooks, panels, renderers, utils) |
| `shell/profile/` | User profile management |
| `shell/data/` | Data components |
| `shell/dev/` | Developer tools (components, hooks, panels) |

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Workspace home / dashboard |
| `/canvas/:canvasId` | Canvas view (edit or preview by role) |
| `/canvas/:slug` | Public/embed view (always preview) |
| `/lab` | Widget Lab (Creator+ tier gated) |
| `/marketplace` | Marketplace |
| `/settings` | User and workspace settings |
| `/invite/:token` | Invite acceptance |

### Theme Tokens

Injected as CSS custom properties on `<html>`:

```
--sn-bg, --sn-surface, --sn-accent, --sn-text,
--sn-text-muted, --sn-border, --sn-radius, --sn-font-family
```

Theme changes emit `shell.theme.changed` on the bus so Runtime forwards updated tokens to widget iframes.

---

## 12. Canvas Entity Types

All objects on the canvas extend `CanvasEntityBase` with a `Transform2D` (position, size, rotation, scale) and an optional `Transform3D` for spatial placement.

| Type | Schema | Description |
|------|--------|-------------|
| `sticker` | `StickerEntitySchema` | Visual asset (image/GIF/video) with optional click actions; never contains logic |
| `text` | `TextEntitySchema` | Text block |
| `widget` | `WidgetContainerEntitySchema` | Interactive program in sandboxed iframe or trusted inline component |
| `shape` | `ShapeEntitySchema` | Vector shape (rect, ellipse, line, etc.) |
| `drawing` | `DrawingEntitySchema` | Freehand pen stroke |
| `group` | `GroupEntitySchema` | Container for grouped entities |
| `docker` | `DockerEntitySchema` | Container widget hosting child widgets |
| `lottie` | `LottieEntitySchema` | Lottie animation |
| `audio` | `AudioEntitySchema` | Audio player |
| `svg` | `SvgEntitySchema` | Inline SVG markup |
| `path` | `PathEntitySchema` | Vector path with anchor points and fill rules |
| `object3d` | `Object3DEntitySchema` | 3D object for spatial layer |
| `artboard` | `ArtboardEntitySchema` | Design artboard container |
| `folder` | `FolderEntitySchema` | Organizational folder |

---

## 13. Canvas Interaction Modes

Two modes, stored in `uiStore.canvasInteractionMode`:

- **Edit mode:** full entity manipulation, pipeline graph visible, all panels active. Available to Owner/Editor roles.
- **Preview mode:** widgets fully interactive, layout locked, pipeline graph hidden (execution continues). Used for slug URLs, embeds, fullscreen toggle, and Viewer/Commenter roles.

Mode is never persisted — always derived from role and URL context on load.

---

## 14. Pipeline System

Pipelines are the visual event-routing layer connecting widget outputs to widget inputs.

**Data model:**
- **Node:** widget instance or built-in transform (filter, map, merge, delay)
- **Port:** typed input/output on a node, declared in the widget manifest
- **Edge:** connects output port → input port (type-compatible only)

**Constraints:**
- DAG only — no cycles (enforced at edge creation via DFS)
- Single output port may fan out to multiple inputs
- Single input port accepts only one incoming edge
- Orphaned nodes (no edges) are allowed but inert

**Execution:**
- When a widget emits an event, the engine checks pipeline edges from that widget's output ports
- Matching edges forward the payload to the target input port's widget
- Synchronous for pass-through edges; async transforms must not block the bus

---

## 15. Security Architecture

### Widget Sandbox

Every third-party widget runs in an iframe loaded via `srcdoc` with a strict CSP. The bridge protocol validates all messages with Zod schemas and checks origin on every incoming `message` event. Integration credentials and direct media URLs never enter the iframe.

### Permission Model

Widgets declare permissions in their manifest. Users see them before installing. The Runtime enforces permissions at the bridge level — messages for undeclared permissions are silently dropped.

### Cross-Canvas Security

Cross-canvas events require the `cross-canvas` permission. Channel names are validated against `^[a-zA-Z0-9._-]{1,128}$`. Rate-limited to 100 events/second per instance. Payload capped at 64KB.

### State Limits

- Instance state: 1MB per widget instance
- User state: 10MB total per user

---

## 16. Theming

The theme system lives in Shell (L6) and propagates to all layers via the bus.

**Core tokens:** `--sn-bg`, `--sn-surface`, `--sn-accent`, `--sn-text`, `--sn-text-muted`, `--sn-border`, `--sn-radius`, `--sn-font-family`

**Built-in themes:** `light`, `dark`, `high-contrast`

Custom workspace themes override built-ins. Theme changes emit `shell.theme.changed` so the Runtime can forward tokens into widget iframes via the bridge protocol.

The schema system defines three tiers: `CoreThemeTokens`, `ExtendedThemeTokens`, and `FullThemeTokens`.

---

## 17. Tech Stack

| Concern | Technology |
|---------|-----------|
| Language | TypeScript (strict) |
| Build | Vite |
| UI framework | React |
| State management | Zustand (9 stores) |
| Schema validation | Zod v4+ |
| Backend | Supabase (auth, realtime, database, storage) |
| 3D rendering | Three.js via `@react-three/fiber` |
| VR | WebXR via `@react-three/xr` |
| CRDT | Yjs + y-protocols |
| Code editor | Monaco |
| Unit testing | Vitest (80% coverage threshold) |
| E2E testing | Playwright (`--use-gl=swiftshader` for deterministic GPU-free CI) |
| Layer enforcement | `dependency-cruiser` + `eslint-plugin-boundaries` |
| Scaffolding | Plop generators |
| Commit format | Conventional Commits with required layer scope |
| CI deploy | Vercel |
| Component development | Storybook |
| Git hooks | Husky + lint-staged |

---

## 18. Development Commands

```bash
# Build & Run
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc + vite build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint with layer boundary enforcement
npm run lint:fix         # ESLint autofix

# Testing
npm test                 # vitest run (all unit tests)
npm run test:watch       # vitest watch mode
npm run test:coverage    # v8 coverage (80% threshold)
npm run e2e              # Playwright E2E
npm run e2e:headed       # Playwright with browser visible

# Architecture Validation
npm run deps:validate    # dependency-cruiser layer boundary checks

# Database (Supabase Local)
npm run db:start / db:stop / db:reset / db:migrate

# Scaffolding
npm run scaffold:widget / scaffold:module / scaffold:schema / scaffold:event / scaffold:store

# Other
npm run storybook        # Storybook on port 6006
npm run deploy:preview   # Vercel preview deploy
npm run deploy:prod      # Vercel production deploy
```

---

## 19. Commit Convention

Format: `<type>(<scope>): <description>`

Scopes must match layers: `kernel`, `social`, `runtime`, `lab`, `canvas-core`, `canvas-tools`, `canvas-wiring`, `canvas-panels`, `spatial`, `marketplace`, `shell`, `deps`, `config`, `ci`

Enforced via Husky `commit-msg` hook with commitlint.

---

## 20. Testing Strategy

- **Unit tests:** Vitest with 80% threshold on branches, functions, lines, and statements. Every module needs a co-located `*.test.ts` file.
- **E2E tests:** Playwright with `--use-gl=swiftshader` for deterministic, GPU-free CI.
- **Performance:** `bench()` API on the event bus for throughput verification (< 1ms emit-to-handler).
- **Architecture:** `dependency-cruiser` validates layer boundaries; `eslint-plugin-boundaries` enforces import rules at lint time.

Test environment: `node` by default; `happy-dom` for runtime, shell, spatial, and social layer tests (configured via `vitest.config.ts` `environmentMatchGlobs`).

---

## 21. Terminology (Source of Truth)

These terms have precise meanings in StickerNest V5. Using the wrong word causes confusion across docs and code.

| Term | Definition | Never call it |
|------|-----------|---------------|
| **Canvas** | The infinite 2D/3D workspace | board, scene, stage |
| **Entity** | Any object with a canvas position | element, node, item |
| **DataSource** | Persistent data record (`doc | table | note | folder | file | custom`) | data, dataset, record |
| **Widget** | Interactive program in sandboxed iframe or trusted inline component | app, plugin, extension |
| **Sticker** | Visual asset (image/GIF/video) that triggers logic; never contains logic | icon, image, stamp |
| **Pipeline** | Visual event chain connecting widget outputs to inputs | flow, workflow, automation |
| **Event Bus** | Typed pub/sub IPC layer | message bus, event emitter |
| **Script** | Headless JS automation on the event bus (no UI) | macro, bot |
| **Docker** | Container widget that hosts child widgets | dock, panel, container |

---

## Appendix A: Directory → Layer Map (Quick Reference)

```
src/
├── kernel/          # L0: Kernel (foundation — no dependencies)
│   ├── api-keys/
│   ├── auth/
│   ├── billing/
│   ├── bus/
│   ├── datasource/
│   ├── quota/
│   ├── schemas/
│   ├── social-graph/
│   ├── stores/
│   ├── supabase/
│   ├── systems/
│   └── world/
├── social/          # L1: Social + Sync
│   ├── channel/
│   ├── conflict/
│   ├── cursor/
│   ├── edit-lock/
│   ├── entity-sync/
│   ├── offline/
│   ├── presence/
│   └── yjs-sync/
├── runtime/         # L3: Widget Runtime
│   ├── bridge/
│   ├── cross-canvas/
│   ├── integrations/
│   ├── lifecycle/
│   ├── pool/
│   ├── sdk/
│   ├── security/
│   └── widgets/
├── lab/             # L2: Widget Lab
│   ├── ai/
│   ├── components/
│   ├── design-spec/
│   ├── editor/
│   ├── graph/
│   ├── guards/
│   ├── hooks/
│   ├── import/
│   ├── inspector/
│   ├── manifest/
│   ├── preview/
│   ├── publish/
│   └── versions/
├── canvas/          # L4A: Canvas (2D)
│   ├── core/
│   ├── tools/
│   ├── wiring/
│   └── panels/
├── spatial/         # L4B: Spatial (3D/VR)
│   ├── components/
│   ├── controller/
│   ├── entities/
│   ├── entity-mapping/
│   ├── input/
│   ├── legacy/
│   ├── locomotion/
│   ├── mr/
│   ├── scene/
│   ├── session/
│   └── xr-session/
├── marketplace/     # L5: Marketplace
│   ├── api/
│   ├── detail/
│   ├── install/
│   ├── listing/
│   ├── publisher/
│   └── reviews/
└── shell/           # L6: Shell
    ├── canvas/
    ├── components/
    ├── data/
    ├── dev/
    ├── error/
    ├── layout/
    ├── pages/
    ├── profile/
    ├── router/
    ├── shortcuts/
    └── theme/
```
