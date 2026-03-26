# StickerNest V5 — Terminology Reference

> Quick-reference card for all agents. Consult this whenever you need exact terminology.

---

## Core Terms

| Term | Definition | Never Say |
|------|-----------|-----------|
| **Canvas** | The infinite 2D/3D workspace where all content lives | "board", "scene", "stage" |
| **Entity** | Any object with a canvas position (see entity types below) | "element", "node", "item" |
| **DataSource** | Persistent data record, independent of any widget | "database", "data store" |
| **Widget** | Interactive program in a sandboxed iframe or trusted inline component | "app" (in code), "plugin" |
| **Sticker** | Visual asset (image/GIF/video) that can trigger logic but never contains logic | "icon" (in code context) |
| **Pipeline** | Visual DAG connecting widget outputs to widget inputs | "flow", "chain" |
| **Event Bus** | Typed pub/sub IPC layer; all cross-widget/cross-store communication | "message queue" |
| **Script** | Headless JS automation running on the event bus (no UI) | "macro" |
| **Docker** | Container widget that hosts child widgets. NOT Docker containers. | "container" (ambiguous) |

---

## Entity Types (10)

| Type | Description |
|------|-------------|
| `StickerEntity` | Visual asset placed on canvas |
| `TextEntity` | Text block |
| `WidgetContainerEntity` | Hosts a widget instance |
| `ShapeEntity` | Rectangle, ellipse, line |
| `DrawEntity` | Freehand pen stroke |
| `GroupEntity` | Grouped collection of entities |
| `DockerEntity` | Container hosting child widgets |
| `ImageEntity` | Static image |
| `VideoEntity` | Video player |
| `EmbedEntity` | External embed (URL) |

---

## DataSource

**Types (6):** `doc` | `table` | `note` | `folder` | `file` | `custom`

**Scopes (4):** `canvas` (visible on one canvas) | `user` (private to user) | `shared` (accessible to specific users) | `public` (open access)

**ACL Roles (4):** `owner` > `editor` > `commenter` > `viewer`
- ACL roles are INDEPENDENT of canvas roles — a canvas viewer can be a DataSource editor
- Scope controls visibility; ACL controls write permission

**Conflict Resolution by Type:**

| DataSource Type | Strategy |
|----------------|----------|
| Doc | Yjs CRDT (no keystrokes lost) |
| Table, Custom | Revision-based with 409 + LWW fallback |
| Note | Last-write-wins, silent |

---

## Zustand Stores (9)

| Store | Domain |
|-------|--------|
| `authStore` | Current user, session, auth status |
| `workspaceStore` | Workspace metadata, members, settings |
| `canvasStore` | Active canvas ID, metadata, sharing |
| `historyStore` | Undo/redo stack (event bus ring buffer) |
| `widgetStore` | Widget registry, instance list |
| `socialStore` | Presence map, cursor positions |
| `uiStore` | UI flags, modes, active tool |
| `dockerStore` | Docker container state, child widgets |
| `galleryStore` | Gallery/collection browsing |

Stores never read each other's state. Cross-store communication goes through the event bus.

---

## Canvas Interaction Modes

| Mode | Behavior | Who Sees It |
|------|----------|-------------|
| `edit` | Full entity manipulation, pipeline graph, config panels | Owner, Editor |
| `preview` | Widgets interactive, layout locked | Viewer, Commenter, slug URLs, embeds |

Stored in `uiStore.canvasInteractionMode`. Never persisted — derived from role + URL on load.

---

## Widget SDK API (`StickerNest.*`)

| Method | Purpose |
|--------|---------|
| `emit(type, payload)` | Emit event to bus |
| `subscribe(type, handler)` | Listen for bus events |
| `setState(key, value)` | Persist instance state (1MB limit) |
| `getState(key)` | Retrieve instance state |
| `setUserState(key, value)` | Cross-canvas user state (10MB limit) |
| `getUserState(key)` | Retrieve cross-canvas state |
| `getConfig()` | Get user-configured values |
| `register(manifest)` | Declare event contract (before `ready()`) |
| `ready()` | Signal init complete (must call within 500ms) |
| `onThemeChange(handler)` | Receive theme tokens |
| `onResize(handler)` | Receive viewport dimensions |
| `integration(name).query(params)` | Proxied external data read |
| `integration(name).mutate(params)` | Proxied external data write |
| `emitCrossCanvas(channel, payload)` | Cross-canvas event emission |
| `subscribeCrossCanvas(channel, handler)` | Cross-canvas subscription |
| `unsubscribeCrossCanvas(channel)` | Cross-canvas unsubscribe |

---

## SaaS Tiers

| Tier | Key Unlocks |
|------|-------------|
| **Free** | Basic canvas, built-in widgets, view shared canvases |
| **Creator** | Widget Lab, publish to Marketplace, custom themes |
| **Pro** | Advanced pipelines, integrations, priority support |
| **Enterprise** | Team workspaces, admin controls, SSO, SLA |

---

## Architecture Layers

```
L0 Kernel → L1 Social → L3 Runtime → L2 Lab → L4A/4B Canvas/Spatial → L5 Marketplace → L6 Shell
```

| Layer | Path | Commit Scope |
|-------|------|-------------|
| L0 Kernel | `src/kernel/**` | `kernel` |
| L1 Social | `src/social/**` | `social` |
| L2 Lab | `src/lab/**` | `lab` |
| L3 Runtime | `src/runtime/**` | `runtime` |
| L4A-1 Canvas Core | `src/canvas/core/**` | `canvas-core` |
| L4A-2 Canvas Tools | `src/canvas/tools/**` | `canvas-tools` |
| L4A-3 Canvas Wiring | `src/canvas/wiring/**` | `canvas-wiring` |
| L4A-4 Canvas Panels | `src/canvas/panels/**` | `canvas-panels` |
| L4B Spatial | `src/spatial/**` | `spatial` |
| L5 Marketplace | `src/marketplace/**` | `marketplace` |
| L6 Shell | `src/shell/**` | `shell` |

**Import rule:** Only import from layers BELOW yours in build order. Cross-layer communication goes through the event bus.

**Type alias:** `@sn/types` → `src/kernel/schemas/index.ts`
