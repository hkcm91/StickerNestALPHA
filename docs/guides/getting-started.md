# Getting Started with StickerNest V5

This guide walks you through setting up the StickerNest V5 development environment, understanding the project structure, and making your first contribution.

## Prerequisites

You'll need Node.js (v18+), npm, and Git. For local database development, Docker is required for Supabase.

## Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/hkcm91/StickerNest5.0.git
cd StickerNest5.0
npm install
```

Start the development server:

```bash
npm run dev
```

This launches Vite on port 5173. The app is available at `http://localhost:5173`.

For local database development:

```bash
npm run db:start    # Start local Supabase (requires Docker)
npm run db:reset    # Reset database to clean state
```

## Project Structure

StickerNest V5 is organized into seven layers with strict import boundaries. Each layer can only import from layers below it in the build order.

```
src/
├── kernel/          # L0: Foundation — schemas, bus, stores, auth, DataSource
│   ├── schemas/     #     Zod schemas and TypeScript types (@sn/types)
│   ├── bus/         #     Event Bus — typed pub/sub IPC
│   ├── stores/      #     9 Zustand stores (one per domain)
│   ├── auth/        #     Authentication (email/password + OAuth)
│   ├── datasource/  #     DataSource CRUD + ACL
│   └── supabase/    #     Supabase client (singleton)
├── social/          # L1: Real-time collaboration — presence, cursors, sync
├── runtime/         # L3: Widget Runtime — iframe sandbox, bridge, SDK
│   ├── bridge/      #     postMessage protocol (host ↔ widget)
│   ├── sdk/         #     Widget SDK injected into iframes
│   └── widgets/     #     Built-in widgets (Sticky Note, Clock, etc.)
├── lab/             # L2: Widget Lab — in-browser IDE for widget creation
├── canvas/          # L4A: 2D Canvas
│   ├── core/        #     L4A-1: Viewport, scene graph, hit-testing
│   ├── tools/       #     L4A-2: Select, move, resize, pen, shapes
│   ├── wiring/      #     L4A-3: Pipeline graph editor
│   └── panels/      #     L4A-4: Toolbar, properties, layers, assets
├── spatial/         # L4B: 3D/VR — Three.js, WebXR, spatial entities
├── marketplace/     # L5: Widget marketplace — discovery, install, publish
└── shell/           # L6: App shell — routing, auth gates, theme, layout
```

## Key Concepts

**Canvas** is the infinite 2D/3D workspace — think of it as the desktop. **Entities** are objects placed on the canvas (stickers, widgets, text, shapes). **Widgets** are interactive programs that run in sandboxed iframes. **Stickers** are visual assets (images/GIFs) that can trigger logic but never contain it. **Pipelines** are visual event chains that connect widget outputs to inputs. The **Event Bus** is the typed pub/sub system that all inter-layer communication flows through.

For the full terminology reference, see the [CLAUDE.md](../../CLAUDE.md) naming section.

## Layer Import Rules

This is the most important architectural constraint. Each layer may only import from layers below it:

| Layer | May Import From |
|-------|-----------------|
| L0: Kernel | *(nothing — foundation)* |
| L1: Social | L0 |
| L3: Runtime | L0 |
| L2: Lab | L0, L1, L3 |
| L4A: Canvas | L0, L3 (core only for sub-layers) |
| L4B: Spatial | L0, L3 |
| L5: Marketplace | L0, L1, L3, L4A-1 |
| L6: Shell | L0, L1, L3, L4A-1, L4B, L5 |

Cross-layer communication always goes through the **Event Bus** or `@sn/types` — never direct imports. These rules are enforced by `dependency-cruiser` and `eslint-plugin-boundaries`.

## Development Commands

```bash
# Build & Run
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build
npm run typecheck        # TypeScript check (no emit)
npm run lint             # ESLint with layer boundary enforcement
npm run lint:fix         # ESLint autofix

# Testing
npm test                 # Run all unit tests (Vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (80% threshold)
npm run e2e              # Playwright E2E tests

# Architecture
npm run deps:validate    # Check layer boundary violations

# Scaffolding
npm run scaffold:widget  # New widget boilerplate
npm run scaffold:module  # New module boilerplate
npm run scaffold:schema  # New schema boilerplate
npm run scaffold:event   # New event boilerplate
npm run scaffold:store   # New store boilerplate
```

## Making Your First Change

### 1. Find the right layer

Before writing code, identify which layer your change belongs to. Read the relevant rule file in `.claude/rules/` — for example, `.claude/rules/L0-kernel.md` for kernel changes.

### 2. Write tests first

Every module needs a co-located `*.test.ts` file. The project enforces 80% coverage thresholds. Run tests for a specific area:

```bash
npx vitest run src/kernel/bus    # Test just the event bus
```

### 3. Follow commit conventions

Commits use the format `<type>(<scope>): <description>` where scope matches the layer:

```
feat(kernel): add DataSource CRUD API
fix(runtime): handle widget crash in error boundary
test(social): add cursor broadcast throttle test
```

Valid scopes: `kernel`, `social`, `runtime`, `lab`, `canvas-core`, `canvas-tools`, `canvas-wiring`, `canvas-panels`, `spatial`, `marketplace`, `shell`, `deps`, `config`, `ci`.

### 4. Validate architecture

Before committing, check that your imports don't violate layer boundaries:

```bash
npm run deps:validate
npm run lint
```

## Nine Stores

StickerNest uses nine Zustand stores, each owning a single domain. Stores never import from each other — coordination flows through the Event Bus.

`authStore` (user/session), `workspaceStore` (workspace metadata), `canvasStore` (active canvas), `historyStore` (undo/redo), `widgetStore` (widget registry + instances), `socialStore` (presence/cursors), `uiStore` (UI flags/modes/theme), `dockerStore` (dockable panels), `galleryStore` (user assets).

See the [Stores API Reference](../api/stores.md) for full details.

## Next Steps

Once you're oriented, dive deeper with these resources:

- [Widget SDK Reference](../api/widget-sdk.md) — Build widgets with the 16+ SDK methods
- [Event Bus Reference](../api/event-bus.md) — Understand the pub/sub IPC with 130+ event types
- [Bridge Protocol Reference](../api/bridge-protocol.md) — Host ↔ widget iframe communication
- [DataSource API Reference](../api/datasource.md) — Persistent data with ACL enforcement
- [Widget Creator Guide](widget-creator.md) — End-to-end guide to creating and publishing a widget
- [Layer Rule Files](../../.claude/rules/) — Detailed rules for each layer
