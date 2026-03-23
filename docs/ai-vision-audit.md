# StickerNest V5 — AI Vision Audit

**Date**: 2026-03-23
**Scope**: Full codebase survey + gap analysis for AI-as-canvas-participant vision

---

## Phase 1: Codebase Survey

### 1. Project Structure Overview

**784 TypeScript files, ~9.5MB** organized into 7 strictly-layered architectural tiers:

| Layer | Path | Files | Size | Purpose |
|---|---|---|---|---|
| L0: Kernel | `src/kernel/` | 126 | 1.3M | Schemas, bus, stores, auth, datasource, billing, quota |
| L1: Social | `src/social/` | 27 | 204K | Realtime collaboration, presence, cursors, conflict resolution |
| L2: Lab | `src/lab/` | 133 | 1.1M | Widget IDE (Monaco, preview, AI gen, publish pipeline) |
| L3: Runtime | `src/runtime/` | 70 | 948K | Widget sandbox (iframe, bridge, SDK, built-in widgets) |
| L4A: Canvas | `src/canvas/` | 165 | 1.3M | 2D canvas (core, tools, wiring/pipelines, panels) |
| L4B: Spatial | `src/spatial/` | 56 | 392K | 3D/VR (Three.js, WebXR, controllers) |
| L5: Marketplace | `src/marketplace/` | 27 | 148K | Widget discovery, install, ratings |
| L6: Shell | `src/shell/` | 178 | 2.1M | Router, layout, theme, auth gating, settings UI |

Import rules strictly enforced via ESLint `eslint-plugin-boundaries` + `dependency-cruiser`.

---

### 2. Zustand Store Audit

**9 stores total** — 7 kernel + docker + gallery (all L0), plus 1 interaction store (L4A-1).

| Store | File | State Summary | Serializable | Cross-Store Deps |
|---|---|---|---|---|
| Auth | `src/kernel/stores/auth/auth.store.ts` | user, session, isLoading, error, isInitialized | YES | None |
| Workspace | `src/kernel/stores/workspace/workspace.store.ts` | activeWorkspace, members, settings | YES | None |
| Canvas | `src/kernel/stores/canvas/canvas.store.ts` | activeCanvasId, canvasMeta, sharingSettings, userRole | CONDITIONAL | None |
| History | `src/kernel/stores/history/history.store.ts` | undoStack, redoStack (HistoryEntry[]), maxSize: 100 | CONDITIONAL | None |
| Widget | `src/kernel/stores/widget/widget.store.ts` | registry (WidgetRegistryEntry), instances (WidgetInstance) | CONDITIONAL | None |
| Social | `src/kernel/stores/social/social.store.ts` | presenceMap (userId → PresenceUser) | YES | None |
| UI | `src/kernel/stores/ui/ui.store.ts` | canvasInteractionMode, activeTool, theme, spatialMode, toasts, panels, sidebars | MOSTLY | None |
| Docker | `src/kernel/stores/docker/docker.store.ts` | dockers, activeDockerOrder | YES | None |
| Gallery | `src/kernel/stores/gallery/gallery.store.ts` | assets (GalleryAsset[]) | YES | **VIOLATION**: imports useAuthStore |
| Interaction | `src/canvas/core/interaction/interaction-store.ts` | mode: 'edit'\|'play', toolsEnabled, widgetsInteractive | YES | None (bus-coordinated) |

**Architecture violation**: Gallery store imports `useAuthStore` directly (line 12) instead of using bus events. Not covered by `store-isolation.test.ts`.

All stores use `devtools` + `subscribeWithSelector` middleware. Each exports a `setup*BusSubscriptions()` function called from `setupAllStoreBusSubscriptions()` in `src/kernel/stores/index.ts`.

---

### 3. Sticker/Widget System

#### Entity Types (14 total)
`src/kernel/schemas/canvas-entity.ts` — discriminated union:
`sticker`, `text`, `widget`, `shape`, `drawing`, `group`, `docker`, `lottie`, `audio`, `svg`, `path`, `object3d`, `artboard`, `folder`

#### StickerEntity Data Model (lines 218-234)
- `assetUrl: string` (proxied, never direct bucket)
- `assetType: "image" | "gif" | "video"`
- `altText?: string`, `aspectLocked: boolean`
- `clickAction?: StickerClickAction`:
  - `"none"` — decorative
  - `"open-url"` — opens URL
  - `"launch-widget"` — spawns widget with config
  - `"emit-event"` — emits custom bus event with type + JSON payload
- `hoverEffect: "none" | "scale" | "glow" | "opacity"`

#### Sticker Creation
`src/canvas/tools/sticker/sticker-tool.ts:13-44` — emits `bus.emit(CanvasEvents.ENTITY_CREATED, {...})` on pointer down in edit mode.

#### Inter-Sticker Communication
- **Click actions** emit custom events → pipeline edges route to target widgets
- **Pipeline wiring** (`src/canvas/wiring/`): DAG-based event routing
- **Cross-canvas**: `StickerNest.emitCrossCanvas(channel, payload)` via SDK

#### Lifecycle Hooks
**None explicit.** Widgets observe bus events reactively: `canvas.entity.created`, `canvas.entity.moved`, etc. Widget lifecycle state machine: `UNLOADED → LOADING → INITIALIZING → READY → RUNNING → DESTROYING → DEAD` (`src/runtime/lifecycle/manager.ts`).

#### Proximity/Spatial Tracking
**Not implemented.** Scene graph has `queryRegion(bounds)` and `queryPoint(point)` for hit-testing, but no distance-based spatial relationships or "nearby entities" API.

---

### 4. Canvas System

#### Structure
Split into 4 sub-layers in `src/canvas/`:
- **Core**: Viewport, scene graph, hit-testing, render loop, drag, grid, layout modes, persistence, input adapters
- **Tools**: Select, move, resize, pen, text, shape, sticker/widget placement
- **Wiring**: Pipeline DAG editor, execution engine, validation, cross-canvas edges
- **Panels**: Toolbar, properties, layers, assets, pipeline inspector, context menu, minimap

#### Multiple Canvases
**YES** — `CanvasDocument` schema (`src/kernel/schemas/canvas-document.ts:210-235`) with UUID ids. Widget instances scoped to `canvasId`. World instances (`src/kernel/schemas/world.ts`) enable isolated canvas rooms. Routes: `/canvas/:canvasId`, `/canvas/:slug`.

#### Persistence
JSON via `CanvasDocument` Zod schema (versioned with migrations). `serialize()` at `src/canvas/core/persistence/serialize.ts:123` produces full document. `serializeToJSON()` at line 149 returns JSON string. Auto-saved via `usePersistence` hook in shell.

#### Canvas Events
Rich event system: entity CRUD, selection, pipeline, document, tool input, grid — ~100+ event types in `src/kernel/schemas/bus-event.ts`.

---

### 5. Existing AI/Chatbot Integration

| Feature | Layer | File | Status |
|---|---|---|---|
| AI Widget Generator | L2 | `src/lab/ai/ai-generator.ts` (464 lines) | Fully implemented |
| AI Full Context | L2 | `src/lab/ai/ai-full-context.ts` (167 lines) | Widget-dev context only |
| AI Data Assistant | L0+L6 | `src/kernel/datasource/ai-service.ts` (486 lines) | Fully implemented |
| Image Generator Widget | L3 | `src/runtime/widgets/image-generator/` (301 lines) | Fully implemented |
| AI Integration Handler | L3 | `src/runtime/integrations/ai-handler.ts` (85 lines) | Image generation only |
| Vite Dev AI Proxy | Config | `vite.config.ts` | Claude Sonnet 4 widget gen |

**AI Canvas Awareness**: NONE — no AI reads canvas state. Lab AI has `AIFullContext` but it's widget-development-focused.
**AI Canvas Actions**: NONE — no AI writes structured actions to canvas.
**AI as Subscriber**: NONE — no persistent AI participant on the event bus.

---

### 6. Existing Generation/API Integrations

- **Replicate**: Image Generator widget → `ai-handler.ts` → Supabase Edge Function `ai-generate`. Models: Flux Schnell/Dev, SDXL, SDXL Lightning.
- **BYOK Key Management**: `src/kernel/api-keys/api-keys.ts` (377 lines). Providers: Replicate, OpenAI, Anthropic, Custom. Server-side encryption.
- **Integration Proxy**: `src/runtime/integrations/integration-proxy.ts` (211 lines). Registered: `ai`, `social`, `notion`, `checkout`, `auth`. Timeout (15s), TTL cache (30s).
- **Notion**: Full schema at `src/kernel/schemas/notion-integration.ts` (22KB). OAuth-based.

---

### 7. Event/Messaging System

#### Event Bus (`src/kernel/bus/bus.ts`)
- Typed pub/sub: exact-match, wildcard (`social.*`), catch-all
- Ring buffer: last 1000 events, queryable via `getHistory()` and `getHistoryByType()`
- Performance: `bench()` API, target <1ms latency
- Priority-sorted handler dispatch

#### Cross-Canvas Router (`src/runtime/cross-canvas/cross-canvas-router.ts`)
Three transport layers (always parallel):
1. **Local** — same-page synchronous
2. **BroadcastChannel** — cross-tab, same origin
3. **Supabase Realtime** — cross-user/device

Security: sender identity injected by host, dedup (500 ID window), rate limit (100/sec), offline queue (max 100).

#### Widget Bridge (`src/runtime/bridge/bridge.ts`)
postMessage protocol. Origin validation, Zod validation, rate limiting. Message types: INIT, EMIT, EVENT, SET_STATE, GET_STATE, READY, DESTROY, CROSS_CANVAS_*.

---

### 8. Plugin/Extension Architecture

- **Widgets ARE the plugin system** — single-file HTML in sandboxed iframes
- **Widget Manifest** declares event contract, config schema, permissions
- **Dynamic creation** via Lab IDE or Marketplace import
- **Entity types are fixed** — 14 types in Zod union, not runtime-extensible
- **Integration handlers** registered in host code, not by widgets

---

## Phase 2: Gap Analysis

| # | Capability | Status | What Exists | What's Missing | Effort |
|---|---|---|---|---|---|
| 1 | Canvas state serialization (AI eyes) | **Close** | `serialize()` + `serializeToJSON()` at `src/canvas/core/persistence/serialize.ts:123-155`. `getAllEntities()` returns full data. | No AI-friendly compact format with spatial relationships. Raw `CanvasDocument` is verbose. | Close (1-2d) |
| 2 | Canvas action schema (AI hands) | **Far** | `CanvasEvents` constants exist with well-defined payloads. Image Generator emits `ENTITY_CREATED`. | No unified `AIAction` Zod schema for structured AI responses. No validation/parsing layer. | Medium |
| 3 | Action executor (apply AI actions) | **Close** | Canvas Core (`init.ts:39-65`) handles `ENTITY_CREATED`. History + persistence auto-subscribe. | No dispatcher that maps AI action objects → bus events. Only tools emit entity events today. | Close (1-2d) |
| 4 | Sticker-to-sticker communication | **Ready** | `clickAction.emit-event` + pipeline wiring + cross-canvas router + SDK emit/subscribe. | Already functional. | Ready |
| 5 | Generation as a sticker capability | **Close** | Image Generator widget calls Replicate via `integration('ai').query()` and emits `ENTITY_CREATED`. | Stickers can't invoke generation directly — must route through widget or pipeline. Need `'generate'` pipeline node. | Close |
| 6 | Replicate API integration | **Ready** | Full: `ai-handler.ts` → Edge Function → Replicate. BYOK keys. 4 models. | Works today. | Ready |
| 7 | Pipeline stickers (prompt→template→generator→output) | **Medium** | Full DAG system: 8 node types, visual editor, execution engine, cross-canvas edges. | No `'generate'`, `'prompt'`, or `'create-entity'` node types. Engine can't create entities or call APIs inline. | Medium (1wk) |
| 8 | Cross-canvas data flow | **Ready** | 3-layer transport, permissions, dedup, offline queue, rate limiting. | Fully operational. | Ready |
| 9 | Canvas event stream / subscription | **Close** | Ring buffer (1000 events), wildcard subscriptions, all entity events on bus. | No stream adapter for external consumers (AI agent, webhook). | Close (1-2d) |
| 10 | AI context injection (snapshot→prompt) | **Medium** | Lab has `AIFullContext` + `serializeFullContextForPrompt()`. Canvas has `serialize()`. | No canvas-state-focused prompt builder. Lab context is widget-dev only. | Medium |
| 11 | Sticker lifecycle hooks | **Close** | Bus events for all entity CRUD. Canvas Core + History + Persistence subscribe independently. | No formal hook API. No "before" hooks/interceptors. | Close (1-2d) |
| 12 | Spatial awareness (proximity tracking) | **Medium** | Scene graph has `queryRegion()`, `queryPoint()`, spatial index. Entities have canvas positions. | No distance queries, no relationship graph (near/above/left-of), no proximity events. | Medium |
| 13 | Dynamic sticker type creation | **Far** | 14 types in fixed Zod union. Widgets are the extensibility mechanism. | Can't add entity types at runtime. Likely not needed — widgets + sticker metadata suffice. | Far (not needed) |

---

## Phase 3: Recommended Build Order

**Target demo**: Prompt sticker triggers AI generation through a visible pipeline → output lands on canvas as new sticker.

### Step 1: Canvas AI Snapshot — `buildCanvasAIContext()`
- **Layer**: L0 or L4A-1
- **Effort**: 1-2 days
- **Blocks**: Steps 4, 6
- Transform existing `serialize()` output into compact, AI-friendly format
- Strip rendering fields, add spatial relationships, entity summaries
- Support viewport scoping for large canvases

### Step 2: AI Action Schema
- **Layer**: L0 (Kernel schemas)
- **Effort**: 1-2 days
- **Blocks**: Steps 3, 5
- Zod schema: `create_sticker`, `create_widget`, `move_entity`, `update_entity`, `delete_entity`, `trigger_generation`, `emit_event`
- Export from `@sn/types`

### Step 3: Action Executor
- **Layer**: L3 or L4A-1
- **Effort**: 1-2 days
- **Depends on**: Step 2
- Dispatch function: `executeAIActions(actions: AIAction[]) → void`
- Maps each action to corresponding bus event emission
- Existing downstream handlers (scene graph, history, persistence) need no changes

### Step 4: AI Context Injection — prompt builder
- **Layer**: L0 or L3
- **Effort**: 1-2 days
- **Depends on**: Step 1
- `buildAIPrompt(canvasContext, userPrompt, options) → string`
- Adapt pattern from `src/lab/ai/ai-full-context.ts`

### Step 5: New Pipeline Node Types
- **Layer**: L4A-3 + L0
- **Effort**: 3-5 days
- **Depends on**: Steps 2, 3
- New types: `'prompt'`, `'generate'`, `'create-entity'`
- Extend execution engine for async node execution

### Step 6: AI Canvas Agent Widget
- **Layer**: L3 (built-in widget)
- **Effort**: 3-5 days
- **Depends on**: Steps 1-4
- Snapshots canvas → builds prompt → calls AI API → parses actions → executes on canvas

### Dependency Graph
```
Step 1 (AI Snapshot) ──────────────┐
                                   ├──→ Step 4 (Prompt Builder) ──→ Step 6 (AI Agent Widget)
Step 2 (Action Schema) ──┬────────┤                                       ↑
                         │        │                                       │
                         ▼        │                                       │
                   Step 3 (Executor) ──→ Step 5 (Pipeline Nodes) ─────────┘
```

### Minimum Viable Demo (skip visual pipeline)
Steps 1+2 (parallel, 2d) → Steps 3+4 (parallel, 2d) → Step 6 (3d) = **~5-6 days**

---

## Phase 4: Risks and Unknowns

### Architectural Conflicts

**1. Widgets Cannot Create Entities Through the SDK** — RISK: HIGH
- Bridge protocol (`src/runtime/bridge/message-types.ts`) has no `CREATE_ENTITY` message
- Image Generator works only because it's a trusted built-in with direct bus access
- Third-party widgets cannot create entities through the sandboxed SDK
- **Mitigation**: Use built-in widget for demo; add `CREATE_ENTITY` bridge message with `'canvas-write'` permission later

**2. Pipeline Execution Engine Is Synchronous** — RISK: MEDIUM
- `src/canvas/wiring/engine/execution-engine.ts` processes nodes synchronously (except `delay`)
- AI generation calls take seconds; engine needs async node execution
- **Mitigation**: Use `delay`/setTimeout pattern already in engine; add loading state + timeout + error propagation

**3. Entity Types Are a Fixed Zod Union** — RISK: LOW
- 14 types at `src/kernel/schemas/canvas-entity.ts:564-579` are compile-time
- Cannot add `'prompt-sticker'` type at runtime
- **Mitigation**: Not needed — pipeline nodes are separate from entity types; output stickers are standard `StickerEntity`

**4. Gallery Store Cross-Import** — RISK: LOW
- `src/kernel/stores/gallery/gallery.store.ts:12` imports `useAuthStore` directly
- Not a blocker but indicates enforcement gaps

### State Management Scaling

**5. Canvas Serialization Size** — RISK: MEDIUM
- Large canvases → large JSON → may exceed token limits or add latency
- **Mitigation**: Viewport scoping, entity count limits, summary mode, incremental diffs in `buildCanvasAIContext()`

**6. Widget Instance State 1MB Limit** — RISK: LOW
- AI agent accumulating history could hit limit
- **Mitigation**: Use `setUserState()` (10MB cross-canvas) for conversation history

### Performance

**7. Event Bus Under AI Load** — RISK: LOW
- Bus targets <1ms latency; batch entity creation if needed

**8. No Debounce on AI Canvas Reads** — RISK: MEDIUM
- Rapid user edits would flood an AI subscriber
- **Mitigation**: 500ms-1s debounce + event batching on AI subscription

### Unknowns

**9. Supabase Edge Function Capabilities** — UNKNOWN
- Can `ai-generate` handle text-to-text (canvas reasoning), or only image generation?
- What are timeout limits? Can it stream?
- **Action**: Audit deployed edge functions

**10. Replicate vs Anthropic for Canvas Reasoning** — UNKNOWN
- Canvas reasoning needs structured output (Claude); image gen needs Replicate
- Integration proxy supports both, but `ai-handler.ts` only handles images
- **Action**: Decide provider split; likely need separate text + image endpoints

**11. Pipeline Node Positioning** — UNKNOWN
- Are "visible pipeline stickers" actual `StickerEntity` objects or pipeline nodes in the wiring editor overlay?
- **Action**: Clarify before Step 5

### Top 3 Risks to Address First

| Priority | Risk | Action |
|---|---|---|
| 1 | No entity creation in SDK/bridge | Add `CREATE_ENTITY` bridge message with permission |
| 2 | Canvas serialization size | Design compact format with viewport scoping from day 1 |
| 3 | Edge function text-to-text support | Audit edge functions; add Anthropic text endpoint if missing |
