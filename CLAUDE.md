# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# StickerNest V5

## WHAT
StickerNest V5 is a spatial operating system: an infinite-canvas platform where
widgets, entities, and event-driven pipelines compose into interactive spaces.
Runs in browser (2D canvas), spatial/3D (Three.js), and VR (WebXR / Quest 3).

The canvas is the desktop. Stickers are icons. Widgets are apps.
The event bus is IPC. The marketplace is the app store.

## WHY
Every architectural decision enforces separation between three conceptual layers:
- **Layer A — Spatial**: canvas, entities, rendering, z-order, input routing
- **Layer B — Data**: DataSources — persistent records independent of widgets
- **Layer C — Interaction**: widgets, scripts, pipelines, event bus

Crossing these boundaries is the #1 source of V4 technical debt. V5 prevents it
structurally via ESLint rules, dependency-cruiser, and this file.

## HOW

### Build Order
```
Layer 0 (Kernel) → Layer 1 (Social) → Layer 3 (Runtime) → Layer 2 (Lab)
  → Layer 4A/4B (Canvas) → Layer 5 (Marketplace) → Layer 6 (Shell)
```
Each layer must be independently testable before the next begins. Never skip ahead.

### Directory → Layer Map

| Path | Layer | May only import from |
|---|---|---|
| `src/kernel/**` | L0: Kernel | *(nothing)* |
| `src/social/**` | L1: Social | L0 |
| `src/runtime/**` | L3: Runtime | L0 |
| `src/lab/**` | L2: Lab | L0, L1, L3 |
| `src/canvas/core/**` | L4A-1: Canvas Core | L0, L3 |
| `src/canvas/tools/**` | L4A-2: Canvas Tools | L0, L3, L4A-1 |
| `src/canvas/wiring/**` | L4A-3: Canvas Wiring | L0, L3, L4A-1 |
| `src/canvas/panels/**` | L4A-4: Canvas Panels | L0, L3, L4A-1 |
| `src/spatial/**` | L4B: Spatial/VR | L0, L3 |
| `src/marketplace/**` | L5: Marketplace | L0, L1, L3, L4A-1 |
| `src/shell/**` | L6: Shell | L0, L1, L3, L4A-1, L4B, L5 |

### Import Rules
- Import only from layers **below** yours in the build order
- Cross-layer communication goes through the **event bus** or `@sn/types` — never direct internal imports across layer boundaries
- No circular imports anywhere — enforced by `dependency-cruiser` and `eslint-plugin-boundaries`
- Shared types live in `src/kernel/schemas/` — never redefine locally

### Naming (source of truth: `v5 terminology.pdf`)
- **Canvas** — the infinite 2D/3D workspace (never "board", "scene", "stage")
- **Entity** — any object with a canvas position (`StickerEntity`, `TextEntity`, `WidgetContainerEntity`, etc.)
- **DataSource** — persistent data record: `doc | table | note | folder | file | custom`
- **Widget** — an interactive program in a sandboxed iframe or trusted inline component
- **Sticker** — a visual asset (image/GIF/video) that triggers logic; never contains logic
- **Pipeline** — a visual event chain connecting widget outputs to widget inputs
- **Event Bus** — the typed pub/sub IPC layer; all inter-widget communication goes here
- **Script** — headless JS automation on the event bus (no UI)
- **Docker** — a container widget that hosts child widgets

### Stores
Seven Zustand stores — one domain each: `authStore`, `workspaceStore`, `canvasStore`,
`historyStore`, `widgetStore`, `socialStore`, `uiStore`.
Stores **do not** reach into each other's state. Use the event bus or explicit selectors.

### Canvas Interaction Modes
- **Edit mode** — full entity manipulation, pipeline graph, config panels (Owner/Editor role)
- **Preview mode** — widgets fully interactive, layout locked (slug URL, embed, fullscreen toggle, Viewer/Commenter role)
- Stored in `uiStore.canvasInteractionMode: 'edit' | 'preview'`
- Mode is never persisted — always derived from role + URL context on load

### Schemas & Types
All shared types: `src/kernel/schemas/` — export from `index.ts`.
Use Zod v4+ for all validation. JSON schemas via `z.toJSONSchema()` for widget manifests.
`@sn/types` is the internal package alias — all agents import from here.

### Testing
- **Unit**: Vitest — 80% threshold (branches, functions, lines, statements)
- **E2E**: Playwright with `--use-gl=swiftshader` (deterministic, GPU-free CI)
- Every module needs a co-located `*.test.ts` file
- Performance: `bench()` API for event bus throughput (L0)

### Commit Format
`<type>(<scope>): <description>`
Scopes match layers: `kernel`, `social`, `runtime`, `lab`, `canvas-core`,
`canvas-tools`, `canvas-wiring`, `canvas-panels`, `spatial`, `marketplace`, `shell`
Example: `feat(kernel): add DataSource CRUD API`

### Layer Rule Files
Read the relevant file before working in any layer:
`.claude/rules/L0-kernel.md` · `L1-social.md` · `L2-lab.md` · `L3-runtime.md`
`L4A-1-canvas-core.md` · `L4A-2-canvas-tools.md` · `L4A-3-canvas-wiring.md` · `L4A-4-canvas-panels.md`
`L4B-spatial.md` · `L5-marketplace.md` · `L6-shell.md`

## Development Commands

### Build & Run
```
npm run dev          # Vite dev server on port 5173
npm run build        # tsc + vite build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint with layer boundary enforcement
npm run lint:fix     # ESLint autofix
```

### Testing
```
npm test                              # vitest run (all unit tests)
npm run test:watch                    # vitest in watch mode
npx vitest run src/kernel/bus         # run tests for a specific directory
npx vitest run path/to/file.test.ts   # run a single test file
npm run test:coverage                 # v8 coverage (80% threshold enforced)
npm run e2e                           # Playwright E2E tests
npm run e2e:headed                    # Playwright with browser visible
```

Test environment: `node` by default; `happy-dom` for runtime, shell, spatial, and social layer tests (configured in `vitest.config.ts` via `environmentMatchGlobs`).

### Architecture Validation
```
npm run deps:validate    # dependency-cruiser checks layer boundary violations
```
ESLint `boundaries/element-types` rule also enforces the layer import map at lint time.

### Database (Supabase Local)
```
npm run db:start     # start local Supabase
npm run db:stop      # stop local Supabase
npm run db:reset     # reset database
npm run db:migrate   # create new migration
```

### Scaffolding (Plop Generators)
```
npm run scaffold:widget   # new widget boilerplate
npm run scaffold:module   # new module boilerplate
npm run scaffold:schema   # new schema boilerplate
npm run scaffold:event    # new event boilerplate
npm run scaffold:store    # new store boilerplate
```

## Key Technical Details

- **Path alias**: `@sn/types` resolves to `src/kernel/schemas/index.ts` (configured in `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`)
- **Commitlint**: enforced via husky pre-commit hook; scope is **required** and must be one of: `kernel`, `social`, `runtime`, `lab`, `canvas-core`, `canvas-tools`, `canvas-wiring`, `canvas-panels`, `spatial`, `marketplace`, `shell`, `deps`, `config`, `ci`
- **MCP dev server**: lives in `mcp-dev/` (separate package with its own `package.json`)
- **Storybook**: `npm run storybook` on port 6006
