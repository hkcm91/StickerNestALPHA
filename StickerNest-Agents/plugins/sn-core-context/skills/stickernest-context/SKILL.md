---
name: stickernest-context
description: >
  This skill provides the master context briefing for StickerNest V5. Use it when
  starting any StickerNest-related work, when needing architecture context, when
  asking "what is StickerNest", "how does the architecture work", "what layer does
  this belong to", or when any StickerNest agent needs foundational project context.
---

> Read this file before doing any work on StickerNest. It contains everything you need to understand the project, its architecture, its current state, and how to contribute effectively.
>
> Last updated: 2026-03-23

---

## What Is StickerNest?

StickerNest is a **spatial operating system** — an infinite-canvas platform where widgets, stickers, entities, and event-driven pipelines compose into interactive workspaces. It runs in the browser (2D canvas), in 3D (Three.js), and in VR (WebXR / Quest 3).

The mental model: **the canvas is a desktop. Stickers are icons. Widgets are apps. The event bus is IPC. The marketplace is the app store.**

Users place visual assets (stickers) on an infinite canvas, install interactive programs (widgets), connect them with visual pipelines, and optionally enter VR to interact with their workspace spatially. Creators can build and sell their own widgets through the marketplace. The platform supports real-time collaboration with multiple users on the same canvas.

### Who Is Building It

Kimber (woahitskimber@gmail.com) — a solo self-taught developer building StickerNest while working retail. She develops on her phone and laptop with no human technical peers. Claude is the team.

### The Vision

"Every canvas is a living system." The platform itself is the program — stickers, widgets, scripts, and pipelines are all ways of giving it behavior. Users aren't just arranging objects; they're composing interactive environments.

### Target Audience

Creative professionals, community builders, game designers, and anyone who wants a visual workspace that goes beyond static boards. The platform spans from casual (place stickers, organize visually) to power-user (build widgets, wire pipelines, enter VR).

### Business Model

SaaS with 4 tiers: Free, Creator ($), Pro ($$), Enterprise ($$$). Stripe Direct for platform subscriptions. Stripe Connect for creator commerce (creators sell widgets, canvas subscriptions, and shop items; StickerNest takes a platform fee).

---

## Architecture Overview

### Three Conceptual Layers

Every architectural decision enforces separation between:

- **Layer A — Spatial**: Canvas, entities, rendering, z-order, input routing. Knows about position and appearance, not data or logic.
- **Layer B — Data**: DataSources — persistent records independent of any widget. Data is decoupled from display.
- **Layer C — Interaction**: Widgets, scripts, pipelines, event bus. This gives the canvas behavior.

### Seven Implementation Layers (Build Order)

```
L0 Kernel → L1 Social → L3 Runtime → L2 Lab → L4A/4B Canvas/Spatial → L5 Marketplace → L6 Shell
```

| Layer | Path | What It Does | May Import From |
|-------|------|-------------|-----------------|
| L0: Kernel | `src/kernel/` | Schemas, event bus, Zustand stores, Supabase client, auth, DataSource API, billing, quota, social-graph, world/systems | Nothing (foundation) |
| L1: Social | `src/social/` | Realtime collaboration — presence, cursors, entity sync, conflict resolution, edit locks, offline handling | L0 |
| L3: Runtime | `src/runtime/` | Widget sandbox — WidgetFrame (iframe), bridge protocol, Widget SDK, built-in widgets, cross-canvas events | L0 |
| L2: Lab | `src/lab/` | Widget IDE — Monaco editor, live preview, event inspector, node graph, AI generation, manifest editor, publish pipeline | L0, L1, L3 |
| L4A: Canvas | `src/canvas/` | 2D canvas — core (viewport, scene, hit-test, render), tools (select, move, resize, pen, etc.), wiring (pipeline graph), panels (toolbar, properties, layers, assets) | L0, L3 (core only for tools/wiring/panels) |
| L4B: Spatial | `src/spatial/` | 3D/VR — Three.js scene, WebXR sessions, VR controllers, spatial entity mapping | L0, L3 (peer of L4A, not child) |
| L5: Marketplace | `src/marketplace/` | Widget marketplace — listing, install, uninstall, reviews, publisher dashboard | L0, L1, L3, L4A-1 |
| L6: Shell | `src/shell/` | App shell — routing, auth gating, layout, theme system, keyboard shortcuts, error boundaries | All lower layers |

**Import rules are strictly enforced** by ESLint (`eslint-plugin-boundaries`) and `dependency-cruiser`. Cross-layer communication uses the event bus or `@sn/types` — never direct imports across boundaries.

### Canvas Sub-Layers (L4A)

L4A has four sub-layers with their own import rules:

| Sub-Layer | Path | Responsibility |
|-----------|------|---------------|
| L4A-1: Core | `src/canvas/core/` | Viewport, scene graph, hit-testing, render loop, drag primitives |
| L4A-2: Tools | `src/canvas/tools/` | Select, move, resize, pen, text, shape, sticker, widget placement |
| L4A-3: Wiring | `src/canvas/wiring/` | Pipeline graph editor, execution engine, validation |
| L4A-4: Panels | `src/canvas/panels/` | Toolbar, properties, layers, assets, context menu, floating bar |

---

## Core Terminology

These terms are precise and enforced across code, docs, and conversation. Using the wrong term causes confusion.

**Canvas** — The infinite 2D (or spatial 3D/VR) workspace where everything lives. Never "board", "scene", or "stage".

**Entity** — Any object with a canvas position. Types: Text, Image, Vector, Shape, Audio, Video, 3D Object, Sticker, Widget Container. Entities live in Layer A (Spatial). They do not have databases. Rule: if it has a position on the canvas, it is an entity.

**DataSource** — A persistent, addressable record independent of any widget. Types: `doc | table | note | folder | file | custom`. Scopes: `canvas | user | shared | public`. DataSources live in Layer B (Data). Multiple widgets can reference the same DataSource. Data is decoupled from display.

**Widget** — A self-contained interactive program. Runs in a sandboxed iframe (third-party) or as trusted inline React component (built-in). Communicates exclusively through the Event Bus. A widget does not know where it lives on the canvas — it only knows the bus. Widgets are the "apps" of StickerNest.

**Sticker** — A visual asset (image, GIF, video) placed on the canvas. Stickers are decorative first. They act as programmable buttons — a sticker never contains logic, it triggers logic (launch widget, run script, open URL, navigate canvas, emit bus event).

**Pipeline** — A visual directed acyclic graph (DAG) connecting widget outputs to widget inputs. Nodes represent widget instances or built-in transforms (filter, map, merge, delay). Edges route typed events between ports.

**Event Bus** — The typed pub/sub IPC layer. All inter-widget, inter-store, and cross-layer communication goes through the bus. Dot-namespaced event types (e.g., `widget.mounted`, `social.cursor.moved`). Emit-to-handler latency target: < 1ms.

**Script** — Headless JavaScript automation on the event bus. No UI. Available to lower-tier users.

**Docker** — A container widget that hosts child widgets. Can be tabbed or scrollable. Saveable and portable across canvases. Acts as reusable toolbars, dashboards, and control panels.

**Widget Lab** — The in-app IDE for creating widgets. Monaco editor, live preview, AI generation, node graph, publish pipeline. Creator+ tier feature.

**Marketplace** — Widget discovery, installation, ratings, reviews, and publishing. The app store of StickerNest.

### Entity vs DataSource — The Key Distinction

| | Entity | DataSource |
|---|--------|-----------|
| Has canvas position | Yes | No |
| Lives in | Spatial Layer (A) | Data Layer (B) |
| Has a database | No | Yes |
| Opened by widgets | No (it IS on the canvas) | Yes (widget is a view over it) |
| Example | Text block on canvas | Doc, Table, File |

### What Saves, and Who Owns It (Four Persistence Layers)

1. **Canvas / Data Layer** — Entities and DataSources. Owned by the canvas. Persists automatically.
2. **Widget instance state** — Internal runtime state per canvas instance. Via `StickerNest.setState()`. 1MB limit.
3. **Widget instance config** — Static configuration. Via `StickerNest.getConfig()`. Set at setup time.
4. **User state** — Per-user preferences across all canvases. Via `StickerNest.setUserState()`. 10MB limit.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Language | TypeScript (strict) |
| Framework | React |
| Build | Vite |
| State | Zustand (9 stores) |
| Schema | Zod v4+ (with `z.toJSONSchema()` for manifests) |
| Database | Supabase (Postgres + Realtime + Auth + Storage + Edge Functions) |
| 3D/VR | Three.js, @react-three/fiber, @react-three/xr, WebXR |
| CRDT | Yjs + y-protocols (for Doc DataSource collaboration) |
| Testing | Vitest (unit, 80% threshold), Playwright (E2E, swiftshader) |
| Linting | ESLint with eslint-plugin-boundaries + dependency-cruiser |
| Editor (Lab) | Monaco |
| CI/CD | GitHub Actions → Vercel |
| Payments | Stripe (Direct for platform, Connect for creators) |
| Commit | Conventional commits via commitlint + husky |
| Scaffolding | Plop.js (5 generators: widget, module, store, event, schema) |
| MCP | Custom stickernest-dev MCP server in `mcp-dev/` |

### Path Alias

`@sn/types` resolves to `src/kernel/schemas/index.ts`. Deep imports like `@sn/types/spatial` also work. Configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`.

---

## Zustand Stores

Nine stores, one domain each. Stores do not reach into each other's state — cross-store coordination goes through the event bus.

1. `authStore` — Current user, session, auth status, tier
2. `workspaceStore` — Workspace metadata, member list, settings
3. `canvasStore` — Active canvas ID, metadata, sharing settings
4. `historyStore` — Undo/redo stack (powered by bus ring buffer)
5. `widgetStore` — Widget registry, widget instance list
6. `socialStore` — Presence map, cursor positions
7. `uiStore` — UI flags, modes (`canvasInteractionMode: 'edit' | 'preview'`)
8. `dockerStore` — Docker panel state and child management
9. `galleryStore` — Canvas gallery / home page state

Each store exports a `setup*BusSubscriptions()` function called from `initAllStores()` during app bootstrap.

---

## Canvas Interaction Modes

- **Edit mode** — Full entity manipulation, pipeline graph editing, config panels. For Owner/Editor roles.
- **Preview mode** — Widgets fully interactive, layout locked. For slug URLs, embeds, fullscreen, Viewer/Commenter roles.
- Stored in `uiStore.canvasInteractionMode`. Never persisted — always derived from role + URL context on load.

---

## Widget SDK API

The SDK is injected into every widget iframe. Available as `StickerNest` on `window`:

- `StickerNest.emit(type, payload)` — Emit event to bus
- `StickerNest.subscribe(type, handler)` — Subscribe to bus events
- `StickerNest.setState(key, value)` / `getState(key)` — Instance state (1MB limit)
- `StickerNest.setUserState(key, value)` / `getUserState(key)` — Cross-canvas user state (10MB limit)
- `StickerNest.getConfig()` — Get instance configuration
- `StickerNest.register(manifest)` — Declare event contract (call before `ready()`)
- `StickerNest.ready()` — Signal initialization complete (must be called within 500ms)
- `StickerNest.onThemeChange(handler)` — Receive theme tokens
- `StickerNest.onResize(handler)` — Receive viewport dimensions
- `StickerNest.integration(name).query(params)` / `.mutate(params)` — External data via host proxy
- `StickerNest.emitCrossCanvas(channel, payload)` — Cross-canvas events (requires `cross-canvas` permission)
- `StickerNest.subscribeCrossCanvas(channel, handler)` / `unsubscribeCrossCanvas(channel)`

Security: Integration credentials never enter the iframe. Media assets never delivered as direct bucket URLs. Strict CSP enforced. Origin validation on every postMessage.

---

## Current Build State (as of March 2026)

### What's Built and Working

- Full kernel (L0): stores, bus, schemas, auth, billing, quota, datasource, social-graph
- Full social layer (L1): 123 tests passing — presence, cursors, entity sync, conflict resolution, offline
- Full runtime (L3): sandboxed widget execution, bridge protocol, SDK, cross-canvas events, built-in widgets
- Canvas core + tools + wiring + panels (L4A): viewport, scene graph, 14 tool types, pipeline engine, 8 panel types
- Spatial scaffolding (L4B): directory structure and initial components
- Shell (L6): routing, auth guards, layout, theme, shortcuts, canvas page with full editing
- SaaS billing: Stripe edge functions, pricing page, billing settings, quota enforcement
- Widget uninstall UI: complete
- Canvas interactions: keyboard shortcuts (37 tests), resize handles, alignment, group/ungroup, crop, gesture interpreter
- Dev infrastructure: ESLint boundaries, dependency-cruiser, Vitest (167 tests), Playwright E2E, Storybook, commitlint, husky, CI/CD, Plop generators, Ralph Loop

### What's In Progress / Partially Built

- Widget Lab (L2): scaffolded with design specs, some components built, needs IDE wiring
- Spatial/VR (L4B): scaffolded, needs Three.js scene and WebXR integration
- Marketplace (L5): scaffolded, needs UI and API implementation

### What's Not Started

- Social features: user search, profiles, follow/friend system, messaging, canvas invites
- Runtime hardening: per-widget event bus controls, database↔widget integration, Notion sync
- Canvas display: split-screen, resizable canvases, background options
- Pipeline completion: full graph editor, sticker→widget connections, pipeline templates
- Game controller support
- VR implementation
- Marketplace UI redesign, sticker marketplace, ratings/reviews, widget pricing
- Widget/canvas embeds
- OAuth providers (Google, GitHub, Discord)
- Onboarding wizard
- Social UI (presence avatars, remote cursors, edit lock indicators, notifications)
- Landing page
- Creator commerce (Stripe Connect, commerce widgets, creator dashboard)
- Production hardening (security audit, performance profiling, bundle analysis)
- Analytics (Sentry, PostHog)

---

## Development Commands

```bash
# Build & Run
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc + vite build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint with layer boundaries
npm run lint:fix         # ESLint autofix

# Testing
npm test                 # Vitest (all unit tests)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # V8 coverage (80% threshold)
npm run e2e              # Playwright E2E
npm run e2e:headed       # Playwright with visible browser

# Architecture Validation
npm run deps:validate    # dependency-cruiser layer checks

# Database
npm run db:start         # Local Supabase
npm run db:stop          # Stop Supabase
npm run db:reset         # Reset database
npm run db:migrate       # New migration

# Scaffolding
npm run scaffold:widget  # New widget boilerplate
npm run scaffold:module  # New module boilerplate
npm run scaffold:schema  # New schema boilerplate
npm run scaffold:event   # New event boilerplate
npm run scaffold:store   # New store boilerplate

# Other
npm run storybook        # Port 6006
```

### Commit Format

`<type>(<scope>): <description>`

Scopes match layers: `kernel`, `social`, `runtime`, `lab`, `canvas-core`, `canvas-tools`, `canvas-wiring`, `canvas-panels`, `spatial`, `marketplace`, `shell`, `deps`, `config`, `ci`

---

## Key Design Decisions & Constraints

1. **Import boundaries are law.** Each layer may only import from layers below it. Violations collapse the dependency graph. ESLint and dependency-cruiser enforce this at lint time and CI.

2. **The event bus is IPC.** Stores do not read each other. Cross-store and cross-layer coordination goes through the bus exclusively.

3. **Widgets are sandboxed.** All third-party widgets run in iframes loaded via `srcdoc` blob. No remote `src` URLs. Strict CSP. Origin validation on every message. Credentials never enter the iframe.

4. **Data is decoupled from display.** Widgets are views over DataSources. Deleting a widget doesn't delete data. Multiple widgets can view the same DataSource.

5. **Conflict resolution matches data type.** Canvas entities and Notes: LWW silent. Docs: Yjs CRDT. Tables/Custom: revision-based with 409 + toast. Never mix strategies.

6. **The canvas is the source of truth.** Entities persist to the canvas automatically. The widget is a tool — the paint stays when you close the brush.

7. **Single Supabase client.** Created in `src/kernel/supabase/`, imported everywhere. Never re-instantiated.

8. **80% test coverage.** Branches, functions, lines, statements. Every module needs a co-located `*.test.ts`.

9. **Build order is dependency order.** L0 → L1 → L3 → L2 → L4A/4B → L5 → L6. Each layer must be independently testable before the next begins.

10. **No `spatial` defaults on BusEvents.** The `spatial` field is always optional, always `undefined` for non-VR events. Never default to zero vector.

---

## Existing Agent Infrastructure

### Ralph Loop

An autonomous development workflow in `.ralph/`. Claude reads a story file (acceptance criteria + constraints), works through criteria one by one, runs tests after each change, logs progress, and marks criteria complete. Unlocked and working.

### Pre-Build Agent Toolkit (25 agents)

- P0 (8/8 complete): CLAUDE.md, schemas, ESLint, dependency-cruiser, Vitest, git hooks, CI/CD, widget scaffolding
- P1 (8/9 complete): Ralph Loop, Plop generators, Playwright, bus test generator, Storybook, Supabase migrations, Vercel deployer, commitlint. Only Architecture MCP Query Server (#11) remains.
- P2 (0/8 complete): Visual regression, mutation testing, TypeDoc, Mermaid diagrams, Notion sync, ADR generator, release automation, ts-morph analyzer

### MCP Dev Server

Single server in `mcp-dev/` — provides tools for Event Bus, Canvas, Viewport, Widgets, Billing, and Commerce testing. Consumed by Claude Code via `.mcp.json`.

### Claude Code Skills (7 total)

- `scaffold-widget` — Generate widget boilerplate
- `code-review` — Structured code review
- `generate-tests` — Generate layer-appropriate test boilerplate
- `generate-bus-test` — Generate event bus integration tests
- `kill-mutants` — Read Stryker mutation report, generate tests for survivors
- `add-tsdoc` — Batch-add TSDoc to undocumented exports
- `create-adr` — Generate architecture decision records

---

## File Structure Quick Reference

```
StickerNest5.0/
├── .claude/              # Claude Code config
│   ├── agents.md         # Agent toolkit tracker
│   ├── commands/         # 6 slash commands
│   ├── rules/            # 11 layer rule files (L0-L6)
│   └── skills/           # 2 skills (scaffold-widget, code-review)
├── .ralph/               # Autonomous dev workflow
├── src/
│   ├── kernel/           # L0: Foundation (schemas, bus, stores, auth, billing, quota, datasource)
│   ├── social/           # L1: Realtime collaboration
│   ├── runtime/          # L3: Widget sandbox
│   ├── lab/              # L2: Widget IDE
│   ├── canvas/           # L4A: 2D canvas (core, tools, wiring, panels)
│   ├── spatial/          # L4B: 3D/VR
│   ├── marketplace/      # L5: Widget store
│   └── shell/            # L6: App shell
├── supabase/             # Database migrations + edge functions
├── mcp-dev/              # MCP dev server
├── e2e/                  # Playwright E2E tests
├── plop/                 # Scaffolding templates
├── forge-suite/          # Eval suite
├── docs/                 # Architecture docs + design plans
├── CLAUDE.md             # Master architecture guide
├── PLAN.md               # SaaS launch plan
├── TODO.md               # Master task backlog
└── v5 terminology.pdf    # Canonical terminology reference
```

---

## Project Configuration (Agent Infrastructure)

These settings govern how the agent pipeline operates:

- **GitHub repo**: `hkcm91/StickerNest5.0` — agents push branches, open PRs, and create issues here
- **QA target**: Localhost only (`npm run dev` on port 5173). No deployed preview URL yet.
- **Task management**: Both `TODO.md` (local) and Notion Master Build Plan are maintained in sync
- **Content platforms**: Twitter/X, TikTok, YouTube, Reddit
- **Brand voice**: Start simple and iterate. Derive initial tone from existing docs and content. Refine with feedback.
- **Demo audiences**: Users/creators, developers, and investors — each gets a tailored script
- **Agent scheduling**: Flexible and task-dependent. No fixed schedules. Agents run when their triggers are met.

---

## How to Work on This Project

1. **Read the layer rule file** before touching any layer. They're in `.claude/rules/L*.md`.
2. **Never import across layer boundaries** except downward. Use the event bus.
3. **Run tests** after every change: `npm test`
4. **Run lint** to catch boundary violations: `npm run lint`
5. **Use scaffolding** for new artifacts: `npm run scaffold:*`
6. **Use conventional commits** with layer scope: `feat(kernel): add DataSource CRUD API`
7. **Check the TODO.md** for current priorities and build phase context.
8. **Use @sn/types** for all shared type imports — never define types locally that exist in schemas.
