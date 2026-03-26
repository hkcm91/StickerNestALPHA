# StickerNest V5 — Documentation Audit Report
**Date:** 2026-03-23
**Auditor:** Claude (automated)
**Scope:** Notion docs vs. codebase (`src/`) vs. CLAUDE.md + `.claude/rules/` files

---

## Status Legend
- ✅ **Accurate** — docs match the code
- ⚠️ **Outdated** — docs describe something that has changed in code
- ❌ **Missing from docs** — exists in code but not documented in Notion
- 🔄 **Contradicts another doc** — two docs say different things

---

## 0. DeepWiki Snapshot

The DeepWiki link (`app.devin.ai/org/woahitskimber-gmail-com/wiki/hkcm91/StickerNest5.0`) requires authentication and could not be fetched automatically. Manual paste required to generate `deepwiki-v5-snapshot-2026-03-23.md`.

---

## 1. 🏗️ StickerNest V5 — Master Build Plan

### Conceptual Model (Layers A/B/C)
✅ **Accurate.** The three-layer conceptual model (Spatial / Data / Interaction) matches CLAUDE.md and all rule files.

### Build Order
✅ **Accurate.** The build order `L0 (Kernel) → L1 (Social) → L3 (Runtime) → L2 (Lab) → L4A/4B (Canvas/Spatial) → L5 (Marketplace) → L6 (Shell)` matches CLAUDE.md.

### Layer-to-Path Mapping
✅ **Accurate.** The Master Build Plan's table of layers to directory paths matches the actual directory structure in code. All layers exist: `src/kernel/`, `src/social/`, `src/runtime/`, `src/lab/`, `src/canvas/core|tools|wiring|panels/`, `src/spatial/`, `src/marketplace/`, `src/shell/`.

### Store Count
🔄 **Contradicts L0 Rule File and L0 Kernel Build Plan.**

| Source | Store count | Stores listed |
|--------|-------------|---------------|
| **Master Build Plan / CLAUDE.md** | **9** | auth, workspace, canvas, history, widget, social, ui, docker, gallery |
| **L0 Rule File (.claude/rules/L0-kernel.md)** | **7** | auth, workspace, canvas, history, widget, social, ui |
| **L0 Kernel Notion Build Plan** | **5** | auth, workspace, canvas, spatial, ui |
| **TS Interface Contracts Notion doc** | **6** | auth, workspace, canvas, widget, social, ui |
| **Actual code (src/kernel/stores/)** | **9** | auth, workspace, canvas, history, widget, social, ui, docker, gallery |

**Action needed:** The L0 rule file, L0 Kernel Build Plan, and TS Contracts doc all need updating to reflect the actual 9 stores. The L0 Kernel Build Plan's `spatial` store does not exist in the kernel — there is an xr-store in `src/spatial/session/` but that's Layer 4B, not L0.

---

## 2. 📚 StickerNest Terminology & Definitions

### Core Terms
✅ **Canvas** — used correctly everywhere in code. No instances of "board", "scene", or "stage" as synonyms.

✅ **Entity** — used correctly. All canvas objects extend CanvasEntity types.

✅ **DataSource** — used correctly. Types: `doc | table | note | folder | file | custom` match code.

✅ **Widget** — used correctly. Sandboxed iframe execution model matches.

✅ **Sticker** — used correctly. StickerEntity has no embedded logic, purely visual.

✅ **Pipeline** — used correctly in `src/canvas/wiring/` layer.

✅ **Event Bus** — used correctly. Typed pub/sub in `src/kernel/bus/`.

✅ **Script** — referenced in types but no dedicated `src/scripts/` directory exists yet. (Planned, not built — acceptable.)

✅ **Docker** — "container widget that hosts child widgets" matches dockerStore and DockerEntity in code.

### Term Issues
⚠️ **"Connection" vs "Pipeline":** The L0 Kernel Build Plan extensively describes a "Connection Registry", "Connection Transform Pipeline", and "Data Provider/Consumer Protocol" (`data:register`, `data:query`, `data:response` events). **None of this naming exists in the codebase.** The equivalent concept became the **Pipeline** and **Wiring** system (`src/canvas/wiring/`). The Terminology doc correctly uses "Pipeline" but the L0 Kernel Build Plan still uses the old "Connection" terminology throughout.

---

## 3. 📐 StickerNest V5 — TypeScript Interface Contracts

This is the most drift-heavy document. The Notion doc was an early spec; the code has significantly evolved.

### Primitives
✅ **Vector3, Vector2, Quaternion** — match. Code exports Vector3Schema, QuaternionSchema, Point2DSchema.

⚠️ **Transform2D** — Notion doc defines `{ x, y, width, height, rotation, scaleX, scaleY, zIndex }`. Code has Transform2DSchema but field list may differ. The `rotation` is in degrees per doc. Verify.

✅ **Transform3D** — matches.

✅ **SpatialContext** — matches: `{ position: Vector3, rotation: Quaternion, normal: Vector3 }`.

### BusEvent
⚠️ **Outdated — VERIFIED against source code.** The Notion doc defines BusEvent with fields:
```
type, scope (BusEventScope), payload, sourceId, timestamp, canvasId, tenantId?, spatial?
```
**Actual code** (`src/kernel/schemas/bus-event.ts`):
```typescript
BusEventSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown(),
  spatial: SpatialContextSchema.optional(),
  timestamp: z.number().optional(),
})
```
**The Notion doc's `scope`, `sourceId`, `canvasId`, and `tenantId` fields DO NOT EXIST in the code.** The actual BusEvent is much simpler — just `type`, `payload`, optional `spatial`, and optional `timestamp`. The Notion TS Contracts doc must be updated to match.

❌ **SaaS lifecycle events** (`SaaSUserJoinedPayload`, `SaaSSubscriptionActivatedPayload`, `SaaSPaymentCompletedPayload`) in the Notion doc — likely aspirational/unbuilt. Not flagged as a problem since the Master Build Plan is aspirational.

### Entity Types
⚠️ **Outdated.** The Notion doc lists 9 entity types:
```
text, image, vector, shape, audio, video, object3d, sticker, widgetContainer
```
Actual code exports **15+ entity types**:
```
text, sticker, lottie, widgetContainer, shape, drawing, group, docker,
audio, svg, object3d, artboard, folder, path + CanvasEntityBase
```

**Missing from Notion doc (exist in code):**

| Entity | Status |
|--------|--------|
| `LottieEntity` | ❌ Missing from docs |
| `DrawingEntity` | ❌ Missing from docs |
| `GroupEntity` | ❌ Missing from docs |
| `DockerEntity` | ❌ Missing from docs |
| `SvgEntity` | ❌ Missing from docs |
| `PathEntity` | ❌ Missing from docs |
| `ArtboardEntity` | ❌ Missing from docs |
| `FolderEntity` | ❌ Missing from docs |

**In Notion doc but naming differs in code:**
- Notion: `ImageEntity` → Code: No standalone ImageEntity schema exported; images may use sticker or asset references.
- Notion: `VectorEntity` → Code: `SvgEntity` + `PathEntity` (split into two types).
- Notion: `VideoEntity` → Code: Not visible as a standalone schema export (may be merged or unbuilt).

### DataSource Types
✅ **Accurate.** Types `doc | table | note | folder | file | custom` match. Scopes `canvas | user | shared | public` match. ACL roles `owner | editor | commenter | viewer` match.

⚠️ **Concrete subtypes:** The Notion doc defines `TableDataSource`, `DocDataSource`, `NoteDataSource`, `CustomDataSource`, `FileDataSource`, `FolderDataSource` as separate interfaces. Code may implement these differently — the schema exports a single `DataSourceSchema` with type discriminator, plus separate `database-management.ts` for table operations. The "concrete subtype" interfaces from Notion are likely not 1:1 in code.

### Widget Manifest
⚠️ **Outdated.** Notion doc's `WidgetManifest` has fields the code may not:

| Field in Notion doc | In code? |
|---------------------|----------|
| `supportsChildren` | ✅ |
| `capabilities: WidgetCapability[]` | ⚠️ **VERIFIED:** Code uses `permissions: WidgetPermission[]` with values: `storage, user-state, integrations, clipboard, notifications, media, geolocation, cross-canvas, ai, checkout, auth`. Notion doc lists: `network, storage, entities, integrations, crossCanvas` — significantly different set. |
| `crossCanvasChannels` | Likely ✅ (cross-canvas exists in code) |
| `locale` | Unclear |
| `eventContract` | ✅ (exported as `WidgetEventContractSchema`) |
| `configSchema` | ✅ (exported as `WidgetConfigSchema`) |
| `themeContract` | Unclear if in code manifest |

❌ **SharedState system.** The Notion doc defines an elaborate `WidgetSharedStateConfig`, `SharedStateEntry`, bridge messages (`SHARED_STATE_SET`, `SHARED_STATE_INIT`, etc.). This doesn't appear to have a dedicated module in the codebase directory structure. May be partially implemented inside bridge/ or unbuilt.

### Canvas Interface
⚠️ **Outdated.** Notion doc defines a `Canvas` interface with `viewMode: 'scene' | 'desktop' | 'board' | 'grid'`, `slug`, `globalSlug`, `status`, `monetization`. Code has `CanvasDocumentSchema` in `canvas-document.ts` with `LayoutModeSchema`, `CanvasPlatformSchema`, etc. The naming and shape have diverged.

### Store Shapes
⚠️ **Significantly outdated.** See the store count contradiction above. Additionally:

- Notion `CanvasStore` bundles entities, selection, history, undo/redo. Code separates these into `canvasStore` (metadata) and `historyStore` (undo/redo).
- Notion `UIStore.mode` uses `'scene' | 'desktop' | 'board' | 'grid'`. Code's CLAUDE.md says `canvasInteractionMode: 'edit' | 'preview'`. The view mode concept moved to `CanvasDocument.layoutMode`.
- Notion lists no `dockerStore` or `galleryStore`.
- Notion `SocialStore` includes `chatMessages` and `annotations`. These may not be in the actual socialStore.

### Widget SDK Interface
⚠️ **Partially outdated.** Notion doc's `WidgetSDK` interface is mostly correct but:
- `dataSource.subscribe()` — may or may not be implemented.
- `children` API — may or may not be implemented.
- Missing from Notion doc: `emitCrossCanvas`, `subscribeCrossCanvas`, `unsubscribeCrossCanvas` — these ARE in the L3 rule file but not in the Notion SDK interface.

Wait — actually the Notion doc does list `emitCrossCanvas` and `subscribeCrossCanvas` in the SDK. ✅ Accurate there.

### Supabase Table List
⚠️ **Outdated.** Notion doc lists 16 tables. Code may have more (e.g., tables for docker, gallery, billing, social-graph, API keys).

---

## 4. StickerNest V5 — Layer 0: Kernel — Complete Build Plan

### Directory Path
⚠️ **Outdated.** Notion doc says kernel lives in **`src/core/`**. Actual code uses **`src/kernel/`**. Every path reference in this document is wrong.

| Notion doc path | Actual code path |
|-----------------|------------------|
| `src/core/types/` | `src/kernel/schemas/` |
| `src/core/events/` | `src/kernel/bus/` |
| `src/core/connections/` | `src/canvas/wiring/` (moved to Layer 4A-3) |
| `src/core/store/` | `src/kernel/stores/` |
| `src/core/supabase/` | `src/kernel/supabase/` |
| `src/core/config/` | Does not exist as separate dir |

### Store Architecture
⚠️ **Outdated.** Notion doc lists 5 stores: `auth.ts, workspace.ts, canvas.ts, spatial.ts, ui.ts`. Code has 9 stores (see store count table above). Notably:
- No `spatial` store in the kernel. The spatial session store lives in `src/spatial/session/xr-store.ts` (Layer 4B).
- Missing from Notion: `historyStore`, `widgetStore`, `socialStore`, `dockerStore`, `galleryStore`.

### Connections System
⚠️ **Outdated — concept renamed.** The Notion doc describes:
- `ConnectionRegistry` with widget contract registration
- `Transform Pipeline` with AI-generated transforms
- `Data Provider/Consumer Protocol` (`data:register`, `data:query`, `data:response`)

**None of this exists in `src/kernel/` in the code.** The equivalent functionality lives in `src/canvas/wiring/` (Layer 4A-3) as the Pipeline system. The "connection" terminology was replaced by "pipeline" and "wiring."

### Event Bus Submodules
⚠️ **Partially outdated.**
- Notion: `bus.ts, types.ts, middleware.ts, history.ts` in `src/core/events/`
- Code: `bus.ts, types.ts, ring-buffer.ts` in `src/kernel/bus/`
- `middleware.ts` does not exist. `ring-buffer.ts` replaces `history.ts`.
- `events/` → `bus/` (directory renamed).

### Coverage Thresholds
🔄 **Contradicts CLAUDE.md.**
- Notion L0 doc: **90%** overall kernel coverage
- CLAUDE.md: **80%** threshold (branches, functions, lines, statements)

### MCP Tools
⚠️ **Outdated.** Notion describes `sn_get_layer`, `sn_get_decision`, `sn_get_glossary`, `sn_project_status`. The MCP dev server exists at `mcp-dev/` in the codebase but actual tool implementations may differ.

### Skills & Agents
⚠️ **Aspirational.** Notion lists skills (event-bus, zustand-store, layer-rules, testing, widget-contract, ralph-workflow) and agents (architect, event-bus-debugger, test-writer, code-reviewer). These are development process documentation, not code architecture. The `.claude/rules/` files serve a similar function now.

### Kernel Submodules Not in Notion
❌ **Missing from Notion doc (exist in code):**

| Module | Path | Purpose |
|--------|------|---------|
| `billing` | `src/kernel/billing/` | Billing API, tier management, Stripe/PayPal |
| `quota` | `src/kernel/quota/` | Per-tier quota enforcement, `useQuotaCheck` hook |
| `api-keys` | `src/kernel/api-keys/` | API key management (BYOK) |
| `social-graph` | `src/kernel/social-graph/` | Profiles, follows, blocks, messages, posts, reactions |
| `world` | `src/kernel/world/` | World manager, tick loop, entity systems runtime |
| `systems` | `src/kernel/systems/` | Animation system, physics system |
| `datasource/ai-service` | `src/kernel/datasource/ai-service.ts` | AI-powered datasource operations |
| `datasource/notion-sync` | `src/kernel/datasource/notion-sync.ts` | Notion integration sync |
| `datasource/templates` | `src/kernel/datasource/templates.ts` | Datasource templates |
| `datasource/table-ops` | `src/kernel/datasource/table-ops.ts` | Table CRUD operations |

### Schemas Not in Notion
❌ **Missing from all Notion docs (exist in code):**

| Schema file | Purpose |
|-------------|---------|
| `grid.ts` | Grid layer: cell fills, snap modes, projection modes |
| `canvas-document.ts` | Canvas document: backgrounds, viewport config, layout modes |
| `database-management.ts` | Table columns, rows, filters, sorts, views, AI operations, templates |
| `docker.ts` | Docker containers: widget slots, tabs, dock modes |
| `gallery.ts` | Gallery assets |
| `api-key.ts` | API key management schemas |
| `widget-design-spec.ts` | Widget design spec: colors, typography, spacing, borders |
| `theme.ts` | Theme tokens: core, extended, full theme token sets |
| `path.ts` | Anchor points, fill rules for vector paths |
| `notion-integration.ts` | Notion API integration types |
| `social-graph.ts` | Social features: profiles, follows, posts, reactions, feeds |
| `world.ts` | World instances: mode, status, snapshots |
| `events/` (directory) | Event type constants organized by namespace |

---

## 5. StickerNest V5 — Layer 1: Runtime — Complete Build Plan

### Critical: Layer Numbering Mismatch
⚠️ **Outdated and confusing.** This Notion document is titled **"Layer 1: Runtime"** but in the actual codebase architecture:
- **Layer 1 = Social** (`src/social/`) — real-time collaboration
- **Layer 3 = Runtime** (`src/runtime/`) — widget execution engine

The CLAUDE.md, Master Build Plan, and all `.claude/rules/` files consistently use L1=Social, L3=Runtime. This Notion doc's layer numbering predates the final architecture and needs to be corrected to **"Layer 3: Runtime"**.

### Directory Structure
⚠️ **Outdated.** Notion doc describes:
```
src/runtime/
├── iframe/          # WidgetFrame, bridge, message-queue, etc.
├── sdk/
├── lifecycle/
├── inline/
├── native3d/
├── registry/
├── security/
├── pool/
```

Actual code structure:
```
src/runtime/
├── bridge/          # (replaces iframe/ — bridge protocol)
├── sdk/             # ✅ matches
├── lifecycle/       # ✅ matches
├── cross-canvas/    # ❌ not in Notion doc
├── integrations/    # ❌ not in Notion doc
├── pool/            # ✅ matches
├── security/        # ✅ matches
├── widgets/         # built-in widgets (different set than doc lists)
```

Missing from code (documented in Notion): `inline/`, `native3d/`, `registry/`.
Missing from Notion (exists in code): `cross-canvas/`, `integrations/`.

No `iframe/` subdirectory exists — the bridge protocol lives directly in `bridge/`.

### SDK API Methods
⚠️ **Outdated.** Notion doc uses `on()/off()` pattern:
```javascript
StickerNest.on(eventType, callback)
StickerNest.off(eventType, callback)
```
Code (L3 rule file + TS Contracts) uses `subscribe()` pattern returning unsubscribe function:
```javascript
StickerNest.subscribe(type, handler) // returns () => void
```
This is a naming change, not just a cosmetic difference — it affects the API contract.

### Widget Lifecycle States
🔄 **Contradicts L3 rule file.**
- Notion doc: 7 states — `UNLOADED → LOADING → INITIALIZING → READY → RUNNING → DESTROYING → DEAD`
- L3 rule file: 5 states — `load → init → READY → run → unmount`

### READY Timeout
🔄 **Contradicts L3 rule file and L2 rule file.**
- Notion doc: **5 seconds**
- L3 rule file: **500ms**
- L2 rule file (publish pipeline): **500ms**

### Three Execution Modes
⚠️ **Partially outdated.** Notion doc describes three modes (Sandboxed, Inline, Native 3D) with components `WidgetFrame`, `InlineWidgetFrame`, `Widget3DContainer`. Code only has `WidgetFrame` visible. The `inline/` and `native3d/` directories don't exist.

### Widget Manifest Fields
⚠️ **Outdated.** Notion doc's manifest includes `executionMode`, `protocolVersion`, `codeSize`, `assetSize`. The code's `WidgetManifestSchema` has a different field set (see `widget-manifest.ts`).

### Built-in Widgets
⚠️ **Outdated — VERIFIED against source code.**
- L3 rule file (`.claude/rules/L3-runtime.md`) lists: Sticky Note, Clock/Timer, Counter, Image viewer, Markdown note
- Notion Runtime doc lists a similar set
- **Actual code** (`src/runtime/widgets/`): `image-generator/`, `kanban/`, `pathfinder/`, `stories/`, `todo-list/`, plus `built-in-components.ts` and `built-in-html.ts`

**Zero overlap** between what any doc says and what the code actually has. Both the L3 rule file and the Notion doc need updating to reflect the real built-in widget set.

### Coverage Thresholds
🔄 **Contradicts CLAUDE.md.**
- Notion L1 doc: **85%** runtime, with per-module thresholds up to **95%**
- CLAUDE.md: **80%** threshold across the board

### Security Details
✅ **Mostly accurate.** The core security principles match: `srcdoc` only, no `allow-same-origin`, CSP blocks `connect-src`, rate limiting at 100 events/sec, 1MB state limit. These are consistent across all docs and rule files.

---

## 6. Canvas Tools — Undocumented in Notion

The Notion docs don't have a dedicated Canvas Tools build plan. The L4A-2 rule file lists tools: `select, move, resize, pen, text, rect, ellipse, line, sticker, widget`.

❌ **Actual code has additional tools not in any doc:**

| Tool | Path | In any doc? |
|------|------|-------------|
| `direct-select` | `src/canvas/tools/direct-select/` | ❌ No |
| `ghost-widget` | `src/canvas/tools/ghost-widget/` | ❌ No |
| `grid-paint` | `src/canvas/tools/grid-paint/` | ❌ No |
| `pen-path` | `src/canvas/tools/pen-path/` | ❌ No |
| `pathfinder-tool` | `src/canvas/tools/pathfinder-tool/` | ❌ No |

---

## 7. Spatial Layer — Undocumented Modules

The L4B rule file covers the basics but the code has significantly more:

❌ **In code but not in any doc:**

| Module | Path | Purpose |
|--------|------|---------|
| `mr/` (mixed reality) | `src/spatial/mr/` | Anchors, HitTest, MeshDetection, PlaneDetection, RATKProvider |
| `locomotion/` | `src/spatial/locomotion/` | TeleportProvider |
| `entity-mapping/` | `src/spatial/entity-mapping/` | 2D↔3D entity mapper |
| `input/` (detailed) | `src/spatial/input/` | ControllerBridge, HandBridge, Pointer |
| `legacy/` | `src/spatial/legacy/` | Imperative adapter for V4 compat |

---

## 8. Cross-Document Contradictions Summary

| Topic | Doc A says | Doc B says | Code says |
|-------|-----------|-----------|-----------|
| **Store count** | L0 Kernel Notion: 5 | L0 Rule file: 7 | **9** |
| **Kernel path** | L0 Kernel Notion: `src/core/` | CLAUDE.md: `src/kernel/` | **`src/kernel/`** |
| **Layer 1 identity** | L1 Notion: Runtime | CLAUDE.md: Social | **Social (`src/social/`)** |
| **Layer 3 identity** | (not labeled in Notion) | CLAUDE.md: Runtime | **Runtime (`src/runtime/`)** |
| **SDK subscribe method** | L1 Notion: `.on()/.off()` | L3 Rule file: `.subscribe()` | **`.subscribe()`** |
| **READY timeout** | L1 Notion: 5 seconds | L3 Rule file: 500ms | **500ms** |
| **Lifecycle states** | L1 Notion: 7 states (UNLOADED→…→DEAD) | L3 Rule file: 5 states (load→…→unmount) | **5 states per rule file** |
| **Coverage threshold** | L0/L1 Notion: 90%/85% | CLAUDE.md: 80% | **80% (vitest config)** |
| **Connections vs Pipelines** | L0 Notion: "Connections" | Terminology: "Pipeline" | **Pipeline/Wiring** |
| **Built-in widgets** | L3 Rule file: Sticky Note, Clock, Counter, Image, Markdown | Notion Runtime: similar | **image-generator, kanban, pathfinder, stories, todo-list** |
| **Widget permissions** | Notion TS Contracts: `network, storage, entities, integrations, crossCanvas` | L3 Rule file: `permissions` array | **`storage, user-state, integrations, clipboard, notifications, media, geolocation, cross-canvas, ai, checkout, auth`** |
| **BusEvent fields** | Notion TS Contracts: type, scope, payload, sourceId, timestamp, canvasId, tenantId?, spatial? | L0 Rule file: type, payload, spatial? | **type, payload, spatial?, timestamp?** (no scope/sourceId/canvasId/tenantId) |

---

## 9. Priority Recommendations

### Must Fix (naming/architecture is WRONG in docs)

1. **L0 Kernel Notion:** Change all paths from `src/core/` to `src/kernel/`. Update store list from 5 to 9. Remove or relocate "Connections" content — that's now Pipeline/Wiring in L4A-3.

2. **L1 Runtime Notion:** Rename to "Layer 3: Runtime". Update SDK from `.on()/.off()` to `.subscribe()`. Change READY timeout from 5s to 500ms. Update lifecycle to 5 states. Update directory structure. Remove `inline/` and `native3d/` references or mark as unbuilt.

3. **TS Interface Contracts:** Add the 8 missing entity types (Lottie, Drawing, Group, Docker, Svg, Path, Artboard, Folder). Update store shapes to reflect the actual 9 stores. Reconcile BusEvent shape with actual code. Update Canvas interface naming (Canvas → CanvasDocument).

4. **L0 Rule File (.claude/rules/L0-kernel.md):** Update store count from 7 to 9 (add dockerStore, galleryStore).

### Should Fix (docs are incomplete but not wrong)

5. **TS Interface Contracts:** Add schemas for grid, canvas-document, database-management, docker, gallery, api-key, widget-design-spec, theme, social-graph, world, notion-integration, path.

6. **All Notion docs:** Document the billing, quota, api-keys, social-graph, world, and systems kernel submodules.

7. **Terminology doc:** Add entries for Docker, Gallery, Grid, Artboard, Path, Lottie, Drawing, Group, CanvasDocument, LayoutMode.

### Nice to Have

8. Add Notion build plans for Layers 2-6 (Lab, Canvas Core, Canvas Tools, Canvas Wiring, Canvas Panels, Spatial, Marketplace, Shell).

9. Create a "Layer 1: Social" Notion build plan (currently no Notion doc for the Social layer).

---

*Audit complete. Awaiting review before any Notion updates are made.*
