# StickerNest V5 Documentation

## Architecture

- [Architecture Overview](architecture.md) — Full system architecture, all layers, import rules, security model, entity types, and tech stack
- Per-layer architecture docs:
  - 📝 Planned: `architecture/L0-kernel.md`
  - 📝 Planned: `architecture/L1-social.md`
  - 📝 Planned: `architecture/L3-runtime.md`
  - 📝 Planned: `architecture/L2-lab.md`
  - 📝 Planned: `architecture/L4A-canvas.md`
  - 📝 Planned: `architecture/L4B-spatial.md`
  - 📝 Planned: `architecture/L5-marketplace.md`
  - 📝 Planned: `architecture/L6-shell.md`

## API Reference

- [Widget SDK](api/widget-sdk.md) — All 16 SDK methods available to widgets inside the iframe sandbox
- [Event Bus](api/event-bus.md) — Typed pub/sub IPC, emit/subscribe API, and complete event catalog
- [Zustand Stores](api/stores.md) — All 9 stores: state shapes, actions, selectors, and bus subscriptions
- [Bridge Protocol](api/bridge-protocol.md) — postMessage types between host and widget iframe
- [DataSource API](api/datasource.md) — CRUD operations, ACL enforcement, table operations, AI, Notion sync
- [Auth API](api/auth.md) — Login, logout, session refresh, OAuth providers, user tiers
- [Canvas Core API](api/canvas-core.md) — Viewport, scene graph, hit-testing, coordinates

## User Guides

- [Getting Started](guides/getting-started.md) — Project setup, structure, layer rules, development commands
- [Widget Creator Guide](guides/widget-creator.md) — SDK lifecycle, theming, state persistence, DataSource integration, publishing
- [Canvas User Guide](guides/canvas-user.md) — Tools, modes, entities, pipelines, sharing, collaboration
- [Widget Lab Guide](guides/widget-lab.md) — Editor, preview, AI generation, publish pipeline
- [Marketplace Guide](guides/marketplace.md) — Discovery, installation, publishing, reviews
- 📝 Planned: [Spatial / VR Guide](guides/spatial-vr.md) — WebXR, Three.js scene, VR controllers

## Design Plans

Design documents and implementation plans live in [plans/](plans/):

- [Widget Channel Assignment](plans/2026-02-22-widget-channel-assignment-design.md)
- [Canvas Interactions](plans/2026-02-24-canvas-interactions-design.md)
- [Widget Uninstall](plans/2026-03-02-widget-uninstall-design.md)
- [Lab Scene Graph](plans/2026-03-19-lab-scene-graph-design.md)
- [Lab Visual Overhaul](plans/2026-03-20-lab-visual-overhaul-design.md)
- [Lab Pipeline Builder](plans/2026-03-20-lab-pipeline-builder-redesign.md)
- [Multi-Model AI Generation](plans/2026-03-21-multi-model-ai-generation-design.md)
- [Cross-Canvas Multiplayer Games](plans/2026-03-22-cross-canvas-multiplayer-games-design.md)

## Audits

- [Documentation Audit — 2026-03-24](documentation-audit-2026-03-24.md) — Scored doc health report with remediation roadmap
- [Documentation Audit — 2026-03-23](documentation-audit-2026-03-23.md) — Notion-vs-codebase drift analysis
- [Feature Spec vs Codebase — 2026-03-23](feature-spec-vs-codebase-2026-03-23.md)
- [AI Vision Audit](ai-vision-audit.md)
- [TODO Audit — 2026-03-23](todo-audit-2026-03-23.md)

## Help Center (User-Facing)

- [Help Center Index](help-center/README.md) — All user-facing help articles
- [What Is StickerNest?](help-center/what-is-stickernest.md) — Platform overview for new users
- [Creating Your First Canvas](help-center/first-canvas.md) — Step-by-step first-run guide
- [Canvas Basics](help-center/canvas-basics.md) — Navigation, tools, modes, entities
- [Working with Widgets](help-center/widgets.md) — Install, configure, interact
- [Stickers and Assets](help-center/stickers-assets.md) — Visual assets for the canvas
- [Pipelines](help-center/pipelines.md) — Connecting widgets with visual event chains
- [Sharing and Permissions](help-center/sharing.md) — Roles, invites, publishing
- [Real-Time Collaboration](help-center/collaboration.md) — Cursors, presence, co-editing
- [Keyboard Shortcuts](help-center/keyboard-shortcuts.md) — Quick reference
- [Account and Billing](help-center/account-billing.md) — Plans, tiers, payment
- [FAQ](help-center/faq.md) — Common questions and troubleshooting

## Marketing Copy

- [Marketing Index](marketing/README.md)
- [Product Copy](marketing/product-copy.md) — Taglines, hero copy, value props, CTAs
- [Tier Comparison](marketing/tier-comparison.md) — Plan names, pricing copy, feature matrix
- [Feature Highlights](marketing/feature-highlights.md) — Detailed feature descriptions for landing pages

## In-App Content

Centralized user-facing content in `src/content/`:
- Onboarding walkthrough steps and welcome content (`onboarding.ts`)
- Tooltip text for all UI elements (`tooltips.ts`)
- Empty state messages for every panel and view (`empty-states.ts`)
- Error messages with recovery guidance (`errors.ts`)
- Tier-gating upgrade prompts (`upgrades.ts`)

## Other References

- [CLAUDE.md](../CLAUDE.md) — Agent instructions and project rules
- [Layer Rule Files](../.claude/rules/) — Per-layer architectural rules for development agents
- [Commerce Hardening Checklist](commerce-hardening-checklist.md)
- [UI Components Needed](UI_COMPONENTS_NEEDED.md)
