# StickerNest V5

An infinite-canvas spatial operating system for the browser. Widgets, stickers, and event-driven pipelines compose into interactive spaces. Run in 2D (canvas), 3D (Three.js), or VR (WebXR).

## Features

- **Infinite Canvas** — Pan, zoom, and organize unlimited entities on a 2D plane with full real-time collaboration
- **Widget Marketplace** — Discover, install, and publish interactive widgets with ratings and version control
- **Widget Lab** — In-app IDE: write, test, debug, and publish widgets without leaving the platform
- **Real-Time Collaboration** — Multi-user presence, cursor tracking, conflict resolution, and edit locks
- **3D & VR Environments** — Spatial rendering with Three.js and WebXR support running alongside 2D canvas
- **Event-Driven Architecture** — Typed pub/sub IPC with pipeline graph editor for cross-widget event routing

## Quick Start

```bash
# Install dependencies
npm install

# Start local Supabase and Vite dev server
npm run db:start
npm run dev
```

Browse to `http://localhost:5173/StickerNest5.0/` (or `/` locally).

## Tech Stack

- **Frontend**: React 18, TypeScript, Zod, Zustand
- **Canvas**: Custom infinite canvas with hit-testing and spatial indexing
- **3D/VR**: Three.js, @react-three/fiber, WebXR
- **Real-Time**: Supabase Realtime, Yjs for CRDTs
- **Testing**: Vitest (unit), Playwright (E2E)
- **Dev Server**: Vite

## Architecture Overview

StickerNest V5 is organized into **7 strictly-layered architectural levels** with unidirectional dependencies:

```
Layer 0: Kernel (types, bus, stores, auth, Supabase)
  ↓
Layer 1: Social (real-time sync, presence, conflict resolution)
  ↓
Layer 3: Runtime (widget iframe sandbox, Widget SDK)
  ↓
Layer 2: Lab (in-app IDE for widget creation)
  ↓
Layer 4A: Canvas Core (viewport, scene graph, hit-testing)
  ├─ 4A-1: Core (entity scene, z-order, rendering)
  ├─ 4A-2: Tools (select, move, resize, pen, sticker tools)
  ├─ 4A-3: Wiring (pipeline graph editor & execution)
  └─ 4A-4: Panels (properties, layers, asset, context menus)
  ↓
Layer 4B: Spatial (3D/VR rendering, WebXR, controller input)
  ↓
Layer 5: Marketplace (widget discovery, installation, publishing)
  ↓
Layer 6: Shell (routing, auth gating, layout, theming, keyboard shortcuts)
```

**Why this structure?**
Each layer is independently testable before the next begins. Cross-layer communication flows through the **event bus** (`src/kernel/bus/`) — never direct imports across boundaries. This prevents circular dependencies and makes the system composable.

For detailed architecture rules, see [CLAUDE.md](./CLAUDE.md) and [.claude/rules/](./.claude/rules/).

## Development Commands

### Build & Run
```bash
npm run dev              # Vite dev server (port 5173)
npm run build           # Production build
npm run typecheck       # tsc --noEmit
npm run lint            # ESLint + boundary rules
npm run lint:fix        # Autofix
```

### Testing
```bash
npm test                # All unit tests (Vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # v8 coverage (80% threshold)
npm run e2e            # Playwright E2E tests (headless)
npm run e2e:headed     # Playwright with browser visible
```

### Database (Supabase)
```bash
npm run db:start       # Start local Supabase
npm run db:stop        # Stop local Supabase
npm run db:reset       # Reset database
npm run db:migrate     # Create new migration
```

### Scaffolding
```bash
npm run scaffold:widget   # New widget boilerplate
npm run scaffold:module   # New module boilerplate
npm run scaffold:schema   # New schema boilerplate
npm run scaffold:event    # New event boilerplate
npm run scaffold:store    # New store boilerplate
```

## Commit Convention

```
<type>(<scope>): <description>
```

**Types**: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `config`, `ci`, `deps`

**Scopes** (one per layer):
- `kernel` — Layer 0
- `social` — Layer 1
- `runtime` — Layer 3
- `lab` — Layer 2
- `canvas-core`, `canvas-tools`, `canvas-wiring`, `canvas-panels` — Layer 4A
- `spatial` — Layer 4B
- `marketplace` — Layer 5
- `shell` — Layer 6

**Example**:
```
feat(marketplace): add widget ratings and reviews
fix(canvas-core): correct z-order on entity drag
test(runtime): add Widget SDK cross-canvas messaging tests
```

## Documentation

- [Full Documentation Index](./docs/README.md) — Architecture, API references, user guides, and design plans
- [Architecture Deep Dive](./docs/architecture.md)
- [API Reference: Widget SDK](./docs/api/widget-sdk.md) | [Event Bus](./docs/api/event-bus.md) | [Stores](./docs/api/stores.md)
- [Project Guidelines](./CLAUDE.md)
- [Layer Rules](./.claude/rules/)

## License

[License details to be added]
