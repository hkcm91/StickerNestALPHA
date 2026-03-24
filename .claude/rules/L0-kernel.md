# Layer 0 — Kernel Rules
# Applies to: `src/kernel/**`

## Identity and Responsibility

Layer 0 is the foundation of StickerNest V5. It is the only layer that has zero
dependencies on other application layers. Everything else in the system — social,
runtime, canvas, marketplace, shell — depends on what is defined here. Build it
as if it will never be rewritten: stable contracts, no shortcuts, no leaking
of higher-layer concerns downward.

Kernel owns:
- Shared Zod schemas and TypeScript types
- The typed event bus (pub/sub IPC)
- All seven Zustand stores
- Supabase client initialization
- Auth logic (email/password + OAuth)
- DataSource CRUD API and ACL model

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from external npm packages (zod, zustand, @supabase/supabase-js, etc.)
- You MAY import from other files within `src/kernel/**`
- You MUST NOT import from `src/social/**`, `src/runtime/**`, `src/lab/**`,
  `src/canvas/**`, `src/spatial/**`, `src/marketplace/**`, or `src/shell/**`
- The package alias `@sn/types` MUST resolve to `src/kernel/schemas/index.ts`
  — do not change this alias target without a full-project audit

Violation of the import boundary collapses the dependency graph and will require
a layer rebuild. Treat any cross-layer import from kernel as a blocking bug.

---

## Schema Requirements (`src/kernel/schemas/`)

All schemas are defined with Zod and re-exported from `src/kernel/schemas/index.ts`.

Required schemas — implement all of these exactly:

**BusEvent base schema**
```
{ type: string, payload: unknown, spatial?: SpatialContext }
```
- `spatial` is always optional
- `spatial` is always `undefined` for non-VR events — never default it to anything

**SpatialContext**
```
{ position: Vector3, rotation: Quaternion, normal: Vector3 }
```

**WidgetManifest** — captures widget identity, version, permissions, and entry point

**DataSource**
```
{ id, type, ownerId, scope, canvasId?, schema?, metadata, createdAt, updatedAt }
```
- `type` enum: `doc | table | note | folder | file | custom`
- `scope` enum: `canvas | user | shared | public`

**DataSource ACL** — roles: `owner | editor | commenter | viewer`
- ACL roles are INDEPENDENT of canvas roles — never conflate them
- A user may be a canvas viewer but a DataSource editor — both must be respected separately

**CanvasEntity base schema** — base type all canvas entities extend

Export JSON schemas from all Zod schemas via `z.toJSONSchema()` for use by
plugin manifests. These JSON schema exports must stay synchronized with the
Zod definitions — do not maintain them separately.

---

## Event Bus (`src/kernel/bus/`)

- Implement typed pub/sub: subscribe by event type, emit with typed payload
- Emit-to-handler latency target: **< 1ms** — this is a hard performance contract
- Implement a ring buffer to support the `history` command (replay last N events)
- Bus is the ONLY channel for cross-store communication — stores never read
  each other's state directly
- Expose a `bench()` API for throughput benchmarks; tests will call this to
  verify the < 1ms contract
- Bus event types use dot-namespaced strings (e.g., `widget.mounted`,
  `social.cursor.moved`) — Layer 1 owns the `social.*` namespace

---

## Zustand Stores (`src/kernel/stores/`)

Nine stores, one domain each:

1. `authStore` — current user, session, auth status
2. `workspaceStore` — workspace metadata, member list, workspace settings
3. `canvasStore` — active canvas id, canvas metadata, sharing settings
4. `historyStore` — undo/redo stack, powered by event bus ring buffer
5. `widgetStore` — widget registry, widget instance list
6. `socialStore` — presence map, cursor positions (written by Layer 1 via bus events)
7. `uiStore` — UI-level flags and modes
8. `dockerStore` — Docker container widget state and child widget management
9. `galleryStore` — gallery/collection browsing and display state

`uiStore` MUST include:
```ts
canvasInteractionMode: 'edit' | 'preview'
```

Store rules:
- Stores do NOT import from each other
- Cross-store coordination happens exclusively via the event bus
- Each store is a standalone Zustand slice — no shared state object
- Store actions that need data from another store must emit a bus event and
  let the target store's subscriber handle the update

---

## Supabase Setup (`src/kernel/supabase/`)

- Single Supabase client instance — do not instantiate multiple clients
- Client is created here and imported by higher layers (never re-created)
- Required Supabase tables (schema must match exactly):
  `users`, `canvases`, `entities`, `widgets`, `stickers`, `pipelines`,
  `widget_connections`, `presence`, `data_sources`, `data_source_acl`,
  `widget_instances`, `user_installed_widgets`, `user_widget_state`
- Do not add new tables without updating this list and the DataSource schema

---

## Auth (`src/kernel/auth/`)

- Supports email/password and OAuth providers
- Auth state is owned exclusively by `authStore`
- Auth logic must not reach into any other store directly — emit events
- Session refresh and token expiry must be handled here, not in higher layers

---

## DataSource API (`src/kernel/datasource/`)

- CRUD operations: create, read, update, delete, list
- ACL enforcement is applied at the API boundary — every write operation must
  check the caller's ACL role before proceeding
- `viewer` role: read-only — must not write under any code path
- `commenter` role: can annotate but cannot mutate the source data
- `editor` role: full read/write on source data
- `owner` role: full control including ACL management and deletion
- Scope (`canvas | user | shared | public`) controls visibility, not
  write permission — ACL role controls write permission

---

## Testing Requirements

The following tests MUST be written and must pass before Layer 0 is marked complete:

1. **Bus throughput benchmark** — call `bench()`, assert emit-to-handler < 1ms
2. **Shared DataSource reactivity** — two widget instances referencing the same
   DataSource both update when the source changes; no stale reads
3. **ACL enforcement** — a `viewer`-role caller to the DataSource API receives
   a permission error on any write attempt; no write reaches the database
4. **Store isolation** — confirm stores do not import from each other (static
   import analysis, not just runtime testing)

---

## What You Must Not Do

- Do not import from any layer above Layer 0
- Do not add runtime logic that belongs in Layer 1 or higher (no Realtime
  channels, no cursor logic, no widget rendering)
- Do not merge DataSource ACL roles with canvas roles anywhere in this layer
- Do not make `spatial` on BusEvent required — it breaks non-VR event contracts
- Do not create multiple Supabase client instances
- Do not allow stores to subscribe to each other's state directly
- Do not skip the `bench()` implementation — performance contracts must be testable
- Do not export schemas that are not also registered in `src/kernel/schemas/index.ts`
