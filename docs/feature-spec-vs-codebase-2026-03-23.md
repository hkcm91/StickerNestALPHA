# StickerNest V5 — Feature Spec vs Codebase Reality

**Date:** 2026-03-23
**Method:** Compared every feature in the Master Feature Spec against the actual `src/` directory, file sizes, schema definitions, and implementation patterns.

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Built — real implementation exists with tests |
| 🟡 | Partial — scaffolded or partially implemented |
| ⬜ | Not started — no code exists |
| 🔥 | MVP priority (from spec) |
| 🌙 | Future/nice-to-have (from spec) |

---

## 1. MARKETPLACE

The marketplace layer exists at `src/marketplace/` with ~27 files across 6 subdirectories: `api/`, `detail/`, `install/`, `listing/`, `publisher/`, `reviews/`. Implementations are moderate in depth (30–120 lines per module).

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 1.1 | End-to-end purchase flow | 🔥 | 🟡 | Install flow exists (120 lines). Purchase/payment flow not in marketplace — billing is in kernel. No browse→purchase→library flow wired end-to-end. `MyPurchasesSection.tsx` exists in shell settings |
| 1.2 | Search & discovery | 🔥 | 🟡 | `api/discovery.ts` exists. `listing/widget-listing.ts` (73 lines). Full-text search, filters, categories not verified as complete |
| 1.3 | Widget listing cards | 🔥 | 🟡 | `listing/widget-listing.ts` exists. `detail/widget-detail.ts` (30 lines — likely a stub) |
| 1.4 | Widget reviews & ratings | 🔥 | 🟡 | `reviews/review-manager.ts` (58 lines) — scaffolded but thin |
| 1.5 | Widget versioning | 🔥 | 🟡 | `SemVerSchema` in widget-manifest. Publisher dashboard (113 lines) has some version handling. Breaking change detection partially in lab publish pipeline |
| 1.6 | Widget changelogs | 🔥 | ⬜ | No changelog system found |
| 1.7 | Widget screenshots / previews | 🔥 | 🟡 | `lab/publish/thumbnail.ts` (29 lines) exists for auto-generated thumbnails. No animated GIF or live preview marketplace feature |
| 1.8 | Widget forking / remixing | 🌙 | 🟡 | `lab/import/` exists. License checking implemented. Fork flow scaffolded |
| 1.9 | Marketplace curation | 🌙 | ⬜ | No curation system, staff picks, or editorial features |
| 1.10 | Bundle pricing | 🌙 | ⬜ | No bundle concept |
| 1.11 | Gifting | 🌙 | ⬜ | No gifting system |
| 1.12 | Affiliate / referral system | 🌙 | ⬜ | No referral system |
| 1.13 | Marketplace analytics for buyers | 🌙 | ⬜ | No analytics beyond basic listing data |

**Summary:** 3/7 MVP features partially built, 0 fully complete. Moonshots untouched.

---

## 2. STOREFRONTS & COMMERCE

Commerce infrastructure is split across `kernel/billing/` (172 lines), `runtime/integrations/checkout-integration.ts` (646 lines), and `shell/pages/settings/CreatorCommerceSection.tsx` (313 lines).

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 2.1 | Storefront canvas type | 🔥 | ⬜ | No storefront-specific canvas type. `LayoutModeSchema` has `freeform | bento | desktop | artboard` — no `storefront` mode. No Stripe integration in canvas |
| 2.2 | Digital & physical products | 🔥 | ⬜ | No product catalog schema or system |
| 2.3 | Subscription services | 🔥 | 🟡 | `billing-api.ts` (172 lines) has tier management and Stripe references. `PricingPage.tsx` exists. Basic subscription scaffold but not a full storefront subscription system |
| 2.4 | Stripe Connect onboarding | 🔥 | 🟡 | `checkout-integration.ts` (646 lines) has Stripe checkout flow. `CreatorCommerceSection.tsx` (313 lines) has seller UI. No confirmed Stripe Connect identity verification |
| 2.5 | Seller dashboard | 🔥 | 🟡 | `CreatorCommerceSection.tsx` exists. `publisher/publisher-dashboard.ts` (113 lines) for widgets. No unified seller analytics |
| 2.6 | Payment splits / multi-seller | 🌙 | ⬜ | No revenue splitting system |
| 2.7 | Refund policy & dispute resolution | 🔥 | ⬜ | No refund or dispute handling code found |
| 2.8 | Fraud detection | 🌙 | ⬜ | No fraud detection |
| 2.9 | Tax handling | 🔥 | ⬜ | No tax calculation or Stripe Tax integration |
| 2.10 | Usage-based billing | 🌙 | ⬜ | No metering system |
| 2.11 | Shopify integration | 🌙 | ⬜ | No Shopify references |
| 2.12 | Theming / white-labeling | 🌙 | ⬜ | Theme system exists but not per-storefront customization |
| 2.13 | A/B testing for storefronts | 🌙 | ⬜ | No A/B testing framework |

**Summary:** 3/6 MVP features partially scaffolded, 0 fully complete. Storefronts as a concept are largely unbuilt.

---

## 3. CANVAS SYSTEM

The canvas system is the most built-out area. `src/canvas/` has 4 sub-layers with substantial implementations across core, tools, wiring, and panels.

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 3.1 | Slugs / public canvases | 🔥 | 🟡 | `EmbedPage.tsx` exists. Router has slug routes (`/canvas/:slug`). Preview mode implemented in `uiStore`. Full slug rendering system unclear |
| 3.2 | Canvas navigation modes | 🔥 | ✅ | `LayoutModeSchema`: `freeform | bento | desktop | artboard`. Layout implementations in `canvas/core/layout/`: `freeform.ts`, `bento.ts`, `desktop.ts`, `artboard.ts`, `layout-registry.ts`. Note: doesn't match spec's list (static, vertical scroll, grid-map, side-scroller, free-pan, point-and-click) — different terminology/approach |
| 3.3 | Artboards | 🔥 | 🟡 | `ArtboardEntitySchema` in schemas. `canvas/core/layout/artboard.ts` exists. "Half-started — needs finishing" per spec, which matches reality |
| 3.4 | Canvas templates | 🌙 | 🟡 | `kernel/datasource/templates.ts` (442 lines) — database templates exist. No canvas-level template system |
| 3.5 | Canvas types as first-class concept | 🔥 | 🟡 | `CanvasPlatformSchema` (`web | mobile | desktop`) and `LayoutModeSchema` exist but these are platforms/layouts, not semantic types (dashboard, storefront, portfolio, game, document) |
| 3.6 | Undo/redo system | 🔥 | ✅ | `historyStore` (181 lines) with undo/redo actions. Bus ring buffer for event replay. `selectCanUndo`/`selectCanRedo` selectors |
| 3.7 | Canvas performance budgets | 🔥 | 🟡 | `canvas/core/renderer/` exists. `runtime/pool/iframe-pool.ts` (103 lines) for iframe pooling. `runtime/lifecycle/lazy-loader.ts` (90 lines). No explicit virtualization or widget suspension for 200+ widgets |
| 3.8 | Canvas diffing / collaboration history | 🌙 | ⬜ | No activity log or canvas diff system |
| 3.9 | Canvas snapshots for link previews | 🌙 | ⬜ | No OG image generation |
| 3.10 | Backup & recovery | 🔥 | 🟡 | `canvas/core/persistence/` exists. `lab/versions/` has snapshot system. No auto-backup or restore points for canvases |
| 3.11 | Print / physical output | 🌙 | ⬜ | No print/export system |
| 3.12 | Real-time co-editing (web) | 🌙 | ✅ | Full social layer: `social/cursor/` (cursor broadcast, 30fps throttle), `social/presence/`, `social/entity-sync/`, `social/edit-lock/`, `social/yjs-sync/`, `social/conflict/`. 2,570 lines total |
| 3.13 | Canvas analytics | 🌙 | ⬜ | No analytics system |
| 3.14 | Clipboard system | 🌙 | ⬜ | No cross-canvas clipboard |

**Summary:** 2/7 MVP features fully built, 4 partial. Co-editing is strong despite being labeled moonshot.

---

## 4. WIDGETS

The runtime layer is one of the most complete. `src/runtime/` has ~9,600 lines across bridge, SDK, security, cross-canvas, integrations, lifecycle, and pool.

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 4.1 | Widget persistence — data | 🔥 | ✅ | `setState`/`getState` in SDK (1MB limit). `setUserState`/`getUserState` (10MB limit). Bridge `datasource-handler.ts` (362 lines) for DataSource access |
| 4.2 | Widget persistence — settings | 🔥 | ✅ | `getConfig()` in SDK. `WidgetInstanceStateSchema` and `UserWidgetStateSchema` in schemas |
| 4.3 | Widget sandboxing | 🔥 | ✅ | `security/csp.ts`, `security/sandbox-policy.ts`, `security/rate-limiter.ts`. srcdoc-only loading. Origin validation. 188 lines of security tests |
| 4.4 | Widget templates / starter kits | 🌙 | ⬜ | No widget template/boilerplate system beyond plop scaffolding |
| 4.5 | Widget dependency management | 🔥 | ⬜ | No widget dependency graph. No handling of "Widget A depends on Widget B" |
| 4.6 | Widget communication protocol | 🔥 | ✅ | Full bridge protocol: `bridge.ts` (117 lines), `message-types.ts` (70 lines), `message-validator.ts` (126 lines), `message-queue.ts` (60 lines). 958 lines of bridge tests. Pipeline wiring for input/output ports |
| 4.7 | Widget health monitoring | 🌙 | ⬜ | No health checks or status indicators |
| 4.8 | Error boundaries per widget | 🔥 | ✅ | WidgetFrame error boundary in runtime. Widget crash doesn't crash host (documented + tested) |
| 4.9 | Widget state import/export | 🌙 | ⬜ | No state export/import system |
| 4.10 | Widget input validation | 🔥 | ✅ | Zod validation on all bridge messages. `message-validator.ts`. Port type checking in pipeline wiring |
| 4.11 | Widget capability declarations | 🔥 | ✅ | `WidgetManifest` schema with event contract (`emits`/`subscribes`), config schema, permissions, size constraints |
| 4.12 | Widget API surface contract | 🔥 | ✅ | Full SDK contract: emit, subscribe, state, config, integrations, theme, resize, cross-canvas. Documented in SDK template (450 lines) |
| 4.13 | Sandbox permission levels | 🔥 | ✅ | `WidgetPermissionSchema`: 13 permission types. Permission enforcement at bridge level. Cross-canvas permission check documented |

**Summary:** 8/9 MVP features fully built. Widget system is mature.

---

## 5. WIDGET LAB

Lab has substantial implementation at `src/lab/` (~4,600 lines across AI, graph, inspector, publish, editor, manifest, versions, import, etc.).

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 5.1 | Debug tools — fully functional | 🔥 | 🟡 | `lab/inspector/inspector.ts` (82 lines). Event inspector exists but described as basic. No full debug breakpoint/step-through environment |
| 5.2 | AI generator | 🔥 | ✅ | `lab/ai/ai-generator.ts` (463 lines), `ai-context.ts` (308 lines), `prompt-questions.ts` (200 lines), `manifest-extractor.ts` (115 lines), `models.ts` (90 lines). Voice input support: `voice-input.ts` (168 lines), `voice-command-parser.ts` (64 lines) |
| 5.3 | AI planner | 🔥 | 🟡 | `lab/ai/auto-wire.ts` (121 lines) — auto-wiring suggestions. `ai-full-context.ts` (166 lines). No dedicated "plan pipelines + suggest widget combinations + execute" planner system |
| 5.4 | Drag & drop pipeline builder | 🔥 | ✅ | `lab/graph/` (4 files, ~908 lines): `graph-compiler.ts` (322 lines), `scene-compiler.ts` (250 lines), `scene-types.ts` (206 lines), `graph-sync.ts` (96 lines). Plus `canvas/wiring/graph/pipeline-graph.ts` (139 lines) for the canvas-side graph |

**Summary:** 2/4 MVP features fully built, 2 partial. AI generator is strong.

---

## 6. DATABASES

Database system is well-scaffolded with schemas and operations.

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 6.1 | Custom user databases | 🔥 | ✅ | `kernel/datasource/datasource.ts` (340 lines) — full CRUD. `kernel/datasource/table-ops.ts` (700 lines) — column types, sorts, filters, views. `database-management.ts` schema defines columns, rows, filters, sorts, views |
| 6.2 | AI-powered database creation | 🔥 | ✅ | `kernel/datasource/ai-service.ts` (485 lines). Schema defines: `AISchemaGenerateRequest`, `AIAutofillRequest`, `AISuggestColumnRequest`, `AINaturalLanguageQueryRequest`, `AIExtractDataRequest` |
| 6.3 | Database widgets (views) | 🔥 | 🟡 | `ViewTypeSchema` exists in schemas. `runtime/widgets/kanban/` is a board view widget. No confirmed table view, gallery view, or calendar view as separate widgets |
| 6.4 | Database relations | 🔥 | 🟡 | DataSource schema has `scope` and `canvasId` for basic scoping. Column types in `database-management.ts` include `relation` type. Depth of relational model unclear |
| 6.5 | Database formulas & rollups | 🌙 | 🟡 | `ColumnTypeSchema` likely includes formula type (in `database-management.ts`). Implementation depth unclear |
| 6.6 | Database API | 🔥 | ✅ | Full CRUD via `kernel/datasource/`. ACL enforcement (170 lines). `runtime/bridge/datasource-handler.ts` (362 lines) exposes to widgets |
| 6.7 | Schema registry | 🔥 | ✅ | `src/kernel/schemas/index.ts` — 722-line barrel file. All types centralized. `@sn/types` alias. JSON schema export via `z.toJSONSchema()` |
| 6.8 | PDF widget | 🔥 | ⬜ | No PDF viewer widget found |

**Summary:** 4/7 MVP features fully built, 2 partial. Schema and AI systems are strong.

---

## 7. MILANOTE-LEVEL CANVAS CAPABILITIES

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 7.1 | Rich text / document widget | 🔥 | 🟡 | `TextEntitySchema` exists. Yjs CRDT for Doc DataSources. No dedicated rich text editor widget (no Sticky Note or Markdown Note in current built-in widgets) |
| 7.2 | Image card widget | 🔥 | 🟡 | `StickerEntitySchema` handles images. `runtime/widgets/image-generator/` exists (AI-focused, not display-focused). No simple image card widget |
| 7.3 | Link preview widget | 🔥 | ⬜ | No URL preview card widget |
| 7.4 | File attachment widget | 🔥 | 🟡 | `file` DataSource type exists. No dedicated file attachment UI widget |
| 7.5 | Connecting lines / arrows | 🔥 | 🟡 | Pipeline wiring creates node-edge connections. `PathEntitySchema` exists for vector paths. No mind-map-style visual arrows between arbitrary entities |
| 7.6 | Grouping / sections | 🔥 | ✅ | `GroupEntitySchema` for grouped entities. `FolderEntitySchema` for organizational folders. `ArtboardEntitySchema` for design sections |
| 7.7 | Web clipper | 🌙 | ⬜ | No browser extension or bookmarklet |
| 7.8 | Media players | 🔥 | 🟡 | `AudioEntitySchema` exists. `LottieEntitySchema` for animations. No video player entity or widget confirmed |
| 7.9 | Freeform arrangement | 🔥 | ✅ | `freeform` layout mode. Infinite canvas with canvas-space positioning. Entity drag/drop in tools layer |

**Summary:** 2/8 MVP features fully built, 5 partial. The basic canvas primitives exist but higher-level content widgets are thin.

---

## 8. AUTOMATION (ZAPIER/N8N LAYER)

Pipeline wiring engine exists at `src/canvas/wiring/` (~776 lines) with execution engine, validator, and graph model.

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 8.1 | Trigger types | 🔥 | 🟡 | Event-based triggers via bus events. `kernel/world/tick-loop.ts` for time-based. No confirmed cron/webhook/manual-button triggers |
| 8.2 | Action types | 🔥 | 🟡 | Pipeline execution routes events between widgets. Integration proxy can call external APIs. No dedicated email, DB update, or canvas-item-creation action nodes |
| 8.3 | Conditional logic | 🔥 | 🟡 | `PipelineNodeTypeSchema` includes built-in transforms. Pipeline validator (147 lines). No confirmed if/then branching or loop nodes |
| 8.4 | Entity node library | 🔥 | 🟡 | Integration proxy exists for Notion. `checkout-integration.ts` for Stripe. `social-handler.ts` for social. No broad pre-built node library (HTTP request, data transform, email, etc.) |
| 8.5 | Custom entity nodes | 🔥 | 🟡 | Widget manifest declares event ports. Widgets can be pipeline nodes. No "user builds custom automation node" flow |
| 8.6 | Automation testing / dry-run | 🔥 | ⬜ | No dry-run or test-without-firing mode |
| 8.7 | Execution logs | 🔥 | ⬜ | No per-run execution logging system |
| 8.8 | Rate limiting on automations | 🔥 | 🟡 | `security/rate-limiter.ts` exists (per-widget). Pipeline-level rate limiting not confirmed. `PipelineSchema` has no rate limit field |
| 8.9 | Queuing system | 🔥 | ⬜ | No job queue, retry logic, or dead letter handling |
| 8.10 | Entity node ↔ widget bridge | 🔥 | ✅ | Pipeline wiring connects widget outputs to inputs. Event bus routes between them. Execution engine (178 lines) handles routing |
| 8.11 | Data transformation layer | 🔥 | 🟡 | Built-in transform nodes in pipeline (filter, map, merge). No dedicated field mapping, date formatting, or array manipulation layer |
| 8.12 | Scheduled actions | 🌙 | ⬜ | `tick-loop.ts` exists in world but no user-facing cron scheduler |

**Summary:** 1/11 MVP features fully built, 7 partial, 3 not started. Automation is the widest gap vs ambition.

---

## 9. PLATFORM ARCHITECTURE — CORE vs PLUGIN

| # | System | Status | Evidence |
|---|--------|--------|----------|
| 9.1 | Canvas renderer & navigation | ✅ | `canvas/core/` — viewport, scene, renderer, hittest, drag |
| 9.2 | Widget sandboxing & execution | ✅ | `runtime/` — full iframe sandbox, CSP, origin validation |
| 9.3 | Event bus | ✅ | `kernel/bus/` — typed pub/sub, ring buffer, bench() API |
| 9.4 | Protocol layer | ✅ | `runtime/bridge/` — Zod-validated postMessage protocol |
| 9.5 | Database engine | ✅ | `kernel/datasource/` + `kernel/schemas/database-management.ts` |
| 9.6 | Auth, permissions, sessions | ✅ | `kernel/auth/` (276 lines), `authStore`, OAuth support |
| 9.7 | Payment processing infrastructure | 🟡 | `kernel/billing/` + `checkout-integration.ts`. Basic Stripe scaffold but not production-complete |
| 9.8 | Pipeline execution engine | ✅ | `canvas/wiring/engine/execution-engine.ts` (178 lines) |
| 9.9 | Save state management | ✅ | Widget state persistence, DataSource CRUD, canvas persistence |
| 9.10 | Real-time sync / multiplayer infra | ✅ | `social/` — Realtime channels, Yjs CRDT, presence, cursor sync |
| 9.11 | Asset storage & CDN | 🟡 | `galleryStore` + `GalleryAssetSchema`. No confirmed CDN integration |
| 9.12 | Embed runtime | 🟡 | `shell/pages/EmbedPage.tsx` exists. Depth unclear |
| 9.13 | Slug routing & rendering | 🟡 | Router has `/canvas/:slug`. Preview mode exists. Full slug rendering unconfirmed |
| 9.14 | Search indexing | ⬜ | No search indexing infrastructure |
| 9.15 | AI gateway | 🟡 | `runtime/integrations/ai-handler.ts` (84 lines). `lab/ai/` uses AI via platform proxy. No centralized AI gateway service |
| 9.16 | Schema registry | ✅ | `@sn/types` barrel — comprehensive, 722 lines |

**Core platform:** 10/16 fully built, 5 partial, 1 missing (search indexing).

| # | Widget Plugin | Status | Evidence |
|---|---------------|--------|----------|
| 9.17 | Database views | 🟡 | Kanban widget exists. Others missing |
| 9.18 | Rich text editor | 🟡 | Text entity exists. No full rich text widget |
| 9.19 | Media players | 🟡 | Audio entity schema. No video/PDF widgets |
| 9.20 | Charts / data viz | ⬜ | No chart widgets |
| 9.21 | Web clipper output | ⬜ | No web clipper |
| 9.22 | Storefront layouts | ⬜ | No storefront widgets |
| 9.23 | Milanote-style tools | 🟡 | Image-generator, grouping, freeform. Missing link previews, mood boards |
| 9.24 | Note-taking patterns | 🟡 | Text entity + Doc DataSource. No rich note widget |
| 9.25 | Social / comment widgets | 🟡 | Social graph schemas + handlers exist. No dedicated social widget |
| 9.26 | Form builders | ⬜ | No form builder widget |
| 9.27 | Dashboard components | ⬜ | No dashboard widgets |
| 9.28 | Domain-specific tools | 🟡 | Todo-list, kanban, pathfinder, stories widgets exist |

**Widget plugins:** 0/12 fully complete. Most need actual widget implementations built on the (solid) platform.

---

## 10. EMBEDDING & INTEGRATIONS

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 10.1 | Embeddable canvases | 🔥 | 🟡 | `EmbedPage.tsx` in shell. Router supports embed routes. Full embed runtime unclear |
| 10.2 | Embeddable individual widgets | 🔥 | ⬜ | No individual widget embed system |
| 10.3 | Notion integration | 🔥 | ✅ | `kernel/schemas/notion-integration.ts` — full schema. `runtime/integrations/notion-handler.ts` (273 lines, 595 lines tests). `kernel/datasource/notion-sync.ts` (580 lines) |
| 10.4 | Webhook support | 🌙 | ⬜ | No webhook infrastructure |
| 10.5 | API / public endpoints | 🌙 | ⬜ | No public API endpoints |

**Summary:** 1/3 MVP features fully built (Notion), 1 partial, 1 not started.

---

## 11. PROTOCOL, EVENT BUS & COMMUNICATION

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 11.1 | Protocol library | 🔥 | ✅ | Bridge protocol in `runtime/bridge/` — typed, Zod-validated, origin-checked. Message types, validator, queue |
| 11.2 | Event bus library | 🔥 | ✅ | `kernel/bus/` — typed pub/sub, ring buffer, bench() API, <1ms latency target |
| 11.3 | Walkie talkie / broadcast system | 🔥 | 🟡 | `runtime/cross-canvas/cross-canvas-router.ts` (318 lines) with extensive tests. Channel-based cross-canvas events. No "walkie talkie" UI for securing/inviting |

**Summary:** 2/3 MVP features fully built. Strong.

---

## 12. CROSS-PLATFORM

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 12.1 | Mobile app | 🔥 | ⬜ | `CanvasPlatformSchema` has `mobile` value. No mobile app or PWA implementation |
| 12.2 | Cross-platform save states | 🔥 | ⬜ | No per-platform save state system |
| 12.3 | Offline support | 🔥 | 🟡 | `social/offline/` exists for offline degradation of social layer. No broad app-level offline/cache system |

**Summary:** 0/3 MVP features complete. Cross-platform is unbuilt.

---

## 13. 3D / VR / AR

The spatial layer has 56 TypeScript files totaling ~7,900 lines. This is substantial.

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 13.1 | VR/AR full audit | 🔥 | 🟡 | Code exists but spec says "hasn't been tested since before V5" |
| 13.2 | Meta Quest SDK integration | 🔥 | ✅ | `spatial/controller/controller-input.ts`, `spatial/input/ControllerBridge.tsx`, `spatial/input/HandBridge.tsx`, `spatial/input/Pointer.tsx` |
| 13.3 | Sample 3D environments | 🔥 | 🟡 | `spatial/scene/`, `spatial/components/SpatialScene.tsx`, `spatial/components/SpatialRoot.tsx`. No confirmed sample environments |
| 13.4 | Multiplayer in 3D | 🔥 | 🟡 | Social layer + spatial entity mapping exist. `spatial/entity-mapping/entity-mapper.ts`. Full multiplayer-in-VR flow unconfirmed |
| 13.5 | Memory management in 3D | 🔥 | ⬜ | No LOD, texture budgets, or draw call limits found |
| 13.6 | Haptic feedback | 🌙 | ⬜ | No haptic/vibration references in spatial |
| 13.7 | Spatial audio | 🌙 | ⬜ | No spatial audio implementation |
| 13.8 | Voice commands in VR | 🌙 | 🟡 | `lab/ai/voice-input.ts` and `voice-command-parser.ts` exist but they're in Lab, not spatial |
| 13.9 | Gesture library | 🌙 | 🟡 | `canvas/core/input/gesture-interpreter.ts` exists. `spatial/input/` has pointer/hand/controller bridges. No custom gesture library |

**Summary:** 1/5 MVP features complete (controller input), 3 partial. Mixed reality is scaffolded: `spatial/mr/` has plane detection, mesh detection, hit testing, anchors.

---

## 14. AUTH, ACCOUNTS & PERMISSIONS

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 14.1 | Auth & user accounts | 🔥 | ✅ | `kernel/auth/auth.ts` (276 lines). `authStore`. Supabase auth |
| 14.2 | Permissions & roles | 🔥 | ✅ | `CanvasRole` in canvasStore. `DataSourceACLRole` (owner/editor/commenter/viewer). Route guards in shell. `WidgetPermission` enum |
| 14.3 | Creator profiles | 🌙 | 🟡 | `kernel/social-graph/` has profiles, follows. `shell/profile/` exists. No confirmed public portfolio page |
| 14.4 | Follow / subscribe to creators | 🌙 | 🟡 | `kernel/social-graph/follows.ts` exists. Notification on publish unclear |
| 14.5 | OAuth / social login | 🔥 | ✅ | Auth module supports OAuth. Supabase provides Google, GitHub, etc. |
| 14.6 | Two-factor auth | 🔥 | ⬜ | No 2FA implementation found |
| 14.7 | Session management | 🌙 | ⬜ | No session list/revoke UI |

**Summary:** 3/4 MVP features complete. Missing 2FA.

---

## 15. MONETIZATION & TIERS

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 15.1 | Storage quotas | 🔥 | ✅ | `kernel/quota/quota.ts`, `useQuotaCheck.ts` hook. Feature-flag–style quota checks |
| 15.2 | Tier system / subscription plans | 🔥 | ✅ | `kernel/billing/billing-api.ts` (172 lines) — tier management. `PricingPage.tsx`. Creator+ tier gating on Lab |
| 15.3 | Trial / freemium flow | 🔥 | 🟡 | `UpgradePrompt.tsx` in shell. Basic flow exists. Full trial system unclear |

**Summary:** 2/3 MVP features complete. Solid foundation.

---

## 16. SECURITY & COMPLIANCE

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 16.1 | Security audit | 🔥 | 🟡 | Widget sandboxing is thorough. No evidence of formal external audit |
| 16.2 | Rate limiting & abuse prevention | 🔥 | ✅ | `runtime/security/rate-limiter.ts`. Per-widget rate limits. Pipeline rate limiting in execution engine |
| 16.3 | Bot / scraping protection | 🌙 | ⬜ | No bot/scraping protection |
| 16.4 | Content moderation | 🔥 | ⬜ | No moderation system, flagging, or review queue |
| 16.5 | GDPR / data privacy | 🔥 | ⬜ | No GDPR compliance, data export, or consent management |
| 16.6 | Legal pages | 🔥 | ⬜ | No ToS, privacy policy, or legal page templates |
| 16.7 | Licensing system | 🔥 | ✅ | `WidgetLicenseSchema` in manifest. License types: MIT, Apache-2.0, proprietary, no-fork. Lab import respects licenses |
| 16.8 | Audit trail | 🔥 | ⬜ | No audit trail system |

**Summary:** 2/7 MVP features complete. Compliance is a major gap.

---

## 17. INFRASTRUCTURE & DEVOPS

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 17.1 | Testing infrastructure | 🔥 | ✅ | 212 test files. Vitest config, Playwright config, 48 Supabase migrations, `dependency-cruiser`, `eslint-plugin-boundaries`, coverage thresholds, husky hooks |
| 17.2 | Feature flags / staged rollouts | 🔥 | 🟡 | `kernel/quota/` acts as tier-based feature gates. No LaunchDarkly or proper feature flag system |
| 17.3 | Migration tooling | 🔥 | ✅ | 48 Supabase migrations. `db:migrate`, `db:reset`, `db:diff` commands. Plop scaffolding generators |
| 17.4 | Asset management / CDN | 🔥 | 🟡 | `galleryStore` + `GalleryAssetSchema`. Supabase storage. No confirmed CDN configuration |
| 17.5 | Error handling & logging | 🔥 | ✅ | `shell/error/error-boundary.tsx`. WidgetFrame error boundaries. Bus error events. Per-widget crash isolation |
| 17.6 | Technical health dashboard | 🔥 | ⬜ | No dependency health dashboard |
| 17.7 | Status page | 🌙 | ⬜ | No status page |
| 17.8 | Dependency audit | 🔥 | 🟡 | `dependency-cruiser` validates layer boundaries. No automated dep audit for outdated/vulnerable packages |

**Summary:** 3/7 MVP features complete, 3 partial. Core testing and migration are solid.

---

## 18. USER EXPERIENCE

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 18.1 | Onboarding / first-run experience | 🔥 | ⬜ | No onboarding flow found |
| 18.2 | Keyboard shortcuts & power user tools | 🌙 | ✅ | `shell/shortcuts/shortcut-registry.ts` with tests. Central registry as specified |
| 18.3 | Accessibility | 🔥 | 🟡 | Some ARIA usage in lab components. No systematic accessibility implementation |
| 18.4 | Internationalization (i18n) | 🌙 | ⬜ | No i18n framework or string extraction |
| 18.5 | Notification system | 🔥 | 🟡 | `NotificationSchema` in social-graph schemas. `kernel/social-graph/notifications.ts`. `Toast` type in uiStore. Not a full notification center |
| 18.6 | Deep linking | 🌙 | 🟡 | Canvas routes support IDs and slugs. No widget-level deep links |
| 18.7 | SEO for public canvases | 🔥 | ⬜ | No meta tags, OG, or structured data |
| 18.8 | Social sharing & embeds | 🌙 | ⬜ | No share cards or social preview |
| 18.9 | Data export / portability | 🔥 | ⬜ | No export system |

**Summary:** 0/5 MVP features complete. UX polish is almost entirely unbuilt.

---

## 19. COMMUNITY & ECOSYSTEM

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 19.1 | Developer docs | 🔥 | 🟡 | CLAUDE.md + layer rule files serve as internal docs. `docs/architecture.md` just created. No public-facing developer documentation site |
| 19.2 | Changelog / release notes | 🌙 | ⬜ | No changelog system |
| 19.3 | Community space | 🌙 | ⬜ | No community forum or integration |
| 19.4 | Plugin / extension architecture | 🌙 | 🟡 | Widget system IS the plugin architecture. No canvas-tool-level plugin system |

**Summary:** 0/1 MVP feature complete. Dev docs need public-facing version.

---

## 20. EMAIL & COMMUNICATIONS

| # | Feature | Priority | Status | Evidence |
|---|---------|----------|--------|----------|
| 20.1 | Transactional email system | 🔥 | ⬜ | No email system found |

---

## SCORECARD SUMMARY

| Category | MVP 🔥 | Fully Built ✅ | Partial 🟡 | Not Started ⬜ | Completion |
|----------|--------|---------------|------------|----------------|------------|
| 1. Marketplace | 7 | 0 | 5 | 2 | 🟡 Scaffolded |
| 2. Storefronts & Commerce | 6 | 0 | 3 | 3 | ⬜ Early |
| 3. Canvas System | 7 | 2 | 4 | 1 | 🟡 Strong base |
| 4. Widgets | 9 | 8 | 0 | 1 | ✅ Nearly complete |
| 5. Widget Lab | 4 | 2 | 2 | 0 | 🟡 Good |
| 6. Databases | 7 | 4 | 2 | 1 | ✅ Strong |
| 7. Milanote-Level Canvas | 8 | 2 | 5 | 1 | 🟡 Primitives exist |
| 8. Automation (Zapier/n8n) | 11 | 1 | 7 | 3 | 🟡 Needs work |
| 9. Platform Core | 16 | 10 | 5 | 1 | ✅ Solid foundation |
| 9. Widget Plugins | 12 | 0 | 7 | 5 | ⬜ Early |
| 10. Embedding & Integrations | 3 | 1 | 1 | 1 | 🟡 Notion strong |
| 11. Protocol & Communication | 3 | 2 | 1 | 0 | ✅ Strong |
| 12. Cross-Platform | 3 | 0 | 1 | 2 | ⬜ Unbuilt |
| 13. 3D / VR / AR | 5 | 1 | 3 | 1 | 🟡 Code exists, untested |
| 14. Auth & Permissions | 4 | 3 | 0 | 1 | ✅ Strong |
| 15. Monetization & Tiers | 3 | 2 | 1 | 0 | ✅ Good |
| 16. Security & Compliance | 7 | 2 | 1 | 4 | ⬜ Gaps |
| 17. Infrastructure & DevOps | 7 | 3 | 3 | 1 | 🟡 Good base |
| 18. User Experience | 5 | 0 | 2 | 3 | ⬜ Unbuilt |
| 19. Community & Ecosystem | 1 | 0 | 1 | 0 | 🟡 Internal only |
| 20. Email & Communications | 1 | 0 | 0 | 1 | ⬜ Unbuilt |

### Overall MVP Score

**Of 101 MVP features:**
- ✅ Fully built: **43**
- 🟡 Partially built: **41**
- ⬜ Not started: **17**

### Strongest Areas (ship-ready foundations)
1. **Widget Runtime** — sandbox, bridge, SDK, permissions are production-grade
2. **Event Bus & Protocol** — typed, validated, tested, performant
3. **Database / DataSource** — CRUD, ACL, AI operations, Notion sync
4. **Auth & Permissions** — working auth with roles and tier gating
5. **Real-time Collaboration** — full social layer with presence, cursors, Yjs

### Biggest Gaps (unbuilt or early)
1. **Storefronts & Commerce** — core business model, barely scaffolded
2. **Automation/Zapier layer** — the pipeline engine exists but the node library, logging, queuing, dry-run are missing
3. **User Experience** — no onboarding, no SEO, no data export, no accessibility
4. **Security & Compliance** — no GDPR, no content moderation, no audit trail, no 2FA
5. **Cross-Platform** — no mobile app, no offline support
6. **Widget Plugin Ecosystem** — platform is ready but almost no actual widgets exist on top of it

### Key Terminology Mismatch: Canvas Navigation Modes

The feature spec lists: `static, vertical scroll, grid-map (Stardew style), side-scroller, free-pan, point-and-click`

The codebase implements: `freeform, bento, desktop, artboard`

These don't align. The codebase's layout modes are real and implemented. The spec's modes are aspirational and not yet built (especially grid-map/Stardew and side-scroller).
