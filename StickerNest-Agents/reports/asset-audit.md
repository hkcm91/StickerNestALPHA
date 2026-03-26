# StickerNest V5 — Asset Audit Report

> Generated 2026-03-23. Covers local project files, GitHub repositories, and Notion databases.

---

## 1. Local Project: StickerNest5.0

### Source Code

| Metric | Value |
|--------|-------|
| Total TypeScript/TSX files | 788 |
| Test files (*.test.ts) | 167 |
| Source directories (src/) | 7 layers fully scaffolded |
| Build status | Compiles (Vite + TypeScript) |
| Deployment | Vercel (GitHub Pages for CI) |

**Layer implementation status:**

| Layer | Path | Status | Notes |
|-------|------|--------|-------|
| L0: Kernel | `src/kernel/` | **Built** | Stores, bus, schemas, auth, billing, quota, datasource, social-graph, world, systems — all populated |
| L1: Social | `src/social/` | **Built** | Channel, presence, cursor, entity-sync, conflict, edit-lock, offline, yjs-sync — 123 tests passing |
| L2: Lab | `src/lab/` | **Scaffolded + Partial** | Editor, preview, inspector, graph, AI, manifest, versions, publish, import directories exist; components/views populated; design-spec present |
| L3: Runtime | `src/runtime/` | **Built** | Bridge, SDK, cross-canvas, integrations, lifecycle, pool, security, widgets (kanban, todo-list, pathfinder, image-generator, stories) |
| L4A: Canvas | `src/canvas/` | **Built** | Core (viewport, scene, hittest, renderer, drag, grid, geometry, layout, persistence, interaction), tools (14 tool types), wiring (engine, graph, validator, persistence, cross-canvas-edge), panels (8 panel types) |
| L4B: Spatial | `src/spatial/` | **Scaffolded + Partial** | Components, controller, entities, entity-mapping, input, locomotion, mr, scene, session, xr-session, legacy |
| L5: Marketplace | `src/marketplace/` | **Scaffolded** | API, detail, install, listing, publisher, reviews directories exist |
| L6: Shell | `src/shell/` | **Built** | Router, layout, theme, shortcuts, error, pages, profile, canvas (apis/components/handlers/hooks/panels/renderers/utils), auth components, docker, data, dev |

### Architecture Documentation

| File | What It Is | Current? | Covers | Missing |
|------|-----------|----------|--------|---------|
| `CLAUDE.md` | Master architecture guide for Claude Code | **Yes** (Mar 23) | Layer map, import rules, naming, stores, testing, commands, kernel submodules | Nothing critical — comprehensive |
| `PLAN.md` | SaaS launch plan | **Yes** (Feb 26) | Billing, Stripe integration, subscriptions, commerce, quota, publishing | Some sections completed since writing |
| `TODO.md` | Master task backlog | **Yes** (Mar 19) | All 7 build phases, completed items, pending items by priority | Needs refresh — some completed items not yet checked off |
| `PRIVACY.md` | Privacy policy | Current | User data, cookies, analytics | — |
| `TERMS.md` | Terms of service | Current | Usage terms, liability | — |

### Layer Rule Files (`.claude/rules/`)

All 11 layer rule files exist and are comprehensive:

| File | Layer | Status |
|------|-------|--------|
| `L0-kernel.md` | Kernel | Complete — schemas, bus, stores, auth, datasource, testing reqs |
| `L1-social.md` | Social + Sync | Complete — realtime, presence, cursors, conflict resolution, offline |
| `L2-lab.md` | Widget Lab | Complete — editor, preview, inspector, graph, AI, publish pipeline |
| `L3-runtime.md` | Widget Runtime | Complete — WidgetFrame, bridge, SDK, theming, state, security |
| `L4A-1-canvas-core.md` | Canvas Core | Complete — viewport, scene graph, hit-test, render loop |
| `L4A-2-canvas-tools.md` | Canvas Tools | Complete — tool registry, select, move, resize, pen, sticker |
| `L4A-3-canvas-wiring.md` | Canvas Wiring | Complete — pipeline DAG, execution engine, validation |
| `L4A-4-canvas-panels.md` | Canvas Panels | Complete — toolbar, properties, layers, assets, context menu |
| `L4B-spatial.md` | Spatial/VR | Complete — Three.js, WebXR, controllers, SpatialContext |
| `L5-marketplace.md` | Marketplace | Complete — listing, install, uninstall, license, publisher |
| `L6-shell.md` | Shell | Complete — routing, auth gating, layout, theme, shortcuts |

### Existing Claude Code Skills & Commands

| Item | Path | Type | Status |
|------|------|------|--------|
| scaffold-widget | `.claude/skills/scaffold-widget/SKILL.md` | Skill | Working |
| code-review | `.claude/skills/code-review/SKILL.md` | Skill | Working |
| generate-tests | `.claude/commands/generate-tests.md` | Command | Working |
| generate-bus-test | `.claude/commands/generate-bus-test.md` | Command | Working |
| kill-mutants | `.claude/commands/kill-mutants.md` | Command | Working |
| add-tsdoc | `.claude/commands/add-tsdoc.md` | Command | Working |
| create-adr | `.claude/commands/create-adr.md` | Command | Working |
| ralph | `.claude/commands/ralph.md` | Command | Working |

### Ralph Loop (Autonomous Dev Workflow)

| Item | Path | Status |
|------|------|--------|
| README | `.ralph/README.md` | Complete — explains loop concept |
| Story template | `.ralph/STORY_TEMPLATE.md` | Complete |
| Current story | `.ralph/current-story.md` | Present |
| Archived stories | `.ralph/stories/` | 2 stories (L0 kernel, L1 social) |

### Planning Documents

| File | What It Is | Current? |
|------|-----------|----------|
| `stickernest-v5-kernel-plan.md` | L0 implementation plan | Yes (Feb 19) |
| `stickernest-v5-social-plan.md` | L1 implementation plan | Yes (Feb 20) |
| `stickernest-v5-runtime-plan.md` | L3 implementation plan (long) | Yes (Feb 19) |
| `stickernest-v5-l3-runtime-plan.md` | L3 implementation plan (refined) | Yes (Feb 20) |
| `stickernest-v5-lab-plan.md` | L2 implementation plan | Yes (Feb 20) |

### Design Documents (`docs/plans/`)

14 design documents covering recent work (Feb–Mar 2026):

- Widget channel assignment (2 docs)
- Canvas interactions design
- Widget uninstall design
- Lab scene graph design
- Lab 4-view mockup specs
- Lab creator mode UI overhaul
- Lab pipeline builder (2 docs: redesign + impl)
- Lab visual overhaul (2 docs: design + impl)
- Multi-model AI generation design
- Prompt refinement (2 docs: impl + popout design)
- Cross-canvas multiplayer games (2 docs: design + impl)

### Other Documentation (`docs/`)

| File | What It Is |
|------|-----------|
| `architecture.md` | Architecture overview |
| `UI_COMPONENTS_NEEDED.md` | UI component checklist |
| `ai-vision-audit.md` | AI vision feature audit |
| `commerce-hardening-checklist.md` | Commerce security checklist |
| `documentation-audit-2026-03-23.md` | Recent doc audit (today) |

### Reference PDFs

| File | What It Is | Pages |
|------|-----------|-------|
| `v5 terminology.pdf` | Canonical terminology definitions | 10+ pages — Canvas, DataSource, Sticker, Entity, Widget, Pipeline, Docker, Panel System |
| `v5 master build plan.pdf` | Master build plan | Multi-page — layer build order, milestones |
| `v5 agents.pdf` | Pre-build agent toolkit | 10 pages — 25 agents (P0/P1/P2), dependency graph, Claude Code skills |

### Build & Infra

| Item | Status |
|------|--------|
| `package.json` | Present — scripts for dev, build, test, lint, scaffold, db |
| `vite.config.ts` | Configured with path aliases, dedupe |
| `vitest.config.ts` | Configured with environment globs, coverage thresholds |
| `playwright.config.ts` | Configured with swiftshader |
| `.eslintrc.cjs` | Layer boundary enforcement via eslint-plugin-boundaries |
| `.dependency-cruiser.cjs` | Layer import validation rules |
| `commitlint.config.cjs` | Scope enforcement (layer-based) |
| `.husky/` | Pre-commit (lint-staged) + commit-msg hooks |
| `.github/` | CI/CD workflows |
| `supabase/` | Local Supabase with migrations |
| `mcp-dev/` | StickerNest Dev MCP server (separate package) |
| `forge-suite/` | Eval suite (acid-test-evals, mirror-evals) |
| `.storybook/` | Storybook configuration |
| `plop/` | Scaffolding templates |
| `.env.example` | Environment variable template |
| `.env.local` | Local environment (present, not committed) |

### MCP Dev Server

Single MCP server configured in `.mcp.json`: `stickernest-dev` — covers Event Bus, Canvas, Viewport, Widgets, Billing, Commerce testing. Located in `mcp-dev/` with its own `tsconfig.json` and package.json.

---

## 2. GitHub Repositories

| Repo | Description | Last Activity | Issues |
|------|------------|---------------|--------|
| `sticker-slide-dash` | Slide presentation widget | Mar 21, 2026 | 0 |
| `StickerNestV4` | V4 codebase (predecessor) | Mar 20, 2026 | 10 open (dependency updates, refactoring, Stripe checkout) |
| `StickerDash` | Dashboard interface | Unknown (API 409) | 0 |

**Note:** StickerNest5.0 has its own GitHub repo at `hkcm91/StickerNest5.0`. It also exists on Devin (per the project link: `app.devin.ai/org/woahitskimber-gmail-com/wiki/hkcm91/StickerNest5.0`).

---

## 3. Notion Databases

Notion search returned 14+ pages and databases related to StickerNest. Specific databases identified:

- Master Build Plan
- Build Journal
- TypeScript Interface Contracts
- Terminology definitions
- Layer-specific architecture pages
- Development resources and references

**Status:** Notion content exists but sync with local docs is manual. The Notion Doc Sync Pipeline (Agent #22 in the agent toolkit PDF) is listed as "not started."

---

## 4. V4 Codebase (StickerNestV4-1 folder)

The V4 folder is also mounted locally. It represents the previous major version and contains the original implementation that V5 is replacing. Key differences from V5:

- No layered architecture (flat structure)
- Different store organization
- No enforced import boundaries
- Different widget system
- Active GitHub repo with 10 open issues

V4 serves as reference for feature parity checks but is not being actively developed.

---

## 5. Existing Agent Infrastructure (from `.claude/agents.md`)

The project already has a pre-build agent toolkit tracking 25 agents in three priority tiers:

- **P0 (Blocking):** 8/8 complete — CLAUDE.md, Zod schemas, ESLint boundaries, dependency-cruiser, Vitest, git hooks, CI/CD, widget scaffolding
- **P1 (First Sprint):** 8/9 complete — Ralph Loop, Plop generators, Playwright E2E, bus test generator, Storybook, Supabase migrations, Vercel deployer, commitlint. **Only Agent #11 (Architecture MCP Query Server) remains.**
- **P2 (First Month):** 0/8 complete — Visual regression, mutation testing, TypeDoc, Mermaid diagrams, Notion sync, ADR generator, release automation, ts-morph analyzer

---

## Summary

StickerNest V5 has an exceptionally well-documented architecture with comprehensive rule files, planning documents, and terminology definitions. The codebase is substantial (788 source files, 167 tests) with real implementation across all 7 layers. The existing Claude Code skills and Ralph Loop provide a working autonomous development workflow. The main gaps are in the Cowork-level agent infrastructure (the new layer being bootstrapped in this project), Notion sync, and some P2 tooling agents.
